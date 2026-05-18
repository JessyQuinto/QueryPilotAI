using Microsoft.Extensions.DependencyInjection;
using Infrastructure.AzureOpenAI.Plugins;
using Microsoft.SemanticKernel;

namespace Infrastructure.AzureOpenAI.Configuration;

public static class AzureOpenAiConfiguration
{
    public static IServiceCollection AddAzureOpenAiServices(this IServiceCollection services)
    {
        // Internal shared chat client
        services.AddHttpClient<IAzureOpenAiChatClient, AzureOpenAiChatClient>();

        // Application services
        services.AddSingleton<Core.Application.Contracts.ISummaryService, SummaryService>();
        services.AddSingleton<Core.Application.Contracts.ISqlGenerationService, SqlGenerationService>();
        services.AddSingleton<Core.Application.Contracts.IIntentService, IntentService>();

        // Register Foundry Agents Plugin (required dependency for Kernel)
        services.AddSingleton<FoundryAgentsPlugin>();

        // Build Kernel with Azure OpenAI Chat Completion
        services.AddTransient(serviceProvider =>
        {
            var configuration = serviceProvider.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
            var endpoint = configuration["AzureOpenAI__Endpoint"] 
                ?? throw new System.InvalidOperationException("AzureOpenAI__Endpoint configuration is required");
            var apiKey = configuration["AzureOpenAI__ApiKey"] 
                ?? throw new System.InvalidOperationException("AzureOpenAI__ApiKey configuration is required");
            var deploymentName = configuration["AzureOpenAI__Deployment"] ?? "gpt-4o-mini";

            var kernelBuilder = Kernel.CreateBuilder();

            kernelBuilder.AddAzureOpenAIChatCompletion(
                deploymentName: deploymentName,
                endpoint: endpoint,
                apiKey: apiKey,
                httpClient: serviceProvider.GetRequiredService<System.Net.Http.HttpClient>()
            );

            // Register Foundry Agents Plugin
            var plugin = serviceProvider.GetRequiredService<FoundryAgentsPlugin>();
            kernelBuilder.Plugins.AddFromObject(plugin, "FoundryAgents");

            return kernelBuilder.Build();
        });

        return services;
    }
}
