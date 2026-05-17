namespace Infrastructure.AzureOpenAI.Configuration;

/// <summary>
/// Strongly-typed configuration for Azure AI Foundry / OpenAI Assistants integration.
/// Bind from the "FoundryAgent" section in appsettings.json or environment variables.
/// </summary>
public sealed class FoundryAgentOptions
{
    public const string SectionName = "FoundryAgent";

    /// <summary>Azure OpenAI project endpoint (e.g. https://myresource.openai.azure.com).</summary>
    public string ProjectEndpoint { get; set; } = string.Empty;

    /// <summary>Agent reference for the SQL Planner (used as display/logging name).</summary>
    public string SqlPlannerAgentRef { get; set; } = string.Empty;

    /// <summary>Assistant ID for the SQL Planner (asst_...).</summary>
    public string SqlPlannerAgentId { get; set; } = string.Empty;

    /// <summary>Agent reference for the Result Interpreter.</summary>
    public string ResultInterpreterAgentRef { get; set; } = string.Empty;

    /// <summary>Assistant ID for the Result Interpreter (asst_...).</summary>
    public string ResultInterpreterAgentId { get; set; } = string.Empty;

    /// <summary>Agent reference for the Concierge router.</summary>
    public string ConciergeAgentRef { get; set; } = string.Empty;

    /// <summary>Assistant ID for the Concierge (asst_...).</summary>
    public string ConciergeAgentId { get; set; } = string.Empty;

    /// <summary>Optional tenant ID for multi-tenant scenarios.</summary>
    public string? TenantId { get; set; }
}
