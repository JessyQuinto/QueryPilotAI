using System.Text.RegularExpressions;
using Core.Application.Contracts;
using Core.Domain.Policies;

namespace Infrastructure.Security;

public sealed class SqlPolicyEngine : ISqlPolicyEngine
{
    private static readonly string[] ForbiddenTokens =
    [
        "INSERT ", "UPDATE ", "DELETE ", "MERGE ", "DROP ", "ALTER ", "TRUNCATE ", "EXEC ", "CREATE ",
        "GRANT ", "REVOKE ", "DENY ", "BACKUP ", "RESTORE ", "SHUTDOWN ", "KILL ", "OPENROWSET", "OPENDATASOURCE",
        "xp_", "sp_", "DBCC "
    ];

    public SqlValidationResult Validate(string sql)
    {
        if (string.IsNullOrWhiteSpace(sql))
        {
            return new SqlValidationResult(false, "Critical", false, ["SQL vacío."], string.Empty);
        }

        var normalized = sql.Trim().Replace("\r", " ").Replace("\n", " ");
        // Strip trailing semicolon so it doesn't trigger multi-statement check
        if (normalized.EndsWith(";"))
            normalized = normalized[..^1].TrimEnd();
        var upper = normalized.ToUpperInvariant();

        if (!upper.StartsWith("SELECT ") && !upper.StartsWith("WITH "))
        {
            return new SqlValidationResult(false, "Critical", false, ["Solo se permiten consultas SELECT (o CTEs con WITH)."], normalized);
        }

        if (ForbiddenTokens.Any(token => upper.Contains(token)))
        {
            return new SqlValidationResult(false, "Critical", false, ["Se detectó un comando SQL prohibido."], normalized);
        }

        if (normalized.Count(c => c == ';') > 0)
        {
            return new SqlValidationResult(false, "Critical", false, ["No se permiten múltiples sentencias."], normalized);
        }

        // Flag queries that expose potentially sensitive fields
        var requiresApproval = upper.Contains("CUSTOMER_ID") || upper.Contains("FULL_NAME");
        var reasons = requiresApproval ? new[] { "La consulta expone detalle potencialmente sensible." } : Array.Empty<string>();
        var risk = requiresApproval ? "High" : "Medium";

        return new SqlValidationResult(true, risk, requiresApproval, reasons, normalized);
    }
}
