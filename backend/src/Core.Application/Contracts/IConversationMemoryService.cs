namespace Core.Application.Contracts;

public interface IConversationMemoryService
{
    Task<List<ConversationTurn>> GetRecentTurnsAsync(string userId, string? sessionId, int maxTurns);
    Task AppendTurnAsync(ConversationTurnUpsert turn);
}
