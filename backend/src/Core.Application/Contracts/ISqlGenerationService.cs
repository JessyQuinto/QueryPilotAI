using System.Threading.Tasks;

namespace Core.Application.Contracts;

public interface ISqlGenerationService
{
    Task<string> GenerateSqlAsync(AnalyticalIntent intent);
}
