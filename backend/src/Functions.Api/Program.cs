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
        services.AddSingleton<Core.Application.Contracts.ISqlExecutionService, Infrastructure.Sql.SqlExecutionService>();
        services.AddSingleton<Core.Application.Contracts.IConnectionSecretProtector, Infrastructure.Sql.ConnectionSecretProtector>();
        services.AddSingleton<Core.Application.Contracts.IAppDatabaseService, Infrastructure.Sql.AppDatabaseService>();
        services.AddSingleton<Core.Application.Contracts.ISchemaExtractorService, Infrastructure.Sql.SchemaExtractorService>();

        // --- Security ---
        services.AddSingleton<Core.Application.Contracts.IPromptSafetyService, Infrastructure.Security.PromptSafetyService>();
        services.AddSingleton<Core.Domain.Policies.ISqlRewriterService, Infrastructure.Security.SqlRewriterService>();
        services.AddSingleton<Core.Domain.Policies.IBiasDetectorService, Infrastructure.Security.BiasDetectorService>();

        // --- Foundry Agent Client (IOptions + IHttpClientFactory) ---
        services.Configure<FoundryAgentOptions>(opts =>
        {
            opts.ProjectEndpoint = Environment.GetEnvironmentVariable("FoundryAgent__ProjectEndpoint") ?? string.Empty;
            opts.SqlPlannerAgentRef = Environment.GetEnvironmentVariable("FoundryAgent__SqlPlannerAgentRef") ?? string.Empty;
            opts.SqlPlannerAgentId = Environment.GetEnvironmentVariable("FoundryAgent__SqlPlannerAgentId") ?? string.Empty;
            opts.ResultInterpreterAgentRef = Environment.GetEnvironmentVariable("FoundryAgent__ResultInterpreterAgentRef") ?? string.Empty;
            opts.ResultInterpreterAgentId = Environment.GetEnvironmentVariable("FoundryAgent__ResultInterpreterAgentId") ?? string.Empty;
            opts.ConciergeAgentRef = Environment.GetEnvironmentVariable("FoundryAgent__ConciergeAgentRef") ?? string.Empty;
            opts.ConciergeAgentId = Environment.GetEnvironmentVariable("FoundryAgent__ConciergeAgentId") ?? string.Empty;
            opts.TenantId = Environment.GetEnvironmentVariable("FoundryAgent__TenantId");
        });

        // HttpClient lifecycle managed by the framework — prevents socket exhaustion
        services.AddHttpClient<Core.Application.Contracts.IFoundryAgentClient, Infrastructure.AzureOpenAI.FoundryAgentClient>();

        // --- Azure OpenAI & Semantic Kernel Integration ---
        services.AddAzureOpenAiServices();
    })
    .Build();

host.Run();

