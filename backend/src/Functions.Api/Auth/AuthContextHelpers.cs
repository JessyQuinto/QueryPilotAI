using System.Security.Claims;
using Microsoft.Azure.Functions.Worker;

namespace Functions.Api.Auth;

internal static class AuthContextHelpers
{
    public static string? GetAuthenticatedUserId(FunctionContext context) =>
        context.Items.TryGetValue("UserId", out var userId) ? userId?.ToString() : null;

    public static IReadOnlyList<string> GetAuthenticatedUserAliases(FunctionContext context)
    {
        if (context.Items.TryGetValue("UserAliases", out var aliases) && aliases is IReadOnlyList<string> typedAliases)
        {
            return typedAliases;
        }

        var userId = GetAuthenticatedUserId(context);
        return string.IsNullOrWhiteSpace(userId)
            ? Array.Empty<string>()
            : new[] { userId };
    }

    public static IReadOnlyList<string> BuildUserAliases(ClaimsPrincipal principal)
    {
        var aliases = principal.Claims
            .Where(claim =>
                claim.Type == "oid" ||
                claim.Type == "sub" ||
                claim.Type == "http://schemas.microsoft.com/identity/claims/objectidentifier" ||
                claim.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")
            .Select(claim => claim.Value?.Trim())
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Cast<string>()
            .ToArray();

        return aliases;
    }

    public static string? GetCanonicalUserId(ClaimsPrincipal principal)
    {
        var objectId = principal.Claims.FirstOrDefault(claim =>
            claim.Type == "oid" ||
            claim.Type == "http://schemas.microsoft.com/identity/claims/objectidentifier")?.Value;

        if (!string.IsNullOrWhiteSpace(objectId))
        {
            return objectId;
        }

        return BuildUserAliases(principal).FirstOrDefault();
    }
}
