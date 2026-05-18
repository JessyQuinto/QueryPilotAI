using Azure.Core;
using Azure.Identity;
using Microsoft.Extensions.Configuration;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Infrastructure.AzureOpenAI;

public interface IAzureOpenAiChatClient
{
    Task<string?> CompleteAsync(
        string systemPrompt,
        string userPrompt,
        bool jsonResponse,
        int maxTokens,
        double temperature);
}

public sealed class AzureOpenAiChatClient : IAzureOpenAiChatClient
{
    private const string TokenScope = "https://cognitiveservices.azure.com/.default";
    private const string ApiVersion = "2024-10-21";

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    
    private static readonly TokenCredential Credential = new DefaultAzureCredential();
    private static readonly SemaphoreSlim TokenSemaphore = new(1, 1);
    private static AccessToken _cachedToken;

    public AzureOpenAiChatClient(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task<string?> CompleteAsync(
        string systemPrompt,
        string userPrompt,
        bool jsonResponse,
        int maxTokens,
        double temperature)
    {
        var endpoint = _configuration["AzureOpenAI__Endpoint"];
        var deployment = _configuration["AzureOpenAI__Deployment"];

        if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(deployment))
        {
            return null;
        }

        var requestUri = BuildChatCompletionsUri(endpoint, deployment);
        var payload = BuildPayload(systemPrompt, userPrompt, jsonResponse, maxTokens, temperature);
        var json = JsonSerializer.Serialize(payload, JsonDefaults.Options);

        using var request = new HttpRequestMessage(HttpMethod.Post, requestUri)
        {
            Content = new StringContent(json, new System.Net.Http.Headers.MediaTypeHeaderValue("application/json"))
        };

        var apiKey = _configuration["AzureOpenAI__ApiKey"];
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            request.Headers.Add("api-key", apiKey);
        }
        else
        {
            var token = await GetAccessTokenAsync();
            if (string.IsNullOrWhiteSpace(token))
            {
                return null;
            }

            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        }

        using var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        var responseText = await response.Content.ReadAsStringAsync();
        return TryExtractContent(responseText);
    }

    private static Uri BuildChatCompletionsUri(string endpoint, string deployment)
    {
        var trimmedEndpoint = endpoint.Trim().TrimEnd('/');
        var encodedDeployment = Uri.EscapeDataString(deployment.Trim());
        var url = $"{trimmedEndpoint}/openai/deployments/{encodedDeployment}/chat/completions?api-version={ApiVersion}";
        return new Uri(url, UriKind.Absolute);
    }

    private static object BuildPayload(string systemPrompt, string userPrompt, bool jsonResponse, int maxTokens, double temperature)
    {
        return new
        {
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            },
            temperature,
            max_tokens = maxTokens,
            response_format = jsonResponse ? new { type = "json_object" } : null
        };
    }

    private static async Task<string?> GetAccessTokenAsync()
    {
        if (_cachedToken.ExpiresOn > System.DateTimeOffset.UtcNow.AddMinutes(2))
        {
            return _cachedToken.Token;
        }

        await TokenSemaphore.WaitAsync();
        try
        {
            if (_cachedToken.ExpiresOn > System.DateTimeOffset.UtcNow.AddMinutes(2))
            {
                return _cachedToken.Token;
            }

            _cachedToken = await Credential.GetTokenAsync(new TokenRequestContext([TokenScope]), CancellationToken.None);
            return _cachedToken.Token;
        }
        catch
        {
            return null;
        }
        finally
        {
            TokenSemaphore.Release();
        }
    }

    private static string? TryExtractContent(string responseText)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseText);

            if (!doc.RootElement.TryGetProperty("choices", out var choices) || choices.GetArrayLength() == 0)
            {
                return null;
            }

            var message = choices[0].GetProperty("message");
            if (!message.TryGetProperty("content", out var contentElement))
            {
                return null;
            }

            if (contentElement.ValueKind == JsonValueKind.String)
            {
                return contentElement.GetString();
            }

            if (contentElement.ValueKind == JsonValueKind.Array)
            {
                var parts = System.Linq.Enumerable.Where(contentElement.EnumerateArray(), e => e.TryGetProperty("type", out var type) && type.GetString() == "text")
                    .Select(e => e.TryGetProperty("text", out var text) ? text.GetString() : null)
                    .Where(s => !string.IsNullOrWhiteSpace(s));

                return string.Join("\n", parts!);
            }

            return null;
        }
        catch
        {
            return null;
        }
    }
}
