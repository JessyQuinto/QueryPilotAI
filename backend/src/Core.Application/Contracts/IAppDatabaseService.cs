using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Core.Application.Contracts;

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
    Task<bool> TestConnectionAsync(UserConnectionRecord connection);

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
