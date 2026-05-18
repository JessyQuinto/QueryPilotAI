using System.Collections.Generic;
using System.Threading.Tasks;

namespace Core.Application.Contracts;

public interface ISummaryService
{
    Task<string> SummarizeAsync(string question, string sql, List<Dictionary<string, object?>> rows);
}
