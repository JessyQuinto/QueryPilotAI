@{
    SubscriptionId = ''
    ResourceGroupName = 'rg-insightforge-dev1'
    Location = 'eastus2'
    CreateResourceGroupIfMissing = $true
    Prefix = 'ifdev1'

    Sql = @{
        AdminLogin = 'sqladminif'
        AdminPassword = ''
        SkuName = 'Basic'
    }

    Frontend = @{
        AppServiceSkuName = 'B1'
        AppServiceSkuTier = 'Basic'
        # Si se deja vacio, el script compone la authority con Auth.AuthorityHost + Auth.TenantId.
        Authority = ''
        # Admite plantillas como https://{WebAppHostname} o https://{Prefix}-web.azurewebsites.net.
        # Si se deja vacio, el script usa https://<web-app-hostname>.
        # Esa misma URL debe existir como Redirect URI en el App Registration configurado en Auth.ClientId.
        RedirectUri = 'https://{WebAppHostname}'
        # Si se deja vacio, el script reutiliza RedirectUri. Tambien admite {WebAppHostname} y {Prefix}.
        PostLogoutRedirectUri = 'https://{WebAppHostname}'
    }

    Auth = @{
        ClientId = ''
        TenantId = ''
        # Debe incluir la audiencia aceptada por el backend. Normalmente coincide con ClientId.
        AllowedAudiences = @()
        AuthorityHost = 'https://login.microsoftonline.com'
        # Si esta en true, la fase Configure sincroniza RedirectUri/PostLogoutRedirectUri en la seccion SPA del App Registration.
        AutoConfigureSpaRedirectUris = $true
    }

    Foundry = @{
        EnvironmentName = 'dev'
        ManageProject = $true
        ManageAgents = $true
        CreateResourceIfMissing = $true
        CreateProjectIfMissing = $true
        ResourceName = ''
        ProjectName = ''
        ResourceSkuName = 'S0'
        ModelDeploymentName = 'gpt-4o-mini'
        ModelName = 'gpt-4o-mini'
        ModelVersion = '2024-07-18'
        ModelFormat = 'OpenAI'
        ModelSkuName = 'Standard'
        ModelSkuCapacity = 10
        ProjectEndpoint = ''
        TenantId = ''
        # Referencias de agente en formato name:version (ej: insightforgesql:5)
        SqlPlannerAgentRef = ''
        ResultInterpreterAgentRef = ''
        ConciergeAgentRef = ''
        ProjectResourceId = ''
        # Rol a asignar a la identidad administrada de la Function para consumir Foundry.
        RoleDefinitionName = 'Azure AI User'
        # Habilita automaticamente la identidad administrada (system-assigned) de la Function.
        AutoConfigureFunctionIdentity = $true
        # Asigna automaticamente el rol indicado sobre Foundry (scope: ProjectResourceId o recurso deducido por endpoint).
        AutoAssignFunctionRole = $true
    }

    AzureOpenAI = @{
        DeploymentName = 'gpt-4o-mini'
    }

    Database = @{
        # Importa un BACPAC para disponer de una BD de pruebas adicional.
        ImportBacpac = $true
        BacpacFile = 'infra/dbs/Clinic.bacpac'
        ContainerName = 'bacpac'
        BacpacDatabaseName = 'ClinicDB'
        ServiceObjective = 'S0'
        ImportPollIntervalSeconds = 15
        ImportTimeoutMinutes = 90
    }
}