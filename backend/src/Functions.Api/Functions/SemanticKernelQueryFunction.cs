using Core.Application.Contracts;
using Infrastructure.AzureOpenAI.Examples;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace Functions.Api.Functions;

/// <summary>
/// HTTP trigger function that demonstrates Semantic Kernel integration patterns.
/// Supports three advanced patterns:
/// 1. Automatic Function Calling - LLM decides which agents to invoke
/// 2. RAG Pattern - Retrieve-Augment-Generate with conversation context
/// 3. Multi-Agent Orchestration - Chained agent invocations with state
/// </summary>
public class SemanticKernelQueryFunction
{
    private readonly AdvancedSemanticKernelPatterns _patterns;
    private readonly ILogger<SemanticKernelQueryFunction> _logger;
    private readonly bool _enableDemoEndpoint;

    public SemanticKernelQueryFunction(
        AdvancedSemanticKernelPatterns patterns,
        ILogger<SemanticKernelQueryFunction> logger,
        IConfiguration configuration)
    {
        _patterns = patterns;
        _logger = logger;
        _enableDemoEndpoint = bool.TryParse(configuration["SemanticKernel__EnableDemoEndpoint"], out var enabled) && enabled;
    }

    [Function("SemanticKernelQuery")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "query/semantic-kernel")]
        HttpRequestData req,
        CancellationToken cancellationToken)
    {
        try
        {
            if (!_enableDemoEndpoint)
            {
                return req.CreateResponse(HttpStatusCode.NotFound);
            }

            _logger.LogInformation("SemanticKernelQuery function received request");

            // Parse request body
            var requestBody = await req.Body.StreamAsJson<SemanticKernelQueryRequest>();
            var authenticatedUserId = req.FunctionContext.Items.TryGetValue("UserId", out var uid) ? uid?.ToString() : null;

            // Validate required fields
            if (string.IsNullOrWhiteSpace(authenticatedUserId) || string.IsNullOrWhiteSpace(requestBody.Question))
            {
                _logger.LogWarning("Invalid request: missing authenticated user or question");
                return req.CreateResponse(HttpStatusCode.Unauthorized);
            }

            requestBody.UserId = authenticatedUserId;

            // Route to appropriate pattern based on request
            HttpResponseData response = requestBody.Pattern switch
            {
                ProcessingPattern.AutomaticFunctionCalling =>
                    await ProcessDemoSequentialAsync(req, requestBody, cancellationToken),

                ProcessingPattern.RagPattern =>
                    await ProcessDemoClassificationAsync(req, requestBody, cancellationToken),

                ProcessingPattern.MultiAgentOrchestration =>
                    await ProcessDemoErrorHandlingAsync(req, requestBody, cancellationToken),

                _ => req.CreateResponse(HttpStatusCode.BadRequest)
            };

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SemanticKernelQuery function");

            var response = req.CreateResponse(HttpStatusCode.InternalServerError);
            await response.WriteAsJsonAsync(new { error = ex.Message });
            return response;
        }
    }

    private async Task<HttpResponseData> ProcessDemoSequentialAsync(
        HttpRequestData req,
        SemanticKernelQueryRequest request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Demo sequential agent calls. User: {UserId}, Question: {Question}",
            request.UserId, request.Question);

        try
        {
            var result = await _patterns.DemoSequentialAgentCallsAsync(
                question: request.Question,
                dbSchema: "sample_schema",
                cancellationToken: cancellationToken);

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new
            {
                pattern = "sequential_demo",
                question = request.Question,
                result = result,
                timestamp = DateTime.UtcNow
            });

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in sequential demo");
            var response = req.CreateResponse(HttpStatusCode.InternalServerError);
            await response.WriteAsJsonAsync(new { error = ex.Message });
            return response;
        }
    }

    private async Task<HttpResponseData> ProcessDemoClassificationAsync(
        HttpRequestData req,
        SemanticKernelQueryRequest request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Demo message classification. User: {UserId}, Question: {Question}",
            request.UserId, request.Question);

        try
        {
            var result = await _patterns.DemoMessageClassificationAsync(
                userId: request.UserId,
                message: request.Question,
                cancellationToken: cancellationToken);

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new
            {
                pattern = "classification_demo",
                message = request.Question,
                classification = result,
                timestamp = DateTime.UtcNow
            });

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in classification demo");
            var response = req.CreateResponse(HttpStatusCode.InternalServerError);
            await response.WriteAsJsonAsync(new { error = ex.Message });
            return response;
        }
    }

    private async Task<HttpResponseData> ProcessDemoErrorHandlingAsync(
        HttpRequestData req,
        SemanticKernelQueryRequest request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Demo error handling. User: {UserId}, Question: {Question}",
            request.UserId, request.Question);

        try
        {
            var result = await _patterns.DemoErrorHandlingAsync(
                invalidQuestion: request.Question,
                cancellationToken: cancellationToken);

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new
            {
                pattern = "error_handling_demo",
                result = result,
                timestamp = DateTime.UtcNow
            });

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in error handling demo");
            var response = req.CreateResponse(HttpStatusCode.InternalServerError);
            await response.WriteAsJsonAsync(new { error = ex.Message });
            return response;
        }
    }
}

/// <summary>
/// Request body for semantic kernel query processing.
/// </summary>
public class SemanticKernelQueryRequest
{
    public string UserId { get; set; } = "";
    public string Question { get; set; } = "";
    public string? SessionId { get; set; }
    public ProcessingPattern Pattern { get; set; } = ProcessingPattern.AutomaticFunctionCalling;
    public int? ContextTurns { get; set; } = 5;
}

/// <summary>
/// Semantic Kernel processing patterns supported by the function.
/// </summary>
public enum ProcessingPattern
{
    /// <summary>
    /// LLM automatically decides which agents to invoke based on the user question.
    /// </summary>
    AutomaticFunctionCalling = 0,

    /// <summary>
    /// Retrieve-Augment-Generate: Uses conversation history to enhance LLM responses.
    /// </summary>
    RagPattern = 1,

    /// <summary>
    /// Multi-Agent Orchestration: Chains multiple agent calls in a coordinated workflow.
    /// </summary>
    MultiAgentOrchestration = 2
}

/// <summary>
/// Extension method for streaming JSON from HttpRequest body.
/// </summary>
public static class HttpRequestDataExtensions
{
    private static readonly JsonSerializerOptions _options = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static async Task<T> StreamAsJson<T>(this Stream stream)
    {
        using var reader = new StreamReader(stream);
        var json = await reader.ReadToEndAsync();
        return JsonSerializer.Deserialize<T>(json, _options)
            ?? throw new InvalidOperationException("Failed to deserialize request body");
    }
}
