namespace Core.Domain.Policies;

public sealed record SqlValidationResult(
    bool IsValid,
    string RiskLevel,
    bool RequiresApproval,
    string[] Reasons,
    string NormalizedSql);
