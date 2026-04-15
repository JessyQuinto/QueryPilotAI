namespace Core.Application.Contracts;

public sealed record DatabaseConfig(
    string Type,
    string Host,
    string Port,
    string Database,
    string Username,
    string Password,
    string? AuthType = null);

public sealed record QueryRequest(string Question, string UserId, string Role, string? CorrelationId = null, string? SessionId = null, Guid? ConnectionId = null, DatabaseConfig? Connection = null);
public sealed record ConversationTurn(
    string Question,
    string ExecutiveSummary,
    string Sql,
    string IntentType,
    string Metric,
    DateTimeOffset Timestamp);

public sealed record ConversationContextRequest(string UserId, string? SessionId, int MaxTurns = 5);

public sealed record ConversationTurnUpsert(
    string UserId,
    string? SessionId,
    string Question,
    string ExecutiveSummary,
    string Sql,
    string IntentType,
    string Metric,
    DateTimeOffset Timestamp);

public sealed record IntentParsingInput(QueryRequest Request, List<ConversationTurn> ConversationContext);

public sealed record PromptSafetyResult(bool IsSafe, string Reason);

public sealed record ConversationalClassification(
    string Category,
    string FriendlyReply,
    double Confidence);

public sealed record AnalyticalIntent(
    string Domain,
    string IntentType,
    string Metric,
    string[] Dimensions,
    Dictionary<string, string> Filters,
    TimeWindow TimeWindow,
    string Grain,
    string Sensitivity,
    double Confidence,
    bool ClarificationNeeded);

public sealed record TimeWindow(string Current, string Baseline);

public sealed record SqlExecutionInput(string Sql, DatabaseConfig? Config);

public sealed record SummaryInput(string Question, string Sql, List<Dictionary<string, object?>> Rows);

public sealed record AuditMetadata(string RiskLevel, string? ApprovedBy);

public sealed record SuggestedChartOutput(
    string Type,
    string Title,
    string? Description,
    string? XAxisLabel,
    string? YAxisLabel,
    string? XField,
    string? YField,
    string? GroupBy,
    int? FilteredRowsCount);

public sealed record InsightResponse(
    string RequestId,
    string Status,
    string ExecutiveSummary,
    string[] KeyFindings,
    string Sql,
    string[] Warnings,
    List<Dictionary<string, object?>> ResultPreview,
    AuditMetadata Audit,
    SuggestedChartOutput? SuggestedChart = null);

// --- Approval Flow ---
public sealed record ApprovalDecision(string Decision, string ApproverUserId, string? Comments);

public sealed record ApprovalRequest(
    Guid RequestId,
    string InstanceId,
    string UserId,
    string Question,
    string Sql,
    string RiskLevel,
    string[] Reasons);

// --- Audit Trail ---
public sealed record AuditTrailRecord(
    Guid RequestId,
    string UserId,
    string RoleName,
    string OriginalQuestion,
    string? AnalyticalIntent,
    string? GeneratedSql,
    string? ValidationResult,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? CompletedAt);

// --- Pipeline Step Tracking ---
public sealed record PipelineStep(string Step, string Label, string Status, DateTimeOffset Timestamp);
