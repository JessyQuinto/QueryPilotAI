using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace Functions.Api.Middleware;

public interface IEntraTokenValidator
{
    Task<ClaimsPrincipal?> ValidateAsync(string token, CancellationToken cancellationToken);
}

public sealed class MicrosoftEntraTokenValidator : IEntraTokenValidator
{
    private readonly ILogger<MicrosoftEntraTokenValidator> _logger;
    private readonly string _authorityHost;
    private readonly string[] _validAudiences;
    private readonly ConcurrentDictionary<string, ConfigurationManager<OpenIdConnectConfiguration>> _configManagers = new(StringComparer.OrdinalIgnoreCase);

    public MicrosoftEntraTokenValidator(IConfiguration configuration, ILogger<MicrosoftEntraTokenValidator> logger)
    {
        _logger = logger;
        _authorityHost = (configuration["Auth__AuthorityHost"] ?? "https://login.microsoftonline.com").TrimEnd('/');

        var configuredAudiences = configuration["Auth__AllowedAudiences"]
            ?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            ?? Array.Empty<string>();

        var defaultAudience = configuration["Auth__ClientId"]
            ?? configuration["AzureAd__ClientId"];

        _validAudiences = configuredAudiences
            .Append(defaultAudience)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .SelectMany(value => ExpandAudienceAliases(value!))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public async Task<ClaimsPrincipal?> ValidateAsync(string token, CancellationToken cancellationToken)
    {
        var handler = new JwtSecurityTokenHandler();
        if (!handler.CanReadToken(token))
        {
            return null;
        }

        JwtSecurityToken unvalidatedToken;
        try
        {
            unvalidatedToken = handler.ReadJwtToken(token);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read JWT token.");
            return null;
        }

        var tenantId = unvalidatedToken.Claims.FirstOrDefault(claim => claim.Type == "tid")?.Value;
        if (string.IsNullOrWhiteSpace(tenantId))
        {
            _logger.LogWarning("JWT token missing 'tid' claim.");
            return null;
        }

        var configManager = _configManagers.GetOrAdd(tenantId, static (tid, authorityHost) =>
        {
            var metadataAddress = $"{authorityHost}/{tid}/v2.0/.well-known/openid-configuration";
            return new ConfigurationManager<OpenIdConnectConfiguration>(
                metadataAddress,
                new OpenIdConnectConfigurationRetriever());
        }, _authorityHost);

        OpenIdConnectConfiguration oidcConfig;
        try
        {
            oidcConfig = await configManager.GetConfigurationAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve OpenID configuration for tenant {TenantId}.", tenantId);
            return null;
        }

        var validationParameters = new TokenValidationParameters
        {
            RequireSignedTokens = true,
            RequireExpirationTime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = oidcConfig.SigningKeys,
            ValidateIssuer = false,        // Personal MS accounts use different issuers
            ValidateAudience = _validAudiences.Length > 0,
            ValidAudiences = _validAudiences,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };

        try
        {
            return handler.ValidateToken(token, validationParameters, out _);
        }
        catch (SecurityTokenException ex)
        {
            _logger.LogWarning(ex, "JWT token validation failed for tenant {TenantId}.", tenantId);
            return null;
        }
    }

    private static IEnumerable<string> ExpandAudienceAliases(string audience)
    {
        yield return audience;

        if (Guid.TryParse(audience, out _))
        {
            yield return $"api://{audience}";
        }
    }
}
