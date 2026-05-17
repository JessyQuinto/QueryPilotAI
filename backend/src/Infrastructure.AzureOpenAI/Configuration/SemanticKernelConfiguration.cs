using Microsoft.Extensions.DependencyInjection;
using Infrastructure.AzureOpenAI.Plugins;
using Microsoft.SemanticKernel;

namespace Infrastructure.AzureOpenAI.Configuration;

public static class SemanticKernelConfiguration
{
    /// <summary>
    /// Registers Semantic Kernel with Azure OpenAI chat completion and Foundry plugin.
    /// Reads configuration from environment variables (AzureOpenAI__Endpoint, AzureOpenAI__ApiKey, AzureOpenAI__Deployment).
    /// </summary>
    public static IServiceCollection AddSemanticKernelServices(this IServiceCollection services)
    {
        // Register Foundry Agents Plugin (required dependency for Kernel)
        services.AddSingleton<FoundryAgentsPlugin>();

        // Build Kernel with Azure OpenAI Chat Completion
        services.AddTransient(serviceProvider =>
        {
            var configuration = serviceProvider.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
            var endpoint = configuration["AzureOpenAI__Endpoint"] 
                ?? throw new InvalidOperationException("AzureOpenAI__Endpoint configuration is required");
            var apiKey = configuration["AzureOpenAI__ApiKey"] 
                ?? throw new InvalidOperationException("AzureOpenAI__ApiKey configuration is required");
            var deploymentName = configuration["AzureOpenAI__Deployment"] ?? "gpt-4o-mini";

            var kernelBuilder = Kernel.CreateBuilder();

            kernelBuilder.AddAzureOpenAIChatCompletion(
                deploymentName: deploymentName,
                endpoint: endpoint,
                apiKey: apiKey,
                httpClient: serviceProvider.GetRequiredService<HttpClient>()
            );

            // Register Foundry Agents Plugin
            var plugin = serviceProvider.GetRequiredService<FoundryAgentsPlugin>();
            kernelBuilder.Plugins.AddFromObject(plugin, "FoundryAgents");

            return kernelBuilder.Build();
        });

        return services;
    }
}
