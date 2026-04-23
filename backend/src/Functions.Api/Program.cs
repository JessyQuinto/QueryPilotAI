using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Functions.Api.Middleware;
using Infrastructure.AzureOpenAI.Configuration;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults(builder =>
    {
        builder.UseMiddleware<Functions.Api.Middleware.JwtValidationMiddleware>();
    })
    .ConfigureServices(services =>
    {
        services
            .AddApplicationInsightsTelemetryWorkerService()
            .ConfigureFunctionsApplicationInsights();

        services.AddLogging();
        services.AddHttpClient();
        services.AddDataProtection();
        services.AddSingleton<IEntraTokenValidator, MicrosoftEntraTokenValidator>();

        // --- Core ---
        services.AddSingleton<Core.Application.Services.IClock, Core.Application.Services.SystemClock>();
        services.AddSingleton<Core.Domain.Policies.ISqlPolicyEngine, Infrastructure.Security.SqlPolicyEngine>();

        // --- Database Services ---
        services.AddSingleton<Infrastructure.Sql.ISqlExecutionService, Infrastructure.Sql.SqlExecutionService>();
        services.AddSingleton<Infrastructure.Sql.IConnectionSecretProtector, Infrastructure.Sql.ConnectionSecretProtector>();
        services.AddSingleton<Infrastructure.Sql.IAppDatabaseService, Infrastructure.Sql.AppDatabaseService>();
        services.AddSingleton<Infrastructure.Sql.ISchemaExtractorService, Infrastructure.Sql.SchemaExtractorService>();

        // --- Security ---
        services.AddSingleton<Infrastructure.Security.IPromptSafetyService, Infrastructure.Security.PromptSafetyService>();
        services.AddSingleton<Core.Domain.Policies.ISqlRewriterService, Infrastructure.Security.SqlRewriterService>();
        services.AddSingleton<Core.Domain.Policies.IBiasDetectorService, Infrastructure.Security.BiasDetectorService>();

        // --- Foundry Agent Client ---
        var projectEndpoint = Environment.GetEnvironmentVariable("FoundryAgent__ProjectEndpoint")
            ?? throw new InvalidOperationException("FoundryAgent__ProjectEndpoint is required.");
        var sqlPlannerAgentReference = Environment.GetEnvironmentVariable("FoundryAgent__SqlPlannerAgentRef")
            ?? throw new InvalidOperationException("FoundryAgent__SqlPlannerAgentRef is required.");
        var resultInterpreterAgentReference = Environment.GetEnvironmentVariable("FoundryAgent__ResultInterpreterAgentRef")
            ?? throw new InvalidOperationException("FoundryAgent__ResultInterpreterAgentRef is required.");
        var conciergeAgentReference = Environment.GetEnvironmentVariable("FoundryAgent__ConciergeAgentRef")
            ?? throw new InvalidOperationException("FoundryAgent__ConciergeAgentRef is required.");
        var foundryApiKey = Environment.GetEnvironmentVariable("AzureOpenAI__ApiKey"); // optional: use key auth for local dev
        var foundryTenantId = Environment.GetEnvironmentVariable("FoundryAgent__TenantId");

        services.AddSingleton<Infrastructure.AzureOpenAI.IFoundryAgentClient>(
            sp => new Infrastructure.AzureOpenAI.FoundryAgentClient(
                projectEndpoint,
                sqlPlannerAgentReference,
                resultInterpreterAgentReference,
                conciergeAgentReference,
                sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<Infrastructure.AzureOpenAI.FoundryAgentClient>>(),
                foundryApiKey,
                foundryTenantId));

        // --- Semantic Kernel Integration ---
        // Variables de entorno cargadas por el host de Azure Functions
        services.AddSemanticKernelServices();

        // Register advanced patterns example (optional; for demonstration)
        services.AddTransient<Infrastructure.AzureOpenAI.Examples.AdvancedSemanticKernelPatterns>();
    })
    .Build();

host.Run();
