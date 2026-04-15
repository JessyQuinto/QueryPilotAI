using Core.Application.Contracts;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using System.ComponentModel;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Infrastructure.AzureOpenAI.Plugins;

/// <summary>
/// Semantic Kernel plugin that wraps Foundry agent invocations.
/// Exposes SQL Planner, Result Interpreter, and Concierge agent capabilities
/// as KernelFunctions for use with automatic function calling and orchestration.
/// </summary>
public class FoundryAgentsPlugin
{
    private readonly IFoundryAgentClient _agentClient;
    private readonly ILogger<FoundryAgentsPlugin> _logger;

    public FoundryAgentsPlugin(
        IFoundryAgentClient agentClient,
        ILogger<FoundryAgentsPlugin> logger)
    {
        _agentClient = agentClient;
        _logger = logger;
    }

    [KernelFunction("plan_sql")]
    [Description("Invokes the SQL Planner agent to generate safe SQL queries from natural language")]
    public async Task<string> PlanSqlAsync(
        [Description("Natural language question or analytical query")] string userQuestion,
        [Description("Database schema information")] string dbSchema,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("SQL Planner invoked: {Question}", userQuestion);

            var response = await _agentClient.PlanSqlAsync(userQuestion, dbSchema);

            // Return the response serialized as JSON
            return JsonSerializer.Serialize(response, new JsonSerializerOptions { WriteIndented = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SQL Planner");
            throw;
        }
    }

    [KernelFunction("interpret_results")]
    [Description("Invokes the Result Interpreter agent to analyze SQL results and provide insights")]
    public async Task<string> InterpretResultsAsync(
        [Description("Original business question")] string userQuestion,
        [Description("Interpreted intent as JSON")] string intentJson,
        [Description("SQL query that was executed")] string sql,
        [Description("Query results as JSON array")] string resultsJson,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Result Interpreter invoked: {Question}", userQuestion);

            // Parse results JSON to List<Dictionary>
            var rows = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(resultsJson)
                ?? new List<Dictionary<string, object?>>();

            var response = await _agentClient.InterpretResultsAsync(
                question: userQuestion,
                intentJson: intentJson,
                sql: sql,
                rows: rows);

            return JsonSerializer.Serialize(response, new JsonSerializerOptions { WriteIndented = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in Result Interpreter");
            throw;
        }
    }

    [KernelFunction("classify_message")]
    [Description("Invokes the Concierge agent to classify if a message is conversational or analytical")]
    public async Task<string> ClassifyMessageAsync(
        [Description("User ID for context")] string userId,
        [Description("User message to classify")] string message,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Concierge classification: {Message}", message);

            var response = await _agentClient.ClassifyMessageAsync(userId, message);

            if (response == null)
            {
                return JsonSerializer.Serialize(new { type = "unknown", confidence = 0.0 });
            }

            return JsonSerializer.Serialize(response, new JsonSerializerOptions { WriteIndented = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in Concierge classification");
            throw;
        }
    }
}
