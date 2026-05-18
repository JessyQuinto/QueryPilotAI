using System.Collections.Generic;
using System.Threading.Tasks;

namespace Core.Application.Contracts;

public interface IIntentService
{
    Task<AnalyticalIntent> ParseIntentAsync(QueryRequest request, List<ConversationTurn> conversationContext);
}
