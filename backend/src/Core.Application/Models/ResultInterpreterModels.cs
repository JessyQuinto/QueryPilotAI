using System.Text.Json.Serialization;

namespace Core.Application.Models;

/// <summary>
/// Response from the Result Interpreter agent containing findings, charts, and recommendations.
/// </summary>
public sealed class ResultInterpretation
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "no_data";

    [JsonPropertyName("question_answered")]
    public string? QuestionAnswered { get; set; }

    [JsonPropertyName("executive_summary")]
    public string? ExecutiveSummary { get; set; }

    [JsonPropertyName("key_findings")]
    public List<KeyFinding>? KeyFindings { get; set; }

    [JsonPropertyName("observations")]
    public string[]? Observations { get; set; }

    [JsonPropertyName("inferences")]
    public string[]? Inferences { get; set; }

    [JsonPropertyName("recommendations")]
    public string[]? Recommendations { get; set; }

    [JsonPropertyName("risk_interpretation")]
    public RiskInterpretation? Risk { get; set; }

    [JsonPropertyName("limitations")]
    public string[]? Limitations { get; set; }

    [JsonPropertyName("follow_up_questions")]
    public string[]? FollowUpQuestions { get; set; }

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; }

    [JsonPropertyName("response_for_user")]
    public string? ResponseForUser { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("warnings")]
    public string[]? Warnings { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("subtitle")]
    public string? Subtitle { get; set; }

    [JsonPropertyName("suggested_chart")]
    public SuggestedChart? SuggestedChart { get; set; }

    // Legacy chart response format compatibility
    [JsonPropertyName("should_render_chart")]
    public bool? ShouldRenderChart { get; set; }

    [JsonPropertyName("chart_type")]
    public string? ChartType { get; set; }

    [JsonPropertyName("x_axis")]
    public string? XAxis { get; set; }

    [JsonPropertyName("y_axis")]
    public string? YAxis { get; set; }

    [JsonPropertyName("category_field")]
    public string? CategoryField { get; set; }

    [JsonPropertyName("top_n")]
    public int? TopN { get; set; }
}

public sealed class SuggestedChart
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "line"; // line, bar, pie, area

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("x_axis_label")]
    public string? XAxisLabel { get; set; }

    [JsonPropertyName("y_axis_label")]
    public string? YAxisLabel { get; set; }

    [JsonPropertyName("x_field")]
    public string? XField { get; set; }

    [JsonPropertyName("y_field")]
    public string? YField { get; set; }

    [JsonPropertyName("group_by")]
    public string? GroupBy { get; set; }

    [JsonPropertyName("filtered_rows")]
    public int? FilteredRowsCount { get; set; }
}

public sealed class KeyFinding
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("evidence")]
    public string? Evidence { get; set; }
}

public sealed class RiskInterpretation
{
    [JsonPropertyName("level")]
    public string Level { get; set; } = "unknown";

    [JsonPropertyName("rationale")]
    public string? Rationale { get; set; }
}

/// <summary>
/// Internal DTO for parsing the Concierge agent's classification response.
/// </summary>
public sealed class ConciergeClassification
{
    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("reply")]
    public string? Reply { get; set; }

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; } = 1.0;
}
