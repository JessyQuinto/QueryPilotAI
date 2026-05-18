using System.Threading.Tasks;

namespace Core.Application.Contracts;

public interface IPromptSafetyService
{
    Task<PromptSafetyResult> AnalyzeAsync(string prompt, string role);
}
