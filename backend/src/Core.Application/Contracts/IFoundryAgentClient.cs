using Core.Application.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Core.Application.Contracts;

/// <summary>
/// Client that invokes agents hosted in Azure AI Foundry.
/// Agents (SQL Planner, Result Interpreter, Concierge) are created and configured
/// in Foundry with their prompts managed there — not hardcoded in this codebase.
/// This service only sends messages and retrieves responses.
/// </summary>
public interface IFoundryAgentClient
{
    /// <summary>
    /// Sends the user's question + database schema to the SQL Planner agent in Foundry.
    /// Returns a structured JSON response with status, intent, SQL, and governance info.
    /// </summary>
    Task<SqlPlannerResponse> PlanSqlAsync(string question, string dbSchema, string? conversationContext = null);

    /// <summary>
    /// Sends the executed SQL results to the Result Interpreter agent in Foundry.
    /// Returns a structured JSON interpretation with findings, recommendations, etc.
    /// </summary>
    Task<ResultInterpretation> InterpretResultsAsync(
        string question, string intentJson, string sql,
        List<Dictionary<string, object?>> rows, string? governanceJson = null);

    /// <summary>
    /// Sends a message to the Concierge agent to classify whether it's conversational or analytical.
    /// </summary>
    Task<ConversationalClassification?> ClassifyMessageAsync(string userId, string message, string? conversationContext = null);
}
