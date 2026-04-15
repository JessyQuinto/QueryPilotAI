using Core.Application.Contracts;
using Functions.Api.Auth;
using Infrastructure.Sql;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.DurableTask.Client;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace Functions.Api.Functions;

public class QueryIntakeFunction(IAppDatabaseService appDb, ILogger<QueryIntakeFunction> logger)
{
    [Function(nameof(QueryIntakeFunction))]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "query")] HttpRequestData req,
        [DurableClient] DurableTaskClient durableClient,
        FunctionContext executionContext)
    {
        try
        {
            var request = await JsonSerializer.DeserializeAsync<QueryRequest>(req.Body, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            var authenticatedUserId = AuthContextHelpers.GetAuthenticatedUserId(req.FunctionContext);
            var userAliases = AuthContextHelpers.GetAuthenticatedUserAliases(req.FunctionContext);
            if (string.IsNullOrEmpty(authenticatedUserId) || userAliases.Count == 0)
            {
                return req.CreateResponse(HttpStatusCode.Unauthorized);
            }

            if (request is null || string.IsNullOrWhiteSpace(request.Question))
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteStringAsync("Invalid request payload.");
                return bad;
            }

            request = request with { UserId = authenticatedUserId };

            if (request.ConnectionId.HasValue && (request.Connection is null || string.IsNullOrWhiteSpace(request.Connection.Password)))
            {
                var savedConnection = await appDb.GetConnectionForUsersAsync(request.ConnectionId.Value, userAliases);
                if (savedConnection is null)
                {
                    var missingConnection = req.CreateResponse(HttpStatusCode.BadRequest);
                    await missingConnection.WriteAsJsonAsync(new { error = "The selected connection is not available for the authenticated user." });
                    return missingConnection;
                }

                request = request with
                {
                    Connection = new DatabaseConfig(
                        savedConnection.DbType,
                        savedConnection.Host,
                        savedConnection.Port ?? string.Empty,
                        savedConnection.DatabaseName,
                        savedConnection.Username ?? string.Empty,
                        savedConnection.EncryptedPassword ?? string.Empty,
                        savedConnection.AuthType)
                };
            }

            var instanceId = await durableClient.ScheduleNewOrchestrationInstanceAsync(
                nameof(FraudInsightOrchestrator),
                request);

            var response = req.CreateResponse(HttpStatusCode.Accepted);
            var statusUrl = $"{req.Url.Scheme}://{req.Url.Authority}/api/orchestrations/{instanceId}";
            await response.WriteAsJsonAsync(new
            {
                instanceId,
                statusQueryGetUri = statusUrl
            });

            return response;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Query intake failed before orchestration scheduling.");
            var error = req.CreateResponse(HttpStatusCode.InternalServerError);
            await error.WriteAsJsonAsync(new { error = "Failed to process query request." });
            return error;
        }
    }
}

public class OrchestrationStatusFunction
{
    [Function(nameof(OrchestrationStatusFunction))]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "orchestrations/{instanceId}")] HttpRequestData req,
        string instanceId,
        [DurableClient] DurableTaskClient durableClient)
    {
        var metadata = await durableClient.GetInstanceAsync(instanceId, getInputsAndOutputs: true);
        if (metadata is null)
        {
            var notFound = req.CreateResponse(HttpStatusCode.NotFound);
            await notFound.WriteAsJsonAsync(new
            {
                instanceId,
                status = "NotFound"
            });

            return notFound;
        }

        var userAliases = AuthContextHelpers.GetAuthenticatedUserAliases(req.FunctionContext);
        if (userAliases.Count == 0 || !OrchestrationOwnershipHelpers.BelongsToUser(metadata, userAliases))
        {
            var forbidden = req.CreateResponse(HttpStatusCode.NotFound);
            await forbidden.WriteAsJsonAsync(new { error = "Orchestration not found.", instanceId });
            return forbidden;
        }

        var ok = req.CreateResponse(HttpStatusCode.OK);
        var outputRaw = metadata.SerializedOutput;
        InsightResponse? output = null;
        if (!string.IsNullOrWhiteSpace(outputRaw))
        {
            try
            {
                output = JsonSerializer.Deserialize<InsightResponse>(outputRaw,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch
            {
                // Keep output as null and expose outputRaw for troubleshooting.
            }
        }

        // Parse custom status for pipeline steps
        object? customStatus = null;
        if (!string.IsNullOrWhiteSpace(metadata.SerializedCustomStatus))
        {
            try
            {
                customStatus = JsonSerializer.Deserialize<object>(metadata.SerializedCustomStatus);
            }
            catch
            {
                customStatus = metadata.SerializedCustomStatus;
            }
        }

        await ok.WriteAsJsonAsync(new
        {
            instanceId = metadata.InstanceId,
            runtimeStatus = metadata.RuntimeStatus.ToString(),
            createdAt = metadata.CreatedAt,
            lastUpdatedAt = metadata.LastUpdatedAt,
            customStatus,
            output,
            outputRaw
        });

        return ok;
    }
}

public class ApprovalFunction
{
    [Function(nameof(ApprovalFunction))]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "orchestrations/{instanceId}/approve")] HttpRequestData req,
        string instanceId,
        [DurableClient] DurableTaskClient durableClient)
    {
        var decision = await JsonSerializer.DeserializeAsync<ApprovalDecision>(req.Body, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (decision is null || string.IsNullOrWhiteSpace(decision.Decision))
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteStringAsync("Invalid approval payload. Required: decision, approverUserId.");
            return bad;
        }

        var authenticatedUserId = AuthContextHelpers.GetAuthenticatedUserId(req.FunctionContext);
        if (string.IsNullOrWhiteSpace(authenticatedUserId))
        {
            return req.CreateResponse(HttpStatusCode.Unauthorized);
        }

        decision = decision with { ApproverUserId = authenticatedUserId };

        var metadata = await durableClient.GetInstanceAsync(instanceId, getInputsAndOutputs: true);
        if (metadata is null)
        {
            var notFound = req.CreateResponse(HttpStatusCode.NotFound);
            await notFound.WriteAsJsonAsync(new { error = "Orchestration not found.", instanceId });
            return notFound;
        }

        var userAliases = AuthContextHelpers.GetAuthenticatedUserAliases(req.FunctionContext);
        if (userAliases.Count == 0 || !OrchestrationOwnershipHelpers.BelongsToUser(metadata, userAliases))
        {
            var forbidden = req.CreateResponse(HttpStatusCode.NotFound);
            await forbidden.WriteAsJsonAsync(new { error = "Orchestration not found.", instanceId });
            return forbidden;
        }

        await durableClient.RaiseEventAsync(instanceId, "ApprovalEvent", decision);

        var ok = req.CreateResponse(HttpStatusCode.OK);
        await ok.WriteAsJsonAsync(new
        {
            instanceId,
            decision = decision.Decision,
            approver = decision.ApproverUserId,
            message = $"Approval event sent to orchestration {instanceId}."
        });

        return ok;
    }
}

public class AuditHistoryFunction(Infrastructure.Sql.ISqlExecutionService sqlExecutionService)
{
    [Function(nameof(AuditHistoryFunction))]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "history")] HttpRequestData req)
    {
        var authenticatedUserId = AuthContextHelpers.GetAuthenticatedUserId(req.FunctionContext);
        if (string.IsNullOrWhiteSpace(authenticatedUserId))
        {
            return req.CreateResponse(HttpStatusCode.Unauthorized);
        }

        var audits = await sqlExecutionService.GetRecentAuditsByUserAsync(authenticatedUserId, 50);
        var ok = req.CreateResponse(HttpStatusCode.OK);
        await ok.WriteAsJsonAsync(audits);
        return ok;
    }
}

internal static class OrchestrationOwnershipHelpers
{
    internal static bool BelongsToUser(Microsoft.DurableTask.Client.OrchestrationMetadata metadata, IReadOnlyCollection<string> userIds)
    {
        if (string.IsNullOrWhiteSpace(metadata.SerializedInput) || userIds.Count == 0)
        {
            return false;
        }

        try
        {
            var request = JsonSerializer.Deserialize<QueryRequest>(metadata.SerializedInput);
            return userIds.Any(userId => string.Equals(userId, request?.UserId, StringComparison.OrdinalIgnoreCase));
        }
        catch
        {
            return false;
        }
    }
}
