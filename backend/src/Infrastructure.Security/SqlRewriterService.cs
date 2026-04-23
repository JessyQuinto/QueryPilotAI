using Core.Domain.Policies;
using System;

namespace Infrastructure.Security;

public class SqlRewriterService : ISqlRewriterService
{
    public string RewriteSql(string originalSql, string userRole)
    {
        if (string.IsNullOrWhiteSpace(originalSql))
            return originalSql;

        // Skip rewriting for Admins
        if (string.Equals(userRole, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            return originalSql;
        }

        // Example RBAC rule: Billing users shouldn't see clinical data freely without limits
        if (string.Equals(userRole, "Billing", StringComparison.OrdinalIgnoreCase))
        {
            // A naive CTE wrapper for demonstration
            return $";WITH BaseQuery AS (\n    {originalSql}\n)\nSELECT * FROM BaseQuery LIMIT 100;"; // Forcing limits
        }

        // Default protection: wrap in CTE
        return $";WITH ProtectedQuery AS (\n    {originalSql}\n)\nSELECT * FROM ProtectedQuery;";
    }
}
