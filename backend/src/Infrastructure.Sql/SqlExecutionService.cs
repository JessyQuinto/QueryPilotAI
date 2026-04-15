namespace Infrastructure.Sql;

using Core.Application.Contracts;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

public interface ISqlExecutionService
{
    Task<List<Dictionary<string, object?>>> ExecuteQueryAsync(string sql, DatabaseConfig? config = null);
    Task SaveAuditAsync(AuditTrailRecord audit);
    Task<List<Dictionary<string, object?>>> GetRecentAuditsAsync(int count);
    Task<List<Dictionary<string, object?>>> GetRecentAuditsByUserAsync(string userId, int count);
}

public sealed class SqlExecutionService(IConfiguration configuration) : ISqlExecutionService
{
    private const int QueryCommandTimeoutSeconds = 30;
    private const int AuditCommandTimeoutSeconds = 10;
    private const int MinAuditCount = 1;
    private const int MaxAuditCount = 200;

    private readonly string _connectionString =
        configuration["DatabaseConnectionString"]
        ?? throw new InvalidOperationException("DatabaseConnectionString configuration is required.");

    public async Task<List<Dictionary<string, object?>>> ExecuteQueryAsync(string sql, DatabaseConfig? config = null)
    {
        var connection = config != null && !string.IsNullOrWhiteSpace(config.Host) && string.Equals(config.Type, "Azure SQL", StringComparison.OrdinalIgnoreCase)
            ? SqlConnectionFactory.Create(config)
            : new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var cmdConnection = connection; // Ensure disposal
        
        await using var command = new SqlCommand(sql, cmdConnection)
        {
            CommandTimeout = QueryCommandTimeoutSeconds
        };

        var rows = new List<Dictionary<string, object?>>();
        await using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < reader.FieldCount; i++)
            {
                var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                row[reader.GetName(i)] = value;
            }

            rows.Add(row);
        }

        return rows;
    }

    public async Task SaveAuditAsync(AuditTrailRecord audit)
    {
        const string sql = @"
MERGE INTO dbo.analytics_requests_audit AS target
USING (VALUES (@RequestId)) AS source(request_id)
ON target.request_id = source.request_id
WHEN MATCHED THEN
    UPDATE SET
        status = @Status,
        generated_sql = @GeneratedSql,
        analytical_intent = @AnalyticalIntent,
        validation_result = @ValidationResult,
        completed_at = @CompletedAt
WHEN NOT MATCHED THEN
    INSERT (request_id, user_id, role_name, original_question, analytical_intent, generated_sql, validation_result, status, created_at, completed_at)
    VALUES (@RequestId, @UserId, @RoleName, @OriginalQuestion, @AnalyticalIntent, @GeneratedSql, @ValidationResult, @Status, @CreatedAt, @CompletedAt);";

        try
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var command = new SqlCommand(sql, connection)
            {
                CommandTimeout = AuditCommandTimeoutSeconds
            };

            command.Parameters.AddWithValue("@RequestId", audit.RequestId);
            command.Parameters.AddWithValue("@UserId", audit.UserId);
            command.Parameters.AddWithValue("@RoleName", audit.RoleName);
            command.Parameters.AddWithValue("@OriginalQuestion", audit.OriginalQuestion);
            command.Parameters.AddWithValue("@AnalyticalIntent", (object?)audit.AnalyticalIntent ?? DBNull.Value);
            command.Parameters.AddWithValue("@GeneratedSql", (object?)audit.GeneratedSql ?? DBNull.Value);
            command.Parameters.AddWithValue("@ValidationResult", (object?)audit.ValidationResult ?? DBNull.Value);
            command.Parameters.AddWithValue("@Status", audit.Status);
            command.Parameters.AddWithValue("@CreatedAt", audit.CreatedAt);
            command.Parameters.AddWithValue("@CompletedAt", (object?)audit.CompletedAt?.UtcDateTime ?? DBNull.Value);

            await command.ExecuteNonQueryAsync();
        }
        catch
        {
            // Audit persistence should not break the orchestration
        }
    }

    public async Task<List<Dictionary<string, object?>>> GetRecentAuditsAsync(int count)
    {
        var safeCnt = Math.Clamp(count, MinAuditCount, MaxAuditCount);
        const string sql = @"
SELECT TOP (@Count)
    request_id,
    user_id,
    role_name,
    original_question,
    status,
    generated_sql,
    created_at,
    completed_at
FROM dbo.analytics_requests_audit
ORDER BY created_at DESC";

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection)
        {
            CommandTimeout = QueryCommandTimeoutSeconds
        };
        command.Parameters.AddWithValue("@Count", safeCnt);

        var rows = new List<Dictionary<string, object?>>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < reader.FieldCount; i++)
            {
                row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
            }

            rows.Add(row);
        }

        return rows;
    }

    public async Task<List<Dictionary<string, object?>>> GetRecentAuditsByUserAsync(string userId, int count)
    {
        var safeCnt = Math.Clamp(count, MinAuditCount, MaxAuditCount);
        const string sql = @"
SELECT TOP (@Count)
    request_id,
    user_id,
    role_name,
    original_question,
    status,
    generated_sql,
    created_at,
    completed_at
FROM dbo.analytics_requests_audit
WHERE user_id = @UserId
ORDER BY created_at DESC";

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new SqlCommand(sql, connection)
        {
            CommandTimeout = QueryCommandTimeoutSeconds
        };
        command.Parameters.AddWithValue("@Count", safeCnt);
        command.Parameters.AddWithValue("@UserId", userId);

        var rows = new List<Dictionary<string, object?>>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < reader.FieldCount; i++)
            {
                row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
            }

            rows.Add(row);
        }

        return rows;
    }
}
