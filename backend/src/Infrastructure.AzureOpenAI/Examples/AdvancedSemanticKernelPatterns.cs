using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;

namespace Infrastructure.AzureOpenAI.Examples;

/// <summary>
/// Examples of advanced Semantic Kernel patterns:
/// 1. Sequential Agent Invocation - Chain agent calls in order
/// 2. RAG Pattern - Use conversation history to augment context
/// 3. Simple Orchestration - Demonstrate plugin cooperation
/// </summary>
public class AdvancedSemanticKernelPatterns
{
    private readonly Kernel _kernel;
    private readonly ILogger<AdvancedSemanticKernelPatterns> _logger;

    public AdvancedSemanticKernelPatterns(
        Kernel kernel,
        ILogger<AdvancedSemanticKernelPatterns> logger)
    {
        _kernel = kernel;
        _logger = logger;
    }

    /// <summary>
    /// Example 1: Sequential Agent Calls
    /// Demonstrates calling multiple Foundry agents in sequence.
    /// </summary>
    public async Task<string> DemoSequentialAgentCallsAsync(
        string question,
        string dbSchema,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Demo: Sequential agent calls for question: {Question}", question);

            var foundryPlugin = _kernel.Plugins["FoundryAgents"];

            // Step 1: Plan SQL
            var planFunc = foundryPlugin["plan_sql"];
            var sqlResult = await _kernel.InvokeAsync(
                planFunc,
                new KernelArguments
                {
                    { "userQuestion", question },
                    { "dbSchema", dbSchema }
                },
                cancellationToken);

            var sqlStatement = sqlResult.GetValue<object>()?.ToString() ?? "No SQL generated";
            _logger.LogInformation("Step 1 - SQL Planning completed");

            // Step 2: Interpret Results  (simulated for demo)
            var interpretFunc = foundryPlugin["interpret_results"];
            var interpretation = await _kernel.InvokeAsync(
                interpretFunc,
                new KernelArguments
                {
                    { "userQuestion", question },
                    { "intentJson", "{}" },
                    { "sql", sqlStatement },
                    { "resultsJson", "[]"  }
                },
                cancellationToken);

            _logger.LogInformation("Step 2 - Result interpretation completed");

            return $"Sequential orchestration complete.\nSQL: {sqlStatement}\nInterpretation: {interpretation}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in sequential agent pattern");
            throw;
        }
    }

    /// <summary>
    /// Example 2: Message Classification
    /// Uses Concierge agent to classify user messages.
    /// </summary>
    public async Task<string> DemoMessageClassificationAsync(
        string userId,
        string message,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Demo: Message classification for user {UserId}", userId);

            var foundryPlugin = _kernel.Plugins["FoundryAgents"];
            var classifyFunc = foundryPlugin["classify_message"];

            var result = await _kernel.InvokeAsync(
                classifyFunc,
                new KernelArguments
                {
                    { "userId", userId },
                    { "message", message }
                },
                cancellationToken);

            var classification = result.GetValue<object>()?.ToString() ?? "unknown";
            _logger.LogInformation("Message classified: {Classification}", classification);

            return classification;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in message classification");
            throw;
        }
    }

    /// <summary>
    /// Example 3: Error Handling and Resilience
    /// Demonstrates graceful handling of agent failures.
    /// </summary>
    public async Task<string> DemoErrorHandlingAsync(
        string invalidQuestion,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogWarning("Demo: Testing error handling with invalid input");

            var foundryPlugin = _kernel.Plugins["FoundryAgents"];
            var planFunc = foundryPlugin["plan_sql"];

            try
            {
                // This will likely fail due to invalid input
                var result = await _kernel.InvokeAsync(
                    planFunc,
                    new KernelArguments
                    {
                        { "userQuestion", invalidQuestion },
                        { "dbSchema", "" }
                    },
                    cancellationToken);

                return result.GetValue<object>()?.ToString() ?? "Unexpected result";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Agent call failed as expected");
                return $"Gracefully handled error: {ex.Message}";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in error handling demo");
            throw;
        }
    }
}
