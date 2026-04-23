using Core.Application.Contracts;
using Core.Domain.Policies;
using Infrastructure.AzureOpenAI;
using Infrastructure.Sql;
using Microsoft.Azure.Functions.Worker;
using System.Text.Json;

namespace Functions.Api.Functions;

// --- Foundry Agent Activities (replaces old hardcoded services) ---

public class ClassifyWithConciergeActivity(IFoundryAgentClient agentClient)
{
    [Function(nameof(ClassifyWithConciergeActivity))]
    public Task<ConversationalClassification?> Run([ActivityTrigger] ConciergeInput input) =>
        agentClient.ClassifyMessageAsync(input.UserId, input.Message, input.ConversationContext);
}

public class ExtractSchemaActivity(ISchemaExtractorService schemaExtractor)
{
    [Function(nameof(ExtractSchemaActivity))]
    public async Task<string> Run([ActivityTrigger] DatabaseConfig connection)
    {
        var config = new DatabaseConfig(
            connection.Type, connection.Host, connection.Port ?? "",
            connection.Database, connection.Username ?? "", connection.Password ?? "", connection.AuthType);
        try 
        {
            return await schemaExtractor.ExtractSchemaAsync(config);
        }
        catch (Exception ex)
        {
            throw new Exception($"SQL ERROR: {ex.Message} | Inner: {ex.InnerException?.Message}");
        }
    }
}

public class PlanSqlActivity(IFoundryAgentClient agentClient)
{
    [Function(nameof(PlanSqlActivity))]
    public Task<SqlPlannerResponse> Run([ActivityTrigger] SqlPlannerInput input) =>
        agentClient.PlanSqlAsync(input.Question, input.DbSchema, input.ConversationContext);
}

public class InterpretResultsActivity(IFoundryAgentClient agentClient)
{
    [Function(nameof(InterpretResultsActivity))]
    public Task<ResultInterpretation> Run([ActivityTrigger] ResultInterpreterInput input) =>
        agentClient.InterpretResultsAsync(
            input.Question, input.IntentJson, input.Sql, input.Rows, input.GovernanceJson);
}

// --- Preserved Activities ---

public class AnalyzePromptSafetyActivity(Infrastructure.Security.IPromptSafetyService safetyService)
{
    [Function(nameof(AnalyzePromptSafetyActivity))]
    public Task<PromptSafetyResult> Run([ActivityTrigger] QueryRequest request) =>
        safetyService.AnalyzeAsync(request.Question, request.Role);
}

public class ValidateSqlPolicyActivity(ISqlPolicyEngine sqlPolicyEngine)
{
    [Function(nameof(ValidateSqlPolicyActivity))]
    public Task<SqlValidationResult> Run([ActivityTrigger] string sql) =>
        Task.FromResult(sqlPolicyEngine.Validate(sql));
}

public class ExecuteSqlActivity(ISqlExecutionService sqlExecutionService)
{
    [Function(nameof(ExecuteSqlActivity))]
    public Task<List<Dictionary<string, object?>>> Run([ActivityTrigger] SqlExecutionInput input) =>
        sqlExecutionService.ExecuteQueryAsync(input.Sql, input.Config);
}

public class SaveAuditTrailActivity(ISqlExecutionService sqlExecutionService)
{
    [Function(nameof(SaveAuditTrailActivity))]
    public async Task Run([ActivityTrigger] AuditTrailRecord audit)
    {
        await sqlExecutionService.SaveAuditAsync(audit);
    }
}

public class GetSchemaFromCacheActivity(IAppDatabaseService appDb)
{
    [Function(nameof(GetSchemaFromCacheActivity))]
    public async Task<string?> Run([ActivityTrigger] Guid connectionId)
    {
        var connection = await appDb.GetConnectionAsync(connectionId);
        return connection?.SchemaCache;
    }
}

public class SaveSchemaCacheActivity(IAppDatabaseService appDb)
{
    [Function(nameof(SaveSchemaCacheActivity))]
    public Task Run([ActivityTrigger] SchemaCacheInput input) =>
        appDb.UpdateSchemaCacheAsync(input.ConnectionId, input.SchemaJson);
}

public class SaveConversationTurnActivity(IAppDatabaseService appDb)
{
    [Function(nameof(SaveConversationTurnActivity))]
    public Task Run([ActivityTrigger] ConversationTurnRecord turn) =>
        appDb.AddTurnAsync(turn);
}

public class GetRecentTurnsActivity(IAppDatabaseService appDb)
{
    [Function(nameof(GetRecentTurnsActivity))]
    public Task<List<ConversationTurnRecord>> Run([ActivityTrigger] RecentTurnsInput input) =>
        appDb.GetRecentTurnsAsync(input.SessionId, input.MaxTurns);
}

// --- Input DTOs for Activities ---

public sealed record SqlPlannerInput(string Question, string DbSchema, string? ConversationContext);
public sealed record ResultInterpreterInput(string Question, string IntentJson, string Sql, List<Dictionary<string, object?>> Rows, string? GovernanceJson);
public sealed record SchemaCacheInput(Guid ConnectionId, string SchemaJson);
public sealed record RecentTurnsInput(Guid SessionId, int MaxTurns = 10);
public sealed record ConciergeInput(string UserId, string Message, string? ConversationContext);
