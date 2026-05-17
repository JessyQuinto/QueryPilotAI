using Core.Domain.Policies;
using System;

namespace Infrastructure.Security;

public class SqlRewriterService : ISqlRewriterService
{
    public string RewriteSql(string originalSql, string userRole)
    {
        if (string.IsNullOrWhiteSpace(originalSql))
            return originalSql;

        // Strip trailing semicolons to avoid T-SQL CTE syntax errors
        var cleanedSql = originalSql.TrimEnd().TrimEnd(';');

        // Skip rewriting for Admins
        if (string.Equals(userRole, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            return originalSql;
        }

        // RBAC rule: Billing users shouldn't see clinical data freely without limits
        if (string.Equals(userRole, "Billing", StringComparison.OrdinalIgnoreCase))
        {
            // T-SQL uses TOP N instead of LIMIT N
            return $"WITH BaseQuery AS (\n    {cleanedSql}\n)\nSELECT TOP 100 * FROM BaseQuery";
        }

        // Default protection: wrap in CTE
        return $"WITH ProtectedQuery AS (\n    {cleanedSql}\n)\nSELECT * FROM ProtectedQuery";
    }
}
