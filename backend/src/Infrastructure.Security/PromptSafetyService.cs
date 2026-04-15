using Core.Application.Contracts;

namespace Infrastructure.Security;

public interface IPromptSafetyService
{
    Task<PromptSafetyResult> AnalyzeAsync(string prompt, string role);
}

public sealed class PromptSafetyService : IPromptSafetyService
{
    public Task<PromptSafetyResult> AnalyzeAsync(string prompt, string role)
    {
        var blockedPatterns = new[]
        {
            "ignore previous instructions",
            "drop table",
            "show all passwords",
            "bypass policy"
        };

        var lower = prompt.ToLowerInvariant();
        var hit = blockedPatterns.FirstOrDefault(lower.Contains);
        return Task.FromResult(hit is null
            ? new PromptSafetyResult(true, "OK")
            : new PromptSafetyResult(false, $"Patrón bloqueado detectado: {hit}"));
    }
}
