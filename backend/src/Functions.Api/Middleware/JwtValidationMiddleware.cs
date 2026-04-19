using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;
using System.Net;
using Microsoft.Azure.Functions.Worker.Http;
using Functions.Api.Auth;

namespace Functions.Api.Middleware;

public class JwtValidationMiddleware : IFunctionsWorkerMiddleware
{
    private readonly ILogger<JwtValidationMiddleware> _logger;
    private readonly IEntraTokenValidator _tokenValidator;

    public JwtValidationMiddleware(ILogger<JwtValidationMiddleware> logger, IEntraTokenValidator tokenValidator)
    {
        _logger = logger;
        _tokenValidator = tokenValidator;
    }

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        // DEV MODE: Skip JWT validation entirely
        var skipValidation = Environment.GetEnvironmentVariable("Auth__SkipValidation");
        if (string.Equals(skipValidation, "true", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("⚠️ Auth validation SKIPPED (Auth__SkipValidation=true). Do NOT use in production.");
            context.Items["UserId"] = "dev-user@local";
            context.Items["UserAliases"] = new List<string> { "dev-user@local" };
            await next(context);
            return;
        }

        var req = await context.GetHttpRequestDataAsync();
        
        if (req == null)
        {
            await next(context);
            return;
        }

        if (!req.Headers.TryGetValues("Authorization", out var authHeaders))
        {
            await RejectAsync(context, req, "Authorization header is required.");
            return;
        }

        var tokenStr = authHeaders.FirstOrDefault()?.Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(tokenStr))
        {
            await RejectAsync(context, req, "Bearer token is required.");
            return;
        }

        var principal = await _tokenValidator.ValidateAsync(tokenStr, context.CancellationToken);
        if (principal == null)
        {
            await RejectAsync(context, req, "Invalid bearer token.");
            return;
        }

        var userId = AuthContextHelpers.GetCanonicalUserId(principal);
        var userAliases = AuthContextHelpers.BuildUserAliases(principal);

        if (string.IsNullOrWhiteSpace(userId) || userAliases.Count == 0)
        {
            await RejectAsync(context, req, "Validated token is missing user identifier claims.");
            return;
        }

        context.Items["UserId"] = userId;
        context.Items["UserAliases"] = userAliases;
        context.Items["UserPrincipal"] = principal;

        await next(context);
    }

    private static async Task RejectAsync(FunctionContext context, HttpRequestData req, string message)
    {
        var response = req.CreateResponse(HttpStatusCode.Unauthorized);
        await response.WriteAsJsonAsync(new { error = message });
        context.GetInvocationResult().Value = response;
    }
}
