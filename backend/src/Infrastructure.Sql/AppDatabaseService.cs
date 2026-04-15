using Core.Application.Contracts;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Sql;

/// <summary>
/// Manages application-level persistence: user connections, chat sessions, conversation turns.
/// Operates against insightforge-appdb (distinct from user's analytical database).
/// </summary>
public interface IAppDatabaseService
{
    // --- User Connections ---
    Task<Guid> SaveConnectionAsync(UserConnectionRecord connection);
    Task<UserConnectionRecord?> GetConnectionAsync(Guid connectionId);
    Task<UserConnectionRecord?> GetConnectionForUserAsync(Guid connectionId, string userId);
    Task<UserConnectionRecord?> GetConnectionForUsersAsync(Guid connectionId, IReadOnlyCollection<string> userIds);
    Task<List<UserConnectionRecord>> GetConnectionsByUserAsync(string userId);
    Task<List<UserConnectionRecord>> GetConnectionsByUserIdsAsync(IReadOnlyCollection<string> userIds);
    Task UpdateSchemaCacheAsync(Guid connectionId, string schemaJson);
    Task DeleteConnectionAsync(Guid connectionId, string userId);
    Task DeleteConnectionAsync(Guid connectionId, IReadOnlyCollection<string> userIds);
    Task DeleteUserAccountAsync(string userId);
    Task DeleteUserAccountAsync(IReadOnlyCollection<string> userIds);

    // --- Chat Sessions ---
    Task<Guid> CreateSessionAsync(Guid id, string userId, Guid? connectionId, string? title);
    Task<List<ChatSessionRecord>> GetSessionsByUserAsync(string userId);
    Task<List<ChatSessionRecord>> GetSessionsByUserIdsAsync(IReadOnlyCollection<string> userIds);
    Task TouchSessionAsync(Guid sessionId);
    Task<bool> UpdateSessionTitleAsync(Guid sessionId, string title, IReadOnlyCollection<string> userIds);
    Task DeleteSessionAsync(Guid sessionId, string userId);
    Task DeleteSessionAsync(Guid sessionId, IReadOnlyCollection<string> userIds);

    // --- Conversation Turns ---
    Task<Guid> AddTurnAsync(ConversationTurnRecord turn);
    Task<List<ConversationTurnRecord>> GetRecentTurnsAsync(Guid sessionId, int maxTurns = 10);

    // --- Organizations ---
    Task<Guid> CreateOrganizationAsync(OrganizationRecord org, string adminUserId);
    Task<List<OrganizationRecord>> GetOrganizationsByUserIdAsync(string userId);
    Task<List<OrganizationRecord>> GetOrganizationsByUserIdsAsync(IReadOnlyCollection<string> userIds);
    Task<int> GetOrganizationCountAsync(string userId);
    Task DeleteOrganizationAsync(Guid orgId, string userId);
    Task DeleteOrganizationAsync(Guid orgId, IReadOnlyCollection<string> userIds);
}

public sealed record OrganizationRecord(
    Guid Id,
    string Name,
    string? Industry,
    DateTimeOffset CreatedAt);

public sealed record OrganizationMemberRecord(
    Guid OrganizationId,
    string UserId,
    string Role,
    DateTimeOffset JoinedAt);


public sealed record UserConnectionRecord(
    Guid Id,
    string UserId,
    string ConnectionName,
    string DbType,
    string Host,
    string? Port,
    string DatabaseName,
    string? AuthType,
    string? Username,
    string? EncryptedPassword,
    string? SchemaCache,
    DateTimeOffset? SchemaExtractedAt,
    DateTimeOffset CreatedAt,
    bool IsActive);

public sealed record ChatSessionRecord(
    Guid Id,
    string UserId,
    Guid? ConnectionId,
    string? Title,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastActivity);

public sealed record ConversationTurnRecord(
    Guid Id,
    Guid SessionId,
    string UserId,
    string Role,
    string Question,
    string? SqlGenerated,
    string? AgentResponse,
    string? Summary,
    string? IntentType,
    string? Metric,
    DateTimeOffset CreatedAt);

public sealed class AppDatabaseService : IAppDatabaseService
{
    private const string EnsureOrganizationSchemaSql = @"
IF OBJECT_ID(N'dbo.organizations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.organizations (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(150) NOT NULL,
        industry NVARCHAR(100) NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;

IF OBJECT_ID(N'dbo.organization_members', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.organization_members (
        organization_id UNIQUEIDENTIFIER NOT NULL
            REFERENCES dbo.organizations(id) ON DELETE CASCADE,
        user_id NVARCHAR(256) NOT NULL,
        role NVARCHAR(50) NOT NULL DEFAULT 'Member',
        joined_at DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_organization_members PRIMARY KEY (organization_id, user_id)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_organization_members_user_id' AND object_id = OBJECT_ID(N'dbo.organization_members'))
BEGIN
    CREATE INDEX IX_organization_members_user_id ON dbo.organization_members(user_id);
END;";

    private readonly string _connectionString;
    private readonly IConnectionSecretProtector _secretProtector;
    private readonly SemaphoreSlim _organizationSchemaLock = new(1, 1);
    private bool _organizationSchemaEnsured;

    public AppDatabaseService(IConfiguration configuration, IConnectionSecretProtector secretProtector)
    {
        _connectionString = configuration["DatabaseConnectionString"]
            ?? throw new InvalidOperationException("DatabaseConnectionString is required.");
        _secretProtector = secretProtector;
    }

    private async Task EnsureOrganizationSchemaAsync()
    {
        if (_organizationSchemaEnsured)
        {
            return;
        }

        await _organizationSchemaLock.WaitAsync();
        try
        {
            if (_organizationSchemaEnsured)
            {
                return;
            }

            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(EnsureOrganizationSchemaSql, conn);
            await cmd.ExecuteNonQueryAsync();
            _organizationSchemaEnsured = true;
        }
        finally
        {
            _organizationSchemaLock.Release();
        }
    }

    // --- User Connections ---

    public async Task<Guid> SaveConnectionAsync(UserConnectionRecord connection)
    {
        const string sql = @"
MERGE INTO dbo.user_connections AS target
USING (SELECT @Id AS id, @UserId AS user_id) AS source ON target.id = source.id AND target.user_id = source.user_id
WHEN MATCHED THEN
    UPDATE SET connection_name = @ConnectionName, db_type = @DbType, host = @Host, port = @Port,
               database_name = @DatabaseName, auth_type = @AuthType, username = @Username,
               encrypted_password = COALESCE(@EncryptedPassword, target.encrypted_password), updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (id, user_id, connection_name, db_type, host, port, database_name, auth_type, username, encrypted_password)
    VALUES (@Id, @UserId, @ConnectionName, @DbType, @Host, @Port, @DatabaseName, @AuthType, @Username, @EncryptedPassword);";

        var id = connection.Id == Guid.Empty ? Guid.NewGuid() : connection.Id;

        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@UserId", connection.UserId);
        cmd.Parameters.AddWithValue("@ConnectionName", connection.ConnectionName);
        cmd.Parameters.AddWithValue("@DbType", connection.DbType);
        cmd.Parameters.AddWithValue("@Host", connection.Host);
        cmd.Parameters.AddWithValue("@Port", (object?)connection.Port ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@DatabaseName", connection.DatabaseName);
        cmd.Parameters.AddWithValue("@AuthType", (object?)connection.AuthType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Username", (object?)connection.Username ?? DBNull.Value);
        var protectedPassword = string.IsNullOrWhiteSpace(connection.EncryptedPassword)
            ? null
            : _secretProtector.Protect(connection.EncryptedPassword);
        cmd.Parameters.AddWithValue("@EncryptedPassword", (object?)protectedPassword ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
        return id;
    }

    public async Task<UserConnectionRecord?> GetConnectionAsync(Guid connectionId)
    {
        const string sql = "SELECT * FROM dbo.user_connections WHERE id = @Id AND is_active = 1";
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@Id", connectionId);
        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return MapConnection(reader);
    }

    public async Task<List<UserConnectionRecord>> GetConnectionsByUserAsync(string userId)
    {
        return await GetConnectionsByUserIdsAsync(new[] { userId });
    }

    public async Task<List<UserConnectionRecord>> GetConnectionsByUserIdsAsync(IReadOnlyCollection<string> userIds)
    {
        var (sql, parameters) = BuildUserIdsQuery(
            "SELECT * FROM dbo.user_connections WHERE is_active = 1 AND user_id IN ({0}) ORDER BY created_at DESC",
            userIds);

        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        foreach (var parameter in parameters)
        {
            cmd.Parameters.AddWithValue(parameter.Key, parameter.Value);
        }
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<UserConnectionRecord>();
        while (await reader.ReadAsync()) list.Add(MapConnection(reader, includeSecret: false));
        return list;
    }

    public async Task<UserConnectionRecord?> GetConnectionForUserAsync(Guid connectionId, string userId)
    {
        return await GetConnectionForUsersAsync(connectionId, new[] { userId });
    }

    public async Task<UserConnectionRecord?> GetConnectionForUsersAsync(Guid connectionId, IReadOnlyCollection<string> userIds)
    {
        var (userFilter, parameters) = BuildUserIdsQuery("user_id IN ({0})", userIds);
        var sql = $"SELECT * FROM dbo.user_connections WHERE id = @Id AND {userFilter} AND is_active = 1";
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@Id", connectionId);
        foreach (var parameter in parameters)
        {
            cmd.Parameters.AddWithValue(parameter.Key, parameter.Value);
        }
        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return MapConnection(reader);
    }

    public async Task UpdateSchemaCacheAsync(Guid connectionId, string schemaJson)
    {
        const string sql = "UPDATE dbo.user_connections SET schema_cache = @Schema, schema_extracted_at = SYSUTCDATETIME() WHERE id = @Id";
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@Id", connectionId);
        cmd.Parameters.AddWithValue("@Schema", schemaJson);
        await cmd.ExecuteNonQueryAsync();
    }

    // --- Chat Sessions ---

    public async Task<Guid> CreateSessionAsync(Guid id, string userId, Guid? connectionId, string? title)
    {
        const string sql = @"
INSERT INTO dbo.chat_sessions (id, user_id, connection_id, title)
VALUES (@Id, @UserId, @ConnectionId, @Title)";
        var actualId = id == Guid.Empty ? Guid.NewGuid() : id;
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@Id", actualId);
        cmd.Parameters.AddWithValue("@UserId", userId);
        cmd.Parameters.AddWithValue("@ConnectionId", (object?)connectionId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Title", (object?)title ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
        return actualId;
    }

    public async Task<List<ChatSessionRecord>> GetSessionsByUserAsync(string userId)
    {
        return await GetSessionsByUserIdsAsync(new[] { userId });
    }

    public async Task<List<ChatSessionRecord>> GetSessionsByUserIdsAsync(IReadOnlyCollection<string> userIds)
    {
        var (sql, parameters) = BuildUserIdsQuery(
            "SELECT * FROM dbo.chat_sessions WHERE is_active = 1 AND user_id IN ({0}) ORDER BY last_activity DESC",
            userIds);

        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        foreach (var parameter in parameters)
        {
            cmd.Parameters.AddWithValue(parameter.Key, parameter.Value);
        }
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<ChatSessionRecord>();
        while (await reader.ReadAsync())
        {
            list.Add(new ChatSessionRecord(
                reader.GetGuid(reader.GetOrdinal("id")),
                reader.GetString(reader.GetOrdinal("user_id")),
                reader.IsDBNull(reader.GetOrdinal("connection_id")) ? null : reader.GetGuid(reader.GetOrdinal("connection_id")),
                reader.IsDBNull(reader.GetOrdinal("title")) ? null : reader.GetString(reader.GetOrdinal("title")),
                reader.GetDateTime(reader.GetOrdinal("created_at")),
                reader.GetDateTime(reader.GetOrdinal("last_activity"))));
        }
        return list;
    }

    public async Task TouchSessionAsync(Guid sessionId)
    {
        const string sql = "UPDATE dbo.chat_sessions SET last_activity = SYSUTCDATETIME() WHERE id = @Id";
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@Id", sessionId);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<bool> UpdateSessionTitleAsync(Guid sessionId, string title, IReadOnlyCollection<string> userIds)
    {
        var normalizedTitle = string.IsNullOrWhiteSpace(title) ? "New Chat" : title.Trim();
        var (userFilter, parameters) = BuildUserIdsQuery("user_id IN ({0})", userIds);
        var sql = "UPDATE dbo.chat_sessions SET title = @Title, last_activity = SYSUTCDATETIME() WHERE id = @SessionId AND " + userFilter + ";";

        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@SessionId", sessionId);
        cmd.Parameters.AddWithValue("@Title", normalizedTitle);
        foreach (var parameter in parameters)
        {
            cmd.Parameters.AddWithValue(parameter.Key, parameter.Value);
        }

        var affectedRows = await cmd.ExecuteNonQueryAsync();
        return affectedRows > 0;
    }

    public async Task DeleteSessionAsync(Guid sessionId, string userId)
    {
        await DeleteSessionAsync(sessionId, new[] { userId });
    }

    public async Task DeleteSessionAsync(Guid sessionId, IReadOnlyCollection<string> userIds)
    {
        var (userFilter, parameters) = BuildUserIdsQuery("user_id IN ({0})", userIds);
        var sql = @"
DELETE FROM dbo.conversation_turns WHERE session_id = @SessionId;
DELETE FROM dbo.chat_sessions WHERE id = @SessionId AND " + userFilter + ";";
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@SessionId", sessionId);
        foreach (var parameter in parameters)
        {
            cmd.Parameters.AddWithValue(parameter.Key, parameter.Value);
        }
        await cmd.ExecuteNonQueryAsync();
    }

    // --- Conversation Turns ---

    public async Task<Guid> AddTurnAsync(ConversationTurnRecord turn)
    {
        const string sql = @"
INSERT INTO dbo.conversation_turns (id, session_id, user_id, role, question, sql_generated, agent_response, summary, intent_type, metric)
VALUES (@Id, @SessionId, @UserId, @Role, @Question, @SqlGenerated, @AgentResponse, @Summary, @IntentType, @Metric)";
        var id = turn.Id == Guid.Empty ? Guid.NewGuid() : turn.Id;
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@SessionId", turn.SessionId);
        cmd.Parameters.AddWithValue("@UserId", turn.UserId);
        cmd.Parameters.AddWithValue("@Role", turn.Role);
        cmd.Parameters.AddWithValue("@Question", turn.Question);
        cmd.Parameters.AddWithValue("@SqlGenerated", (object?)turn.SqlGenerated ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@AgentResponse", (object?)turn.AgentResponse ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Summary", (object?)turn.Summary ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@IntentType", (object?)turn.IntentType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Metric", (object?)turn.Metric ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
        return id;
    }

    public async Task<List<ConversationTurnRecord>> GetRecentTurnsAsync(Guid sessionId, int maxTurns = 10)
    {
        var sql = $"SELECT TOP {Math.Clamp(maxTurns, 1, 50)} * FROM dbo.conversation_turns WHERE session_id = @SessionId ORDER BY created_at DESC";
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@SessionId", sessionId);
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<ConversationTurnRecord>();
        while (await reader.ReadAsync())
        {
            list.Add(new ConversationTurnRecord(
                reader.GetGuid(reader.GetOrdinal("id")),
                reader.GetGuid(reader.GetOrdinal("session_id")),
                reader.GetString(reader.GetOrdinal("user_id")),
                reader.GetString(reader.GetOrdinal("role")),
                reader.GetString(reader.GetOrdinal("question")),
                reader.IsDBNull(reader.GetOrdinal("sql_generated")) ? null : reader.GetString(reader.GetOrdinal("sql_generated")),
                reader.IsDBNull(reader.GetOrdinal("agent_response")) ? null : reader.GetString(reader.GetOrdinal("agent_response")),
                reader.IsDBNull(reader.GetOrdinal("summary")) ? null : reader.GetString(reader.GetOrdinal("summary")),
                reader.IsDBNull(reader.GetOrdinal("intent_type")) ? null : reader.GetString(reader.GetOrdinal("intent_type")),
                reader.IsDBNull(reader.GetOrdinal("metric")) ? null : reader.GetString(reader.GetOrdinal("metric")),
                reader.GetDateTime(reader.GetOrdinal("created_at"))));
        }
        list.Reverse(); // Return in chronological order
        return list;
    }

    private UserConnectionRecord MapConnection(SqlDataReader reader, bool includeSecret = true)
    {
        string? secret = null;
        if (includeSecret && !reader.IsDBNull(reader.GetOrdinal("encrypted_password")))
        {
            secret = _secretProtector.Unprotect(reader.GetString(reader.GetOrdinal("encrypted_password")));
        }

        return new UserConnectionRecord(
            reader.GetGuid(reader.GetOrdinal("id")),
            reader.GetString(reader.GetOrdinal("user_id")),
            reader.GetString(reader.GetOrdinal("connection_name")),
            reader.GetString(reader.GetOrdinal("db_type")),
            reader.GetString(reader.GetOrdinal("host")),
            reader.IsDBNull(reader.GetOrdinal("port")) ? null : reader.GetString(reader.GetOrdinal("port")),
            reader.GetString(reader.GetOrdinal("database_name")),
            reader.IsDBNull(reader.GetOrdinal("auth_type")) ? null : reader.GetString(reader.GetOrdinal("auth_type")),
            reader.IsDBNull(reader.GetOrdinal("username")) ? null : reader.GetString(reader.GetOrdinal("username")),
            secret,
            reader.IsDBNull(reader.GetOrdinal("schema_cache")) ? null : reader.GetString(reader.GetOrdinal("schema_cache")),
            reader.IsDBNull(reader.GetOrdinal("schema_extracted_at")) ? null : reader.GetDateTime(reader.GetOrdinal("schema_extracted_at")),
            reader.GetDateTime(reader.GetOrdinal("created_at")),
            reader.GetBoolean(reader.GetOrdinal("is_active")));
    }

    public async Task DeleteConnectionAsync(Guid connectionId, string userId)
    {
        await DeleteConnectionAsync(connectionId, new[] { userId });
    }

    public async Task DeleteConnectionAsync(Guid connectionId, IReadOnlyCollection<string> userIds)
    {
        var (userFilter, parameters) = BuildUserIdsQuery("user_id IN ({0})", userIds);
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        var sql = $"UPDATE dbo.user_connections SET is_active = 0 WHERE id = @Id AND {userFilter}";
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@Id", connectionId);
        foreach (var parameter in parameters)
        {
            cmd.Parameters.AddWithValue(parameter.Key, parameter.Value);
        }
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task DeleteUserAccountAsync(string userId)
    {
        await DeleteUserAccountAsync(new[] { userId });
    }

    public async Task DeleteUserAccountAsync(IReadOnlyCollection<string> userIds)
    {
        await EnsureOrganizationSchemaAsync();

        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();

        var (turnsSql, parameters) = BuildUserIdsQuery("DELETE FROM dbo.conversation_turns WHERE user_id IN ({0});", userIds);
        var (sessionsSql, _) = BuildUserIdsQuery("DELETE FROM dbo.chat_sessions WHERE user_id IN ({0});", userIds);
        var (connectionsSql, __) = BuildUserIdsQuery("DELETE FROM dbo.user_connections WHERE user_id IN ({0});", userIds);
        var (organizationMembersSql, ___) = BuildUserIdsQuery("DELETE FROM dbo.organization_members WHERE user_id IN ({0});", userIds);
        var orphanOrganizationsSql = @"
DELETE FROM dbo.organizations
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.organization_members members
    WHERE members.organization_id = dbo.organizations.id
);";
        var sql = string.Join(
            Environment.NewLine,
            turnsSql,
            sessionsSql,
            connectionsSql,
            organizationMembersSql,
            orphanOrganizationsSql);

        await using var cmd = new SqlCommand(sql, conn);
        foreach (var parameter in parameters)
        {
            cmd.Parameters.AddWithValue(parameter.Key, parameter.Value);
        }
        await cmd.ExecuteNonQueryAsync();
    }

    // --- Organizations ---

    public async Task<Guid> CreateOrganizationAsync(OrganizationRecord org, string adminUserId)
    {
        await EnsureOrganizationSchemaAsync();

        var id = org.Id == Guid.Empty ? Guid.NewGuid() : org.Id;
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        
        await using var transaction = conn.BeginTransaction();
        try
        {
            const string sqlOrg = "INSERT INTO dbo.organizations (id, name, industry) VALUES (@Id, @Name, @Industry)";
            await using var cmdOrg = new SqlCommand(sqlOrg, conn, transaction);
            cmdOrg.Parameters.AddWithValue("@Id", id);
            cmdOrg.Parameters.AddWithValue("@Name", org.Name);
            cmdOrg.Parameters.AddWithValue("@Industry", (object?)org.Industry ?? DBNull.Value);
            await cmdOrg.ExecuteNonQueryAsync();

            const string sqlMember = "INSERT INTO dbo.organization_members (organization_id, user_id, role) VALUES (@OrgId, @UserId, 'Admin')";
            await using var cmdMember = new SqlCommand(sqlMember, conn, transaction);
            cmdMember.Parameters.AddWithValue("@OrgId", id);
            cmdMember.Parameters.AddWithValue("@UserId", adminUserId);
            await cmdMember.ExecuteNonQueryAsync();

            await transaction.CommitAsync();
            return id;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<List<OrganizationRecord>> GetOrganizationsByUserIdAsync(string userId)
    {
        return await GetOrganizationsByUserIdsAsync(new[] { userId });
    }

    public async Task<List<OrganizationRecord>> GetOrganizationsByUserIdsAsync(IReadOnlyCollection<string> userIds)
    {
        await EnsureOrganizationSchemaAsync();

        var (userFilter, parameters) = BuildUserIdsQuery("m.user_id IN ({0})", userIds);
        var sql = @"
            SELECT o.* FROM dbo.organizations o
            INNER JOIN dbo.organization_members m ON o.id = m.organization_id
            WHERE " + userFilter;
        
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        foreach (var parameter in parameters)
        {
            cmd.Parameters.AddWithValue(parameter.Key, parameter.Value);
        }
        
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<OrganizationRecord>();
        while (await reader.ReadAsync())
        {
            list.Add(new OrganizationRecord(
                reader.GetGuid(reader.GetOrdinal("id")),
                reader.GetString(reader.GetOrdinal("name")),
                reader.IsDBNull(reader.GetOrdinal("industry")) ? null : reader.GetString(reader.GetOrdinal("industry")),
                reader.GetDateTimeOffset(reader.GetOrdinal("created_at"))));
        }
        return list;
    }

    public async Task DeleteOrganizationAsync(Guid orgId, string userId)
    {
        await DeleteOrganizationAsync(orgId, new[] { userId });
    }

    public async Task DeleteOrganizationAsync(Guid orgId, IReadOnlyCollection<string> userIds)
    {
        await EnsureOrganizationSchemaAsync();

        var (adminFilter, parameters) = BuildUserIdsQuery(
            "user_id IN ({0}) AND organization_id = @OrgId AND role = 'Admin'",
            userIds);

        var sql = @"
            BEGIN TRANSACTION;
            DECLARE @IsAdmin BIT;
            SELECT @IsAdmin = 1 FROM dbo.organization_members WHERE " + adminFilter + @";
            
            IF @IsAdmin = 1
            BEGIN
                DELETE FROM dbo.organizations WHERE id = @OrgId;
            END
            COMMIT TRANSACTION;
        ";
        
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@OrgId", orgId);
        foreach (var parameter in parameters)
        {
            cmd.Parameters.AddWithValue(parameter.Key, parameter.Value);
        }
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<int> GetOrganizationCountAsync(string userId)
    {
        await EnsureOrganizationSchemaAsync();

        const string sql = @"
            SELECT COUNT(*) FROM dbo.organizations o
            INNER JOIN dbo.organization_members m ON o.id = m.organization_id
            WHERE m.user_id = @UserId";
        
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@UserId", userId);
        var count = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return count;
    }

    private static (string Sql, Dictionary<string, string> Parameters) BuildUserIdsQuery(string sqlTemplate, IReadOnlyCollection<string> userIds)
    {
        if (userIds == null || userIds.Count == 0)
        {
            throw new ArgumentException("At least one user identifier is required.", nameof(userIds));
        }

        var parameters = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var placeholders = new List<string>(userIds.Count);
        var index = 0;

        foreach (var userId in userIds.Where(value => !string.IsNullOrWhiteSpace(value)).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var parameterName = $"@UserId{index++}";
            placeholders.Add(parameterName);
            parameters[parameterName] = userId;
        }

        if (placeholders.Count == 0)
        {
            throw new ArgumentException("At least one non-empty user identifier is required.", nameof(userIds));
        }

        return (string.Format(sqlTemplate, string.Join(", ", placeholders)), parameters);
    }
}

