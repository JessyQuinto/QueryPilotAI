using System.Collections.Generic;
using System.Threading.Tasks;

namespace Core.Application.Contracts;

public interface ISqlExecutionService
{
    Task<List<Dictionary<string, object?>>> ExecuteQueryAsync(string sql, DatabaseConfig? config = null);
    Task SaveAuditAsync(AuditTrailRecord audit);
    Task<List<Dictionary<string, object?>>> GetRecentAuditsAsync(int count);
    Task<List<Dictionary<string, object?>>> GetRecentAuditsByUserAsync(string userId, int count);
}
