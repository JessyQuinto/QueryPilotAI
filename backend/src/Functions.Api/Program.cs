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
        services.AddHttpClient<Infrastructure.AzureOpenAI.IFoundryAgentClient, Infrastructure.AzureOpenAI.FoundryAgentClient>();

        // --- Semantic Kernel Integration ---
        services.AddSemanticKernelServices();
    })
    .Build();

host.Run();

