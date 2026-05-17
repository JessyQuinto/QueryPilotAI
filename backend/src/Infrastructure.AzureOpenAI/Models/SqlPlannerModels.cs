using System.Text.Json.Serialization;

namespace Infrastructure.AzureOpenAI.Models;

/// <summary>
/// Response from the SQL Planner agent containing status, SQL, governance, and clarification info.
/// </summary>
public sealed class SqlPlannerResponse
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "unsupported";

    [JsonPropertyName("user_question")]
    public string? UserQuestion { get; set; }

    [JsonPropertyName("intent")]
    public System.Text.Json.JsonElement? Intent { get; set; }

    [JsonPropertyName("understanding")]
    public System.Text.Json.JsonElement? Understanding { get; set; }

    [JsonPropertyName("data_mapping")]
    public System.Text.Json.JsonElement? DataMapping { get; set; }

    [JsonPropertyName("governance")]
    public GovernanceInfo? Governance { get; set; }

    [JsonPropertyName("sql")]
    public SqlInfo? Sql { get; set; }

    [JsonPropertyName("clarification")]
    public ClarificationInfo? Clarification { get; set; }
}

public sealed class GovernanceInfo
{
    [JsonPropertyName("safe_to_execute")]
    public bool SafeToExecute { get; set; }

    [JsonPropertyName("risk_level")]
    public string RiskLevel { get; set; } = "low";

    [JsonPropertyName("policy_flags")]
    public string[]? PolicyFlags { get; set; }

    [JsonPropertyName("approval_required")]
    public bool ApprovalRequired { get; set; }

    [JsonPropertyName("approval_reason")]
    public string? ApprovalReason { get; set; }
}

public sealed class SqlInfo
{
    [JsonPropertyName("dialect")]
    public string Dialect { get; set; } = "tsql";

    [JsonPropertyName("query")]
    public string Query { get; set; } = string.Empty;

    [JsonPropertyName("explanation")]
    public string? Explanation { get; set; }
}

public sealed class ClarificationInfo
{
    [JsonPropertyName("question_for_user")]
    public string? QuestionForUser { get; set; }
}
