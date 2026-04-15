using Core.Application.Contracts;
using System.Collections.Concurrent;

namespace Infrastructure.AzureOpenAI;

public interface IConversationMemoryService
{
    Task<List<ConversationTurn>> GetRecentTurnsAsync(string userId, string? sessionId, int maxTurns);
    Task AppendTurnAsync(ConversationTurnUpsert turn);
}

public sealed class ConversationMemoryService : IConversationMemoryService
{
    private const int MaxTurnsPerSession = 20;
    private readonly ConcurrentDictionary<string, ConcurrentQueue<ConversationTurn>> _memory = new(StringComparer.OrdinalIgnoreCase);

    public Task<List<ConversationTurn>> GetRecentTurnsAsync(string userId, string? sessionId, int maxTurns)
    {
        var key = BuildSessionKey(userId, sessionId);
        if (!_memory.TryGetValue(key, out var queue))
        {
            return Task.FromResult(new List<ConversationTurn>());
        }

        var turns = queue.ToArray().TakeLast(Math.Max(maxTurns, 1)).ToList();
        return Task.FromResult(turns);
    }

    public Task AppendTurnAsync(ConversationTurnUpsert turn)
    {
        var key = BuildSessionKey(turn.UserId, turn.SessionId);
        var queue = _memory.GetOrAdd(key, _ => new ConcurrentQueue<ConversationTurn>());

        queue.Enqueue(new ConversationTurn(
            turn.Question,
            turn.ExecutiveSummary,
            turn.Sql,
            turn.IntentType,
            turn.Metric,
            turn.Timestamp));

        while (queue.Count > MaxTurnsPerSession)
        {
            queue.TryDequeue(out _);
        }

        return Task.CompletedTask;
    }

    private static string BuildSessionKey(string userId, string? sessionId)
    {
        if (!string.IsNullOrWhiteSpace(sessionId))
        {
            return $"session:{sessionId.Trim()}";
        }

        return $"user:{userId.Trim()}";
    }
}
