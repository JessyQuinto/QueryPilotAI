param(
    [string]$ConfigPath = (Join-Path $PSScriptRoot 'Deploy.Configuration.psd1'),
    [ValidateSet('Preflight', 'Provision', 'Foundry', 'Configure', 'Database', 'DeployApi', 'DeployWeb', 'Verify')]
    [string]$ResumeFrom = 'Preflight'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$stateDir = Join-Path $PSScriptRoot '.state'
$artifactsDir = Join-Path $PSScriptRoot 'artifacts'
$statePath = Join-Path $stateDir 'deployment-state.json'
$outputsPath = Join-Path $stateDir 'infra-outputs.json'
$foundryOutputsPath = Join-Path $stateDir 'foundry-outputs.json'
$phaseOrder = @('Preflight', 'Provision', 'Foundry', 'Configure', 'Database', 'DeployApi', 'DeployWeb', 'Verify')

if (-not (Test-Path $stateDir)) {
    New-Item -ItemType Directory -Path $stateDir | Out-Null
}

if (-not (Test-Path $artifactsDir)) {
    New-Item -ItemType Directory -Path $artifactsDir | Out-Null
}

function Write-Phase {
    param([string]$Name, [string]$Message)
    Write-Host "[$Name] $Message" -ForegroundColor Cyan
}

function Write-Info {
    param([string]$Message)
    Write-Host "[deploy] $Message"
}

function Write-WarnLine {
    param([string]$Message)
    Write-Host "[warn] $Message" -ForegroundColor Yellow
}

function Show-DeploymentProgress {
    param(
        [int]$PhaseIndex,
        [int]$PhaseTotal,
        [string]$PhaseName,
        [string]$Message,
        [switch]$Completed
    )

    $safeTotal = if ($PhaseTotal -lt 1) { 1 } else { $PhaseTotal }
    $effectiveIndex = if ($Completed) { $PhaseIndex + 1 } else { $PhaseIndex }
    $percent = [Math]::Min(100, [Math]::Max(0, [int](($effectiveIndex * 100) / $safeTotal)))
    $currentStep = [Math]::Min($safeTotal, $PhaseIndex + 1)

    $status = "Paso $currentStep/$safeTotal - $PhaseName"
    if (-not [string]::IsNullOrWhiteSpace($Message)) {
        $status = "$status | $Message"
    }

    Write-Progress -Id 1 -Activity 'Despliegue InsightForge' -Status $status -PercentComplete $percent
}

function Complete-DeploymentProgress {
    Write-Progress -Id 1 -Activity 'Despliegue InsightForge' -Completed
}

function Save-State {
    param(
        [string]$CurrentPhase,
        [string[]]$CompletedPhases,
        [string]$Status,
        [string]$Message
    )

    @{
        currentPhase = $CurrentPhase
        completedPhases = $CompletedPhases
        status = $Status
        message = $Message
        updatedAtUtc = [DateTime]::UtcNow.ToString('o')
    } | ConvertTo-Json -Depth 5 | Set-Content -Path $statePath
}

function Require-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' is not installed or not available in PATH."
    }
}

function Resolve-RequiredValue {
    param(
        [string]$Value,
        [string]$Prompt,
        [string]$PropertyName,
        [switch]$Secret
    )

    if (-not [string]::IsNullOrWhiteSpace($Value)) {
        return $Value
    }

    if ($Secret) {
        $secure = Read-Host -Prompt $Prompt -AsSecureString
        $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        try {
            $resolved = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        }
        finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    }
    else {
        $resolved = Read-Host -Prompt $Prompt
    }

    if ([string]::IsNullOrWhiteSpace($resolved)) {
        throw "Value for '$PropertyName' is required."
    }

    return $resolved
}

function Resolve-ConfigValue {
    param(
        [string]$Value,
        [string]$Prompt,
        [string]$PropertyName,
        [string]$DefaultValue,
        [switch]$Secret
    )

    if (-not [string]::IsNullOrWhiteSpace($Value)) {
        return $Value
    }

    $promptSuffix = if ([string]::IsNullOrWhiteSpace($DefaultValue)) { '' } else { " [$DefaultValue]" }

    if ($Secret) {
        $secure = Read-Host -Prompt "$Prompt$promptSuffix" -AsSecureString
        $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        try {
            $resolved = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        }
        finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    }
    else {
        $resolved = Read-Host -Prompt "$Prompt$promptSuffix"
    }

    if ([string]::IsNullOrWhiteSpace($resolved)) {
        $resolved = $DefaultValue
    }

    if ([string]::IsNullOrWhiteSpace($resolved)) {
        throw "Value for '$PropertyName' is required."
    }

    return $resolved
}

function New-DeploymentConfigDefaults {
    return @{
        Location = 'eastus2'
        Prefix = 'ifdev2'
        WorkloadName = 'insightforge'
        EnvironmentName = 'dev'
        Instance = ''
        ResourceGroupName = 'rg-insightforge-dev'
        SqlAdminLogin = 'sqladminif'
        SqlAdminPassword = 'IfDev_2026!Deploy#01'
    }
}

function New-DeploymentConfigSkeleton {
    return @{
        SubscriptionId = ''
        ResourceGroupName = ''
        Location = ''
        CreateResourceGroupIfMissing = $true
        Prefix = ''
        WorkloadName = 'insightforge'
        EnvironmentName = 'dev'
        Instance = ''
        Sql = @{
            AdminLogin = ''
            AdminPassword = ''
            SkuName = 'Basic'
            SkuTier = 'Basic'
            PublicNetworkAccess = $true
            AllowAzureServices = $true
        }
        Frontend = @{
            AppServiceSkuName = 'B1'
            AppServiceSkuTier = 'Basic'
            LinuxFxVersion = 'NODE|20-lts'
            Authority = ''
            RedirectUri = ''
            PostLogoutRedirectUri = ''
        }
        Auth = @{
            ClientId = ''
            TenantId = ''
            AllowedAudiences = @()
            AuthorityHost = 'https://login.microsoftonline.com'
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
            SqlPlannerAgentRef = ''
            ResultInterpreterAgentRef = ''
            ConciergeAgentRef = ''
            ProjectResourceId = ''
            RoleDefinitionName = 'Azure AI User'
            AutoConfigureFunctionIdentity = $true
            AutoAssignFunctionRole = $true
        }
        AzureOpenAI = @{
            DeploymentName = 'gpt-4o-mini'
            ModelName = 'gpt-4o-mini'
            ModelVersion = '2024-07-18'
            Capacity = 10
        }
        Functions = @{
            ExtensionVersion = '~4'
        }
        Database = @{
            ImportBacpac = $false
            BacpacFile = 'infra/dbs/Clinic.bacpac'
            ContainerName = 'bacpac'
            BacpacDatabaseName = 'ClinicDB'
            ServiceObjective = 'S0'
            ImportPollIntervalSeconds = 15
            ImportTimeoutMinutes = 90
        }
    }
}

function Get-OutputValue {
    param(
        [object]$Outputs,
        [string]$Name,
        [switch]$Required
    )

    if ($null -eq $Outputs -or -not ($Outputs.PSObject.Properties.Name -contains $Name)) {
        if ($Required) {
            throw "Deployment output '$Name' was not found."
        }

        return $null
    }

    $entry = $Outputs.$Name
    if ($null -eq $entry) {
        if ($Required) {
            throw "Deployment output '$Name' is null."
        }

        return $null
    }

    if ($entry -is [string]) {
        return $entry
    }

    if ($entry.PSObject.Properties.Name -contains 'value') {
        return $entry.value
    }

    return $entry
}

function Resolve-InfrastructureContext {
    param(
        [object]$Outputs,
        [string]$ResourceGroupName
    )

    $functionAppName = Get-OutputValue -Outputs $Outputs -Name 'functionAppName' -Required
    $webAppName = Get-OutputValue -Outputs $Outputs -Name 'webAppName' -Required
    $sqlServerName = Get-OutputValue -Outputs $Outputs -Name 'sqlServerName' -Required
    $sqlDatabaseName = Get-OutputValue -Outputs $Outputs -Name 'sqlDatabaseName' -Required
    $storageAccountName = Get-OutputValue -Outputs $Outputs -Name 'storageAccountName'
    $openAiName = Get-OutputValue -Outputs $Outputs -Name 'openAiName' -Required
    $contentSafetyName = Get-OutputValue -Outputs $Outputs -Name 'contentSafetyName' -Required
    $keyVaultName = Get-OutputValue -Outputs $Outputs -Name 'keyVaultName' -Required

    $functionAppHostname = Invoke-AzCli -Arguments @('functionapp', 'show', '--resource-group', $ResourceGroupName, '--name', $functionAppName, '--query', 'defaultHostName', '-o', 'tsv')
    $functionAppPrincipalId = Invoke-AzCli -Arguments @('functionapp', 'show', '--resource-group', $ResourceGroupName, '--name', $functionAppName, '--query', 'identity.principalId', '-o', 'tsv')
    $webAppHostname = Invoke-AzCli -Arguments @('webapp', 'show', '--resource-group', $ResourceGroupName, '--name', $webAppName, '--query', 'defaultHostName', '-o', 'tsv')

    $sqlServerFqdn = Invoke-AzCli -Arguments @('sql', 'server', 'show', '--resource-group', $ResourceGroupName, '--name', $sqlServerName, '--query', 'fullyQualifiedDomainName', '-o', 'tsv')
    if ([string]::IsNullOrWhiteSpace($sqlServerFqdn)) {
        $sqlServerFqdn = "$sqlServerName.database.windows.net"
    }

    $openAiEndpoint = Invoke-AzCli -Arguments @('cognitiveservices', 'account', 'show', '--resource-group', $ResourceGroupName, '--name', $openAiName, '--query', 'properties.endpoint', '-o', 'tsv')
    $contentSafetyEndpoint = Invoke-AzCli -Arguments @('cognitiveservices', 'account', 'show', '--resource-group', $ResourceGroupName, '--name', $contentSafetyName, '--query', 'properties.endpoint', '-o', 'tsv')

    $appInsightsConnectionString = Get-OutputValue -Outputs $Outputs -Name 'appInsightsConnectionString'
    if ([string]::IsNullOrWhiteSpace($appInsightsConnectionString)) {
        $appInsightsName = Get-OutputValue -Outputs $Outputs -Name 'appInsightsName'
        if (-not [string]::IsNullOrWhiteSpace($appInsightsName)) {
            $appInsightsConnectionString = Try-Invoke-AzCli -Arguments @('monitor', 'app-insights', 'component', 'show', '--resource-group', $ResourceGroupName, '--app', $appInsightsName, '--query', 'connectionString', '-o', 'tsv')
        }
    }

    if ([string]::IsNullOrWhiteSpace($appInsightsConnectionString)) {
        $appInsightsConnectionString = Try-Invoke-AzCli -Arguments @('monitor', 'app-insights', 'component', 'list', '--resource-group', $ResourceGroupName, '--query', '[0].connectionString', '-o', 'tsv')
    }

    $analyticsDbName = Get-OutputValue -Outputs $Outputs -Name 'analyticsDatabaseName'
    if ([string]::IsNullOrWhiteSpace($analyticsDbName)) {
        $analyticsDbName = $sqlDatabaseName
    }

    $appDbName = Get-OutputValue -Outputs $Outputs -Name 'appDatabaseName'
    if ([string]::IsNullOrWhiteSpace($appDbName)) {
        $appDbName = $sqlDatabaseName
    }

    return [PSCustomObject]@{
        functionAppName = $functionAppName
        functionAppHostname = $functionAppHostname
        functionAppPrincipalId = $functionAppPrincipalId
        webAppName = $webAppName
        webAppHostname = $webAppHostname
        sqlServerName = $sqlServerName
        sqlServerFqdn = $sqlServerFqdn
        storageAccountName = $storageAccountName
        analyticsDbName = $analyticsDbName
        appDbName = $appDbName
        openAiName = $openAiName
        openAiEndpoint = $openAiEndpoint
        contentSafetyEndpoint = $contentSafetyEndpoint
        appInsightsConnectionString = $appInsightsConnectionString
        keyVaultName = $keyVaultName
    }
}

function Build-AuthorityUrl {
    param(
        [string]$AuthorityHost,
        [string]$TenantId
    )

    $normalizedHost = $AuthorityHost.Trim().TrimEnd('/')
    $normalizedTenantId = $TenantId.Trim().Trim('/').Trim()

    if ([string]::IsNullOrWhiteSpace($normalizedHost) -or [string]::IsNullOrWhiteSpace($normalizedTenantId)) {
        throw 'Both authority host and tenant id are required to build the frontend authority URL.'
    }

    return "$normalizedHost/$normalizedTenantId"
}

function Ensure-SpaRedirectUris {
    param(
        [string]$ClientId,
        [string[]]$RequiredUris
    )

    if ([string]::IsNullOrWhiteSpace($ClientId)) {
        return
    }

    $normalizedRequired = @($RequiredUris | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { $_.Trim() } | Select-Object -Unique)
    if ($normalizedRequired.Count -eq 0) {
        return
    }

    $appRegistration = Try-Invoke-AzCli -ExpectJson -Arguments @(
        'ad', 'app', 'show',
        '--id', $ClientId,
        '-o', 'json'
    )

    if ($null -eq $appRegistration) {
        throw "Could not read Entra app registration '$ClientId'."
    }

    $appObjectId = [string](Get-OptionalPropertyValue -Object $appRegistration -PropertyName 'id')
    if ([string]::IsNullOrWhiteSpace($appObjectId)) {
        throw "Could not resolve the object id for Entra app registration '$ClientId'."
    }

    $existingSpaUris = @(
        @(Get-NestedOptionalPropertyValue -Object $appRegistration -Path 'spa.redirectUris') |
        ForEach-Object { [string]$_ } |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )

    $existingWebUris = @(
        @(Get-NestedOptionalPropertyValue -Object $appRegistration -Path 'web.redirectUris') |
        ForEach-Object { [string]$_ } |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )

    $mergedSpaUris = @($existingSpaUris + $normalizedRequired | Select-Object -Unique)
    $filteredWebUris = @($existingWebUris | Where-Object { $normalizedRequired -notcontains $_ } | Select-Object -Unique)

    $spaChanged = $mergedSpaUris.Count -ne $existingSpaUris.Count -or @($mergedSpaUris | Where-Object { $existingSpaUris -notcontains $_ }).Count -gt 0
    $webChanged = $filteredWebUris.Count -ne $existingWebUris.Count

    if (-not $spaChanged -and -not $webChanged) {
        Write-Info 'SPA redirect URIs already up to date in Entra app registration.'
        return
    }

    $payload = @{
        spa = @{
            redirectUris = $mergedSpaUris
        }
        web = @{
            redirectUris = $filteredWebUris
        }
    } | ConvertTo-Json -Depth 6 -Compress

    Write-Info 'Updating SPA redirect URIs in Entra app registration and removing overlapping Web redirect URIs.'
    $payloadFile = [System.IO.Path]::GetTempFileName()

    try {
        Set-Content -Path $payloadFile -Value $payload -Encoding UTF8
        Invoke-AzCli -Arguments @(
            'rest',
            '--method', 'patch',
            '--url', "https://graph.microsoft.com/v1.0/applications/$appObjectId",
            '--headers', 'Content-Type=application/json',
            '--body', "@$payloadFile",
            '-o', 'none'
        ) | Out-Null
    }
    finally {
        if (Test-Path -LiteralPath $payloadFile) {
            Remove-Item -LiteralPath $payloadFile -Force -ErrorAction SilentlyContinue
        }
    }
}

function Resolve-TemplateValue {
    param(
        [string]$Value,
        [hashtable]$Tokens
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $Value
    }

    $resolved = $Value
    foreach ($entry in $Tokens.GetEnumerator()) {
        $resolved = $resolved.Replace("{$($entry.Key)}", [string]$entry.Value)
    }

    return $resolved
}

function Get-DeletedCognitiveAccountResourceId {
    param(
        [string]$SubscriptionId,
        [string]$Location,
        [string]$ResourceGroupName,
        [string]$AccountName
    )

    return "/subscriptions/$SubscriptionId/providers/Microsoft.CognitiveServices/locations/$Location/resourceGroups/$ResourceGroupName/deletedAccounts/$AccountName"
}

function Test-SoftDeletedCognitiveAccount {
    param(
        [string]$SubscriptionId,
        [string]$ResourceGroupName,
        [string]$Location,
        [string]$AccountName
    )

    $deletedResourceId = Get-DeletedCognitiveAccountResourceId -SubscriptionId $SubscriptionId -Location $Location -ResourceGroupName $ResourceGroupName -AccountName $AccountName
    $deletedAccount = Try-Invoke-AzCli -ExpectJson -Arguments @('resource', 'show', '--ids', $deletedResourceId, '--api-version', '2021-04-30', '-o', 'json')

    if ($null -eq $deletedAccount) {
        return $false
    }

    return $true
}

function Invoke-AzCli {
    param(
        [string[]]$Arguments,
        [switch]$ExpectJson
    )

    $output = & az @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Azure CLI command failed: az $($Arguments -join ' ')"
    }

    if ($ExpectJson) {
        return ($output | Out-String | ConvertFrom-Json)
    }

    return ($output | Out-String).Trim()
}

function Try-Invoke-AzCli {
    param(
        [string[]]$Arguments,
        [switch]$ExpectJson
    )

    $output = & az @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) {
        return $null
    }

    if ($ExpectJson) {
        return ($output | Out-String | ConvertFrom-Json)
    }

    return ($output | Out-String).Trim()
}

function Set-AppServiceAppSettingsViaArm {
    param(
        [string]$SubscriptionId,
        [string]$ResourceGroupName,
        [string]$SiteName,
        [hashtable]$Settings
    )

    if ([string]::IsNullOrWhiteSpace($SubscriptionId) -or
        [string]::IsNullOrWhiteSpace($ResourceGroupName) -or
        [string]::IsNullOrWhiteSpace($SiteName)) {
        throw 'SubscriptionId, ResourceGroupName and SiteName are required to update app settings via ARM.'
    }

    $listUrl = "https://management.azure.com/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.Web/sites/$SiteName/config/appsettings/list?api-version=2022-03-01"
    $current = Invoke-AzCli -ExpectJson -Arguments @('rest', '--method', 'post', '--url', $listUrl, '-o', 'json')

    $properties = @{}
    $currentProperties = Get-OptionalPropertyValue -Object $current -PropertyName 'properties'
    if ($null -ne $currentProperties) {
        foreach ($entry in $currentProperties.PSObject.Properties) {
            $properties[$entry.Name] = [string]$entry.Value
        }
    }

    foreach ($entry in $Settings.GetEnumerator()) {
        $properties[[string]$entry.Key] = [string]$entry.Value
    }

    $putUrl = "https://management.azure.com/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.Web/sites/$SiteName/config/appsettings?api-version=2022-03-01"
    $payload = @{ properties = $properties } | ConvertTo-Json -Depth 20 -Compress
    $payloadFile = [System.IO.Path]::GetTempFileName()

    try {
        Set-Content -Path $payloadFile -Value $payload -Encoding UTF8
        Invoke-AzCli -Arguments @(
            'rest',
            '--method', 'put',
            '--url', $putUrl,
            '--headers', 'Content-Type=application/json',
            '--body', "@$payloadFile",
            '-o', 'none'
        ) | Out-Null
    }
    finally {
        if (Test-Path -LiteralPath $payloadFile) {
            Remove-Item -LiteralPath $payloadFile -Force -ErrorAction SilentlyContinue
        }
    }
}

function Get-OptionalPropertyValue {
    param(
        [object]$Object,
        [string]$PropertyName
    )

    if ($null -eq $Object -or [string]::IsNullOrWhiteSpace($PropertyName)) {
        return $null
    }

    if (-not ($Object.PSObject.Properties.Name -contains $PropertyName)) {
        return $null
    }

    return $Object.$PropertyName
}

function Get-NestedOptionalPropertyValue {
    param(
        [object]$Object,
        [string]$Path
    )

    if ($null -eq $Object -or [string]::IsNullOrWhiteSpace($Path)) {
        return $null
    }

    $current = $Object
    foreach ($segment in $Path.Split('.')) {
        if ($null -eq $current) {
            return $null
        }

        if (-not ($current.PSObject.Properties.Name -contains $segment)) {
            return $null
        }

        $current = $current.$segment
    }

    return $current
}

function Resolve-PythonCommand {
    param([string]$Root)

    $venvPython = Join-Path $Root '.venv\Scripts\python.exe'
    if (Test-Path $venvPython) {
        return $venvPython
    }

    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCommand) {
        return $pythonCommand.Source
    }

    throw 'Python is required for Foundry agent deployment. Install Python 3.10+ or create a .venv in the repository root.'
}

function Ensure-FoundryPythonDependencies {
    param(
        [string]$PythonCommand,
        [string]$Root
    )

    & $PythonCommand '-c' 'import yaml, azure.ai.projects' | Out-Null
    if ($LASTEXITCODE -eq 0) {
        return
    }

    Write-Info 'Installing Python dependencies required for Foundry agent deployment'
    & $PythonCommand '-m' 'pip' 'install' '-r' (Join-Path $Root 'tools/foundry/requirements.txt') | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to install Python dependencies for Foundry deployment.'
    }
}

function Get-FoundryEndpoint {
    param(
        [string]$CustomSubDomain,
        [string]$ProjectName
    )

    return "https://$CustomSubDomain.services.ai.azure.com/api/projects/$ProjectName"
}

function Ensure-FunctionManagedIdentity {
    param(
        [string]$ResourceGroupName,
        [string]$FunctionAppName,
        [int]$MaxAttempts = 12,
        [int]$DelaySeconds = 5
    )

    $identityType = Try-Invoke-AzCli -Arguments @(
        'functionapp', 'identity', 'show',
        '--resource-group', $ResourceGroupName,
        '--name', $FunctionAppName,
        '--query', 'type',
        '-o', 'tsv'
    )

    if ([string]::IsNullOrWhiteSpace($identityType) -or $identityType -eq 'None') {
        Write-Info "Enabling system-assigned managed identity for Function App '$FunctionAppName'"
        Invoke-AzCli -Arguments @(
            'functionapp', 'identity', 'assign',
            '--resource-group', $ResourceGroupName,
            '--name', $FunctionAppName,
            '-o', 'none'
        ) | Out-Null
    }

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        $principalId = Try-Invoke-AzCli -Arguments @(
            'functionapp', 'identity', 'show',
            '--resource-group', $ResourceGroupName,
            '--name', $FunctionAppName,
            '--query', 'principalId',
            '-o', 'tsv'
        )

        if (-not [string]::IsNullOrWhiteSpace($principalId)) {
            return $principalId
        }

        Start-Sleep -Seconds $DelaySeconds
    }

    throw "Function App managed identity principalId could not be resolved for '$FunctionAppName'."
}

function Resolve-FoundryRoleScope {
    param(
        [string]$FoundryProjectResourceId,
        [string]$FoundryProjectEndpoint,
        [string]$ResourceGroupName
    )

    if (-not [string]::IsNullOrWhiteSpace($FoundryProjectResourceId)) {
        return $FoundryProjectResourceId
    }

    if ([string]::IsNullOrWhiteSpace($FoundryProjectEndpoint)) {
        return $null
    }

    try {
        $endpointUri = [Uri]$FoundryProjectEndpoint
        $hostParts = $endpointUri.Host.Split('.')
        if ($hostParts.Length -lt 1 -or [string]::IsNullOrWhiteSpace($hostParts[0])) {
            return $null
        }

        $foundryResourceName = $hostParts[0]

        # First try scoped lookup in the deployment resource group.
        $foundryResourceId = Try-Invoke-AzCli -Arguments @(
            'cognitiveservices', 'account', 'show',
            '--resource-group', $ResourceGroupName,
            '--name', $foundryResourceName,
            '--query', 'id',
            '-o', 'tsv'
        )

        if (-not [string]::IsNullOrWhiteSpace($foundryResourceId)) {
            return $foundryResourceId
        }

        # Fallback to cross-resource-group lookup by name/custom subdomain across the subscription.
        $foundryResourceId = Try-Invoke-AzCli -Arguments @(
            'cognitiveservices', 'account', 'list',
            '--query', "[?name=='$foundryResourceName' || properties.customSubDomainName=='$foundryResourceName'] | [0].id",
            '-o', 'tsv'
        )

        if (-not [string]::IsNullOrWhiteSpace($foundryResourceId)) {
            return $foundryResourceId
        }
    }
    catch {
        return $null
    }

    return $null
}

function Ensure-RoleAssignment {
    param(
        [string]$PrincipalId,
        [string]$RoleDefinitionName,
        [string]$Scope
    )

    $assignments = Try-Invoke-AzCli -ExpectJson -Arguments @(
        'role', 'assignment', 'list',
        '--assignee-object-id', $PrincipalId,
        '--scope', $Scope,
        '-o', 'json'
    )

    if ($null -ne $assignments) {
        $existing = @($assignments | Where-Object {
            $_.roleDefinitionName -eq $RoleDefinitionName -and $_.scope -eq $Scope
        })

        if ($existing.Count -gt 0) {
            Write-Info "Role '$RoleDefinitionName' is already assigned on scope '$Scope'."
            return
        }
    }

    Invoke-AzCli -Arguments @(
        'role', 'assignment', 'create',
        '--assignee-object-id', $PrincipalId,
        '--assignee-principal-type', 'ServicePrincipal',
        '--role', $RoleDefinitionName,
        '--scope', $Scope,
        '-o', 'none'
    ) | Out-Null
}

function Get-PublicIpAddress {
    $candidates = @(
        'https://api.ipify.org',
        'https://ifconfig.me/ip'
    )

    foreach ($candidate in $candidates) {
        try {
            $ipAddress = (Invoke-RestMethod -Uri $candidate -TimeoutSec 15).ToString().Trim()
            if ($ipAddress -match '^(?:\d{1,3}\.){3}\d{1,3}$') {
                return $ipAddress
            }
        }
        catch {
        }
    }

    return $null
}

function Invoke-SqlFile {
    param(
        [string]$Server,
        [string]$Database,
        [string]$User,
        [string]$Password,
        [string]$FilePath
    )

    if (Get-Command sqlcmd -ErrorAction SilentlyContinue) {
        & sqlcmd -S "tcp:$Server,1433" -d $Database -U $User -P $Password -N -C -b -i $FilePath
        if ($LASTEXITCODE -ne 0) {
            throw "sqlcmd failed for $FilePath"
        }
        return
    }

    if (Get-Command Invoke-Sqlcmd -ErrorAction SilentlyContinue) {
        Invoke-Sqlcmd -ServerInstance "tcp:$Server,1433" -Database $Database -Username $User -Password $Password -InputFile $FilePath -Encrypt Optional -TrustServerCertificate
        return
    }

    throw "Neither sqlcmd nor Invoke-Sqlcmd is available. Install sqlcmd or the SqlServer PowerShell module."
}

function Wait-BacpacImportCompletion {
    param(
        [string]$OperationStatusLink,
        [int]$PollIntervalSeconds,
        [int]$TimeoutMinutes
    )

    if ([string]::IsNullOrWhiteSpace($OperationStatusLink)) {
        throw 'OperationStatusLink is required to poll BACPAC import status.'
    }

    if ($PollIntervalSeconds -lt 5) {
        $PollIntervalSeconds = 5
    }

    if ($TimeoutMinutes -lt 1) {
        $TimeoutMinutes = 1
    }

    $deadlineUtc = [DateTime]::UtcNow.AddMinutes($TimeoutMinutes)
    $attempt = 0

    while ([DateTime]::UtcNow -lt $deadlineUtc) {
        $attempt++
        $statusPayload = Invoke-AzCli -ExpectJson -Arguments @(
            'rest',
            '--method', 'get',
            '--url', $OperationStatusLink,
            '-o', 'json'
        )

        $status = [string](Get-NestedOptionalPropertyValue -Object $statusPayload -Path 'status')
        if ([string]::IsNullOrWhiteSpace($status)) {
            $status = [string](Get-NestedOptionalPropertyValue -Object $statusPayload -Path 'properties.status')
        }

        $statusMessage = [string](Get-NestedOptionalPropertyValue -Object $statusPayload -Path 'statusMessage')
        if ([string]::IsNullOrWhiteSpace($statusMessage)) {
            $statusMessage = [string](Get-NestedOptionalPropertyValue -Object $statusPayload -Path 'properties.statusMessage')
        }

        if ([string]::IsNullOrWhiteSpace($status)) {
            Write-WarnLine "BACPAC import polling attempt $attempt returned no status."
        }
        else {
            $statusLine = if ([string]::IsNullOrWhiteSpace($statusMessage)) { $status } else { "$status - $statusMessage" }
            Write-Info "BACPAC import status (attempt $attempt): $statusLine"
        }

        if ($status -in @('Succeeded', 'Success', 'Completed')) {
            return
        }

        if ($status -in @('Failed', 'Canceled', 'Cancelled')) {
            $errorMessage = [string](Get-NestedOptionalPropertyValue -Object $statusPayload -Path 'errorMessage')
            if ([string]::IsNullOrWhiteSpace($errorMessage)) {
                $errorMessage = [string](Get-NestedOptionalPropertyValue -Object $statusPayload -Path 'properties.errorMessage')
            }

            if ([string]::IsNullOrWhiteSpace($errorMessage)) {
                throw "BACPAC import failed with status '$status'."
            }

            throw "BACPAC import failed with status '$status'. Error: $errorMessage"
        }

        Start-Sleep -Seconds $PollIntervalSeconds
    }

    throw "Timed out waiting for BACPAC import completion after $TimeoutMinutes minutes."
}

function Wait-BacpacImportCompletionByDatabaseOperation {
    param(
        [string]$ResourceGroupName,
        [string]$SqlServerName,
        [string]$DatabaseName,
        [int]$PollIntervalSeconds,
        [int]$TimeoutMinutes
    )

    if ($PollIntervalSeconds -lt 5) {
        $PollIntervalSeconds = 5
    }

    if ($TimeoutMinutes -lt 1) {
        $TimeoutMinutes = 1
    }

    $deadlineUtc = [DateTime]::UtcNow.AddMinutes($TimeoutMinutes)
    $attempt = 0

    while ([DateTime]::UtcNow -lt $deadlineUtc) {
        $attempt++
        $operations = Try-Invoke-AzCli -ExpectJson -Arguments @(
            'sql', 'db', 'op', 'list',
            '--resource-group', $ResourceGroupName,
            '--server', $SqlServerName,
            '--database', $DatabaseName,
            '-o', 'json'
        )

        if ($null -eq $operations) {
            Write-WarnLine "Could not query SQL operations for '$DatabaseName' (attempt $attempt)."
            Start-Sleep -Seconds $PollIntervalSeconds
            continue
        }

        $opsArray = @($operations)
        if ($opsArray.Count -eq 0) {
            Write-Info "No SQL operations found yet for '$DatabaseName' (attempt $attempt)."
            Start-Sleep -Seconds $PollIntervalSeconds
            continue
        }

        $latest = $opsArray | Sort-Object {
            Get-NestedOptionalPropertyValue -Object $_ -Path 'startTime'
        } -Descending | Select-Object -First 1

        $state = [string](Get-NestedOptionalPropertyValue -Object $latest -Path 'state')
        $operation = [string](Get-NestedOptionalPropertyValue -Object $latest -Path 'operation')
        $error = [string](Get-NestedOptionalPropertyValue -Object $latest -Path 'errorDescription')

        if ([string]::IsNullOrWhiteSpace($operation)) {
            $operation = 'sql-db-operation'
        }

        if ([string]::IsNullOrWhiteSpace($state)) {
            Write-Info "SQL operation status is not available yet (attempt $attempt)."
            Start-Sleep -Seconds $PollIntervalSeconds
            continue
        }

        Write-Info "SQL operation '$operation' status (attempt $attempt): $state"

        if ($state -in @('InProgress', 'Pending')) {
            Start-Sleep -Seconds $PollIntervalSeconds
            continue
        }

        if ($state -in @('Succeeded', 'Success', 'Completed')) {
            return
        }

        if ($state -in @('Failed', 'Canceled', 'Cancelled')) {
            if ([string]::IsNullOrWhiteSpace($error)) {
                throw "BACPAC import failed. SQL operation state: '$state'."
            }

            throw "BACPAC import failed. SQL operation state: '$state'. Error: $error"
        }

        Start-Sleep -Seconds $PollIntervalSeconds
    }

    throw "Timed out waiting for SQL import operation completion after $TimeoutMinutes minutes."
}

function Invoke-BacpacImport {
    param(
        [string]$ResourceGroupName,
        [string]$StorageAccountName,
        [string]$SqlServerName,
        [string]$SqlAdminLogin,
        [string]$SqlAdminPassword,
        [string]$BacpacFilePath,
        [string]$ContainerName,
        [string]$DatabaseName,
        [string]$ServiceObjective,
        [int]$PollIntervalSeconds = 15,
        [int]$TimeoutMinutes = 90
    )

    if (-not (Test-Path $BacpacFilePath)) {
        throw "BACPAC file not found at '$BacpacFilePath'."
    }

    if ([string]::IsNullOrWhiteSpace($StorageAccountName)) {
        throw 'storageAccountName output is required to import a BACPAC file.'
    }

    $resolvedBacpac = (Resolve-Path $BacpacFilePath).Path
    $bacpacBlobName = [System.IO.Path]::GetFileName($resolvedBacpac)

    Write-Info "Resolving storage key for account '$StorageAccountName'"
    $storageKey = Invoke-AzCli -Arguments @(
        'storage', 'account', 'keys', 'list',
        '--resource-group', $ResourceGroupName,
        '--account-name', $StorageAccountName,
        '--query', '[0].value',
        '-o', 'tsv'
    )

    if ([string]::IsNullOrWhiteSpace($storageKey)) {
        throw "Could not resolve storage key for account '$StorageAccountName'."
    }

    Write-Info "Ensuring storage container '$ContainerName'"
    Invoke-AzCli -Arguments @(
        'storage', 'container', 'create',
        '--name', $ContainerName,
        '--account-name', $StorageAccountName,
        '--account-key', $storageKey,
        '--only-show-errors',
        '-o', 'none'
    ) | Out-Null

    Write-Info "Uploading BACPAC '$resolvedBacpac'"
    Invoke-AzCli -Arguments @(
        'storage', 'blob', 'upload',
        '--account-name', $StorageAccountName,
        '--account-key', $storageKey,
        '--container-name', $ContainerName,
        '--file', $resolvedBacpac,
        '--name', $bacpacBlobName,
        '--overwrite', 'true',
        '--only-show-errors',
        '-o', 'none'
    ) | Out-Null

    $dbExists = Try-Invoke-AzCli -Arguments @(
        'sql', 'db', 'show',
        '--resource-group', $ResourceGroupName,
        '--server', $SqlServerName,
        '--name', $DatabaseName,
        '--query', 'name',
        '-o', 'tsv'
    )

    if ([string]::IsNullOrWhiteSpace($dbExists)) {
        Write-Info "Creating database '$DatabaseName' with service objective '$ServiceObjective'"
        Invoke-AzCli -Arguments @(
            'sql', 'db', 'create',
            '--resource-group', $ResourceGroupName,
            '--server', $SqlServerName,
            '--name', $DatabaseName,
            '--service-objective', $ServiceObjective,
            '--only-show-errors',
            '-o', 'none'
        ) | Out-Null
    }
    else {
        Write-WarnLine "Database '$DatabaseName' already exists. Import will be attempted on the existing database."
    }

    $storageUri = "https://$StorageAccountName.blob.core.windows.net/$ContainerName/$bacpacBlobName"
    Write-Info "Starting BACPAC import into '$DatabaseName'"
    $importResponse = Invoke-AzCli -ExpectJson -Arguments @(
        'sql', 'db', 'import',
        '--resource-group', $ResourceGroupName,
        '--server', $SqlServerName,
        '--name', $DatabaseName,
        '--admin-user', $SqlAdminLogin,
        '--admin-password', $SqlAdminPassword,
        '--storage-key-type', 'StorageAccessKey',
        '--storage-key', $storageKey,
        '--storage-uri', $storageUri,
        '--only-show-errors',
        '-o', 'json'
    )

    $operationStatusLink = $null
    $operationStatusLinkCandidates = @(
        'operationStatusLink',
        'properties.operationStatusLink',
        'azureAsyncOperation',
        'properties.azureAsyncOperation'
    )

    foreach ($path in $operationStatusLinkCandidates) {
        $candidate = Get-NestedOptionalPropertyValue -Object $importResponse -Path $path
        if (-not [string]::IsNullOrWhiteSpace([string]$candidate)) {
            $operationStatusLink = [string]$candidate
            break
        }
    }

    Write-Info "BACPAC import request submitted. Polling status until completion."
    if ([string]::IsNullOrWhiteSpace($operationStatusLink)) {
        Write-WarnLine 'operationStatusLink was not returned by Azure CLI. Falling back to SQL operation polling.'
        Wait-BacpacImportCompletionByDatabaseOperation -ResourceGroupName $ResourceGroupName -SqlServerName $SqlServerName -DatabaseName $DatabaseName -PollIntervalSeconds $PollIntervalSeconds -TimeoutMinutes $TimeoutMinutes
    }
    else {
        Wait-BacpacImportCompletion -OperationStatusLink $operationStatusLink -PollIntervalSeconds $PollIntervalSeconds -TimeoutMinutes $TimeoutMinutes
    }
    Write-Info "BACPAC import completed successfully. Database: '$DatabaseName'. Source: '$storageUri'"
}

function New-ZipFromDirectory {
    param(
        [string]$SourceDirectory,
        [string]$ZipPath
    )

    if (Test-Path $ZipPath) {
        Remove-Item $ZipPath -Force
    }

    Compress-Archive -Path (Join-Path $SourceDirectory '*') -DestinationPath $ZipPath -Force
}

function Build-FrontendPackage {
    param(
        [string]$SourceRoot,
        [string]$DestinationRoot,
        [hashtable]$BuildEnvironment = @{}
    )

    if (Test-Path $DestinationRoot) {
        Remove-Item $DestinationRoot -Recurse -Force
    }

    $previousEnvironment = @{}
    Push-Location $SourceRoot
    try {
        foreach ($entry in $BuildEnvironment.GetEnumerator()) {
            $previousEnvironment[$entry.Key] = [Environment]::GetEnvironmentVariable($entry.Key, 'Process')
            [Environment]::SetEnvironmentVariable($entry.Key, [string]$entry.Value, 'Process')
        }

        npm ci | Out-Host
        if ($LASTEXITCODE -ne 0) {
            throw 'npm ci failed for the frontend package.'
        }

        npm run build | Out-Host
        if ($LASTEXITCODE -ne 0) {
            throw 'npm run build failed for the frontend package.'
        }

    }
    finally {
        foreach ($entry in $previousEnvironment.GetEnumerator()) {
            [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process')
        }
        Pop-Location
    }

    $standaloneRoot = Join-Path $SourceRoot '.next/standalone'
    $staticRoot = Join-Path $SourceRoot '.next/static'
    $serverEntry = Get-ChildItem -Path $standaloneRoot -Filter 'server.js' -File -Recurse | Select-Object -First 1
    if ($null -eq $serverEntry) {
        throw 'Next.js standalone output was not generated. Ensure next.config.ts sets output to standalone.'
    }

    $standaloneAppRoot = $serverEntry.Directory.FullName

    New-Item -ItemType Directory -Path $DestinationRoot | Out-Null

    Copy-Item -Path (Join-Path $standaloneAppRoot '*') -Destination $DestinationRoot -Recurse -Force

    $staticTarget = Join-Path $DestinationRoot '.next/static'
    New-Item -ItemType Directory -Path $staticTarget -Force | Out-Null
    Copy-Item -Path (Join-Path $staticRoot '*') -Destination $staticTarget -Recurse -Force

    $publicRoot = Join-Path $SourceRoot 'public'
    if (Test-Path $publicRoot) {
        Copy-Item -Path $publicRoot -Destination (Join-Path $DestinationRoot 'public') -Recurse -Force
    }
}

function Wait-ForHttp {
    param(
        [string]$Url,
        [int]$MaxAttempts = 20,
        [int]$DelaySeconds = 10,
        [int]$SuccessStatusFloor = 200,
        [int]$SuccessStatusCeiling = 499
    )

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 20
            if ($response.StatusCode -ge $SuccessStatusFloor -and $response.StatusCode -le $SuccessStatusCeiling) {
                return $true
            }
        }
        catch {
            $statusCode = $null
            $exceptionResponse = Get-OptionalPropertyValue -Object $_.Exception -PropertyName 'Response'
            if ($null -ne $exceptionResponse) {
                $rawStatusCode = Get-NestedOptionalPropertyValue -Object $exceptionResponse -Path 'StatusCode.value__'
                if ($null -eq $rawStatusCode) {
                    $rawStatusCode = Get-OptionalPropertyValue -Object $exceptionResponse -PropertyName 'StatusCode'
                }

                if ($null -ne $rawStatusCode) {
                    try {
                        $statusCode = [int]$rawStatusCode
                    }
                    catch {
                        $statusCode = $null
                    }
                }
            }

            if ($null -ne $statusCode -and $statusCode -ge $SuccessStatusFloor -and $statusCode -le $SuccessStatusCeiling) {
                return $true
            }
        }

        Start-Sleep -Seconds $DelaySeconds
    }

    return $false
}

if (Test-Path $ConfigPath) {
    $config = Import-PowerShellDataFile -Path $ConfigPath
}
else {
    Write-WarnLine "Configuration file not found at '$ConfigPath'. The script will prompt for the required initial values."
    $config = New-DeploymentConfigSkeleton
}

$defaults = New-DeploymentConfigDefaults
$currentSubscription = Try-Invoke-AzCli -ExpectJson -Arguments @('account', 'show', '-o', 'json')
$subscriptionSuggestion = if ($null -ne $currentSubscription -and -not [string]::IsNullOrWhiteSpace($currentSubscription.id)) { $currentSubscription.id } else { '' }
$tenantSuggestion = if (-not [string]::IsNullOrWhiteSpace($config.Auth.TenantId)) { $config.Auth.TenantId } elseif (-not [string]::IsNullOrWhiteSpace($config.Foundry.TenantId)) { $config.Foundry.TenantId } elseif ($null -ne $currentSubscription -and -not [string]::IsNullOrWhiteSpace($currentSubscription.tenantId)) { $currentSubscription.tenantId } else { '' }

$workloadNameConfig = if ($config.ContainsKey('WorkloadName')) { [string]$config['WorkloadName'] } else { '' }
$environmentNameConfig = if ($config.ContainsKey('EnvironmentName')) { [string]$config['EnvironmentName'] } else { '' }
$instanceConfig = if ($config.ContainsKey('Instance')) { [string]$config['Instance'] } else { '' }
$sqlSkuTierConfig = if ($config.Sql.ContainsKey('SkuTier')) { [string]$config.Sql['SkuTier'] } else { '' }
$sqlPublicNetworkAccessConfig = if ($config.Sql.ContainsKey('PublicNetworkAccess')) { [bool]$config.Sql['PublicNetworkAccess'] } else { $true }
$sqlAllowAzureServicesConfig = if ($config.Sql.ContainsKey('AllowAzureServices')) { [bool]$config.Sql['AllowAzureServices'] } else { $true }
$frontendLinuxFxVersionConfig = if ($config.Frontend.ContainsKey('LinuxFxVersion')) { [string]$config.Frontend['LinuxFxVersion'] } else { '' }
$azureOpenAiModelNameConfig = if ($config.AzureOpenAI.ContainsKey('ModelName')) { [string]$config.AzureOpenAI['ModelName'] } else { '' }
$azureOpenAiModelVersionConfig = if ($config.AzureOpenAI.ContainsKey('ModelVersion')) { [string]$config.AzureOpenAI['ModelVersion'] } else { '' }
$azureOpenAiCapacityConfig = if ($config.AzureOpenAI.ContainsKey('Capacity')) { [int]$config.AzureOpenAI['Capacity'] } else { 10 }
$functionsConfig = if ($config.ContainsKey('Functions')) { $config['Functions'] } else { @{} }
$functionsExtensionVersionConfig = if ($functionsConfig.ContainsKey('ExtensionVersion')) { [string]$functionsConfig['ExtensionVersion'] } else { '' }
$databaseConfig = if ($config.ContainsKey('Database')) { $config['Database'] } else { @{} }
$databaseImportBacpac = if ($databaseConfig.ContainsKey('ImportBacpac')) { [bool]$databaseConfig['ImportBacpac'] } else { $false }
$databaseBacpacFile = if ($databaseConfig.ContainsKey('BacpacFile')) { [string]$databaseConfig['BacpacFile'] } else { 'infra/dbs/Clinic.bacpac' }
$databaseContainerName = if ($databaseConfig.ContainsKey('ContainerName')) { [string]$databaseConfig['ContainerName'] } else { 'bacpac' }
$databaseBacpacDatabaseName = if ($databaseConfig.ContainsKey('BacpacDatabaseName')) { [string]$databaseConfig['BacpacDatabaseName'] } else { 'ClinicDB' }
$databaseServiceObjective = if ($databaseConfig.ContainsKey('ServiceObjective')) { [string]$databaseConfig['ServiceObjective'] } else { 'S0' }
$databaseImportPollIntervalSeconds = if ($databaseConfig.ContainsKey('ImportPollIntervalSeconds')) { [int]$databaseConfig['ImportPollIntervalSeconds'] } else { 15 }
$databaseImportTimeoutMinutes = if ($databaseConfig.ContainsKey('ImportTimeoutMinutes')) { [int]$databaseConfig['ImportTimeoutMinutes'] } else { 90 }

$subscriptionId = Resolve-ConfigValue -Value $config.SubscriptionId -Prompt 'Azure subscription id' -PropertyName 'SubscriptionId' -DefaultValue $subscriptionSuggestion
$resourceGroupName = Resolve-ConfigValue -Value $config.ResourceGroupName -Prompt 'Resource group name to use' -PropertyName 'ResourceGroupName' -DefaultValue $defaults.ResourceGroupName
$location = Resolve-ConfigValue -Value $config.Location -Prompt 'Azure location' -PropertyName 'Location' -DefaultValue $defaults.Location
$prefix = Resolve-ConfigValue -Value $config.Prefix -Prompt 'Deployment prefix' -PropertyName 'Prefix' -DefaultValue $defaults.Prefix
$workloadName = if (-not [string]::IsNullOrWhiteSpace($workloadNameConfig)) { $workloadNameConfig } elseif (-not [string]::IsNullOrWhiteSpace($prefix)) { $prefix } else { $defaults.WorkloadName }
$environmentName = if (-not [string]::IsNullOrWhiteSpace($environmentNameConfig)) { $environmentNameConfig } else { $defaults.EnvironmentName }
$instance = if ([string]::IsNullOrWhiteSpace($instanceConfig)) { $defaults.Instance } else { $instanceConfig }
$sqlAdminLogin = Resolve-ConfigValue -Value $config.Sql.AdminLogin -Prompt 'SQL admin login' -PropertyName 'Sql.AdminLogin' -DefaultValue $defaults.SqlAdminLogin
$sqlAdminPassword = Resolve-ConfigValue -Value $config.Sql.AdminPassword -Prompt 'SQL admin password' -PropertyName 'Sql.AdminPassword' -DefaultValue $defaults.SqlAdminPassword -Secret
$authClientId = Resolve-ConfigValue -Value $config.Auth.ClientId -Prompt 'Existing app registration client id' -PropertyName 'Auth.ClientId' -DefaultValue ''
$authTenantId = Resolve-ConfigValue -Value $config.Auth.TenantId -Prompt 'Microsoft Entra tenant id' -PropertyName 'Auth.TenantId' -DefaultValue $tenantSuggestion
$authAuthorityHost = Resolve-ConfigValue -Value $config.Auth.AuthorityHost -Prompt 'Microsoft Entra authority host' -PropertyName 'Auth.AuthorityHost' -DefaultValue 'https://login.microsoftonline.com'
$authAutoConfigureSpaRedirectUris = if ($config.Auth.ContainsKey('AutoConfigureSpaRedirectUris')) { [bool]$config.Auth['AutoConfigureSpaRedirectUris'] } else { $true }
$frontendAuthorityDefault = Build-AuthorityUrl -AuthorityHost $authAuthorityHost -TenantId $authTenantId
$frontendAuthority = Resolve-ConfigValue -Value $config.Frontend.Authority -Prompt 'Frontend authority URL' -PropertyName 'Frontend.Authority' -DefaultValue $frontendAuthorityDefault

$config.SubscriptionId = $subscriptionId
$config.ResourceGroupName = $resourceGroupName
$config.Location = $location
$config.Prefix = $prefix
$config['WorkloadName'] = $workloadName
$config['EnvironmentName'] = $environmentName
$config['Instance'] = $instance
$config.Sql.AdminLogin = $sqlAdminLogin
$config.Sql.AdminPassword = $sqlAdminPassword
$config.Auth.ClientId = $authClientId
$config.Auth.TenantId = $authTenantId
$config.Auth.AuthorityHost = $authAuthorityHost
$config.Frontend.Authority = $frontendAuthority

$foundryManageProject = if ($null -eq $config.Foundry.ManageProject) { $false } else { [bool]$config.Foundry.ManageProject }
$foundryManageAgents = if ($null -eq $config.Foundry.ManageAgents) { $false } else { [bool]$config.Foundry.ManageAgents }
$foundryCreateResourceIfMissing = if ($null -eq $config.Foundry.CreateResourceIfMissing) { $true } else { [bool]$config.Foundry.CreateResourceIfMissing }
$foundryCreateProjectIfMissing = if ($null -eq $config.Foundry.CreateProjectIfMissing) { $true } else { [bool]$config.Foundry.CreateProjectIfMissing }
$foundryEnvironmentName = if ([string]::IsNullOrWhiteSpace($config.Foundry.EnvironmentName)) { 'dev' } else { $config.Foundry.EnvironmentName }
$foundryProjectEndpoint = $config.Foundry.ProjectEndpoint
$foundryProjectResourceId = $config.Foundry.ProjectResourceId
$foundryTenantId = $config.Foundry.TenantId
$foundrySqlPlannerAgentRef = if ($config.Foundry.ContainsKey('SqlPlannerAgentRef')) { [string]$config.Foundry['SqlPlannerAgentRef'] } else { '' }
$foundryResultInterpreterAgentRef = if ($config.Foundry.ContainsKey('ResultInterpreterAgentRef')) { [string]$config.Foundry['ResultInterpreterAgentRef'] } else { '' }
$foundryConciergeAgentRef = if ($config.Foundry.ContainsKey('ConciergeAgentRef')) { [string]$config.Foundry['ConciergeAgentRef'] } else { '' }
$foundryRoleDefinitionName = if ([string]::IsNullOrWhiteSpace($config.Foundry.RoleDefinitionName)) { 'Azure AI User' } else { $config.Foundry.RoleDefinitionName }
$foundryAutoConfigureFunctionIdentity = if ($null -eq $config.Foundry.AutoConfigureFunctionIdentity) { $true } else { [bool]$config.Foundry.AutoConfigureFunctionIdentity }
$foundryAutoAssignFunctionRole = if ($null -eq $config.Foundry.AutoAssignFunctionRole) { $true } else { [bool]$config.Foundry.AutoAssignFunctionRole }

$azureOpenAiModelName = if ([string]::IsNullOrWhiteSpace($azureOpenAiModelNameConfig)) { 'gpt-4o-mini' } else { $azureOpenAiModelNameConfig }
$azureOpenAiModelVersion = if ([string]::IsNullOrWhiteSpace($azureOpenAiModelVersionConfig)) { '2024-07-18' } else { $azureOpenAiModelVersionConfig }
$azureOpenAiCapacity = $azureOpenAiCapacityConfig
$sqlSkuTier = if ([string]::IsNullOrWhiteSpace($sqlSkuTierConfig)) { $config.Sql.SkuName } else { $sqlSkuTierConfig }
$sqlPublicNetworkAccess = $sqlPublicNetworkAccessConfig
$sqlAllowAzureServices = $sqlAllowAzureServicesConfig
$webLinuxFxVersion = if ([string]::IsNullOrWhiteSpace($frontendLinuxFxVersionConfig)) { 'NODE|20-lts' } else { $frontendLinuxFxVersionConfig }
$functionsExtensionVersion = if ([string]::IsNullOrWhiteSpace($functionsExtensionVersionConfig)) { '~4' } else { $functionsExtensionVersionConfig }
$databaseImportBacpac = [bool]$databaseImportBacpac
$databaseBacpacFile = if ([string]::IsNullOrWhiteSpace($databaseBacpacFile)) { 'infra/dbs/Clinic.bacpac' } else { $databaseBacpacFile }
$databaseContainerName = if ([string]::IsNullOrWhiteSpace($databaseContainerName)) { 'bacpac' } else { $databaseContainerName }
$databaseBacpacDatabaseName = if ([string]::IsNullOrWhiteSpace($databaseBacpacDatabaseName)) { 'ClinicDB' } else { $databaseBacpacDatabaseName }
$databaseServiceObjective = if ([string]::IsNullOrWhiteSpace($databaseServiceObjective)) { 'S0' } else { $databaseServiceObjective }
$databaseImportPollIntervalSeconds = if ($databaseImportPollIntervalSeconds -lt 5) { 5 } else { $databaseImportPollIntervalSeconds }
$databaseImportTimeoutMinutes = if ($databaseImportTimeoutMinutes -lt 1) { 1 } else { $databaseImportTimeoutMinutes }

$allowedAudiencesSource = if ($config.Auth.ContainsKey('AllowedAudiences')) { $config.Auth['AllowedAudiences'] } else { @() }
$allowedAudiences = @($allowedAudiencesSource | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
$allowedAudiencesPromptValue = if ($allowedAudiences.Count -gt 0) { $allowedAudiences -join ',' } else { '' }
$allowedAudiencesInput = Resolve-ConfigValue -Value $allowedAudiencesPromptValue -Prompt 'Allowed audiences (comma-separated)' -PropertyName 'Auth.AllowedAudiences' -DefaultValue $authClientId
$allowedAudiences = @($allowedAudiencesInput.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
$config.Auth.AllowedAudiences = $allowedAudiences

$completedPhases = [System.Collections.Generic.List[string]]::new()
$resumeIndex = $phaseOrder.IndexOf($ResumeFrom)
$currentPhase = $ResumeFrom

if ($ResumeFrom -eq 'DeployWeb') {
    $deployApiIndex = $phaseOrder.IndexOf('DeployApi')
    if ($deployApiIndex -ge 0 -and $resumeIndex -gt $deployApiIndex) {
        Write-WarnLine 'ResumeFrom=DeployWeb will also run DeployApi to keep backend functions in sync with the frontend deployment.'
        $resumeIndex = $deployApiIndex
        $currentPhase = 'DeployApi'
    }
}

try {
    Write-Info 'Validating tools and Azure session'
    Require-Command 'az'
    Require-Command 'dotnet'
    Require-Command 'npm'

    $account = Invoke-AzCli -Arguments @('account', 'show') -ExpectJson
    Invoke-AzCli -Arguments @('account', 'set', '--subscription', $subscriptionId) | Out-Null

    if ([string]::IsNullOrWhiteSpace($foundryTenantId)) {
        $foundryTenantId = $account.tenantId
    }

    for ($phaseIndex = $resumeIndex; $phaseIndex -lt $phaseOrder.Count; $phaseIndex++) {
        $phase = $phaseOrder[$phaseIndex]
        $currentPhase = $phase
        Show-DeploymentProgress -PhaseIndex $phaseIndex -PhaseTotal $phaseOrder.Count -PhaseName $phase -Message 'Iniciando fase'
        Write-Host ('=' * 88) -ForegroundColor DarkCyan
        Write-Host ("[avance] Paso {0}/{1} ({2}%) -> {3}" -f ($phaseIndex + 1), $phaseOrder.Count, ([int](($phaseIndex * 100) / $phaseOrder.Count)), $phase) -ForegroundColor Cyan
        Save-State -CurrentPhase $phase -CompletedPhases $completedPhases.ToArray() -Status 'running' -Message 'Phase started.'

        switch ($phase) {
            'Preflight' {
                Write-Phase $phase 'Resolving subscription, resource group, and required inputs'

                $resourceGroupExists = (Invoke-AzCli -Arguments @('group', 'exists', '--name', $resourceGroupName)).ToLowerInvariant() -eq 'true'
                if (-not $resourceGroupExists) {
                    $canCreate = [bool]$config.CreateResourceGroupIfMissing
                    if (-not $canCreate) {
                        $answer = Read-Host "Resource group '$resourceGroupName' does not exist. Create it? (y/n)"
                        if ($answer -notin @('y', 'Y', 'yes', 'YES')) {
                            throw "Resource group '$resourceGroupName' is required to continue."
                        }
                    }

                    Write-Info "Creating resource group '$resourceGroupName' in '$location'"
                    Invoke-AzCli -Arguments @('group', 'create', '--name', $resourceGroupName, '--location', $location, '-o', 'json') | Out-Null
                }

                if ($foundryManageProject) {
                    $config.Foundry.ResourceName = Resolve-RequiredValue -Value $config.Foundry.ResourceName -Prompt 'Foundry resource name' -PropertyName 'Foundry.ResourceName'
                    $config.Foundry.ProjectName = Resolve-RequiredValue -Value $config.Foundry.ProjectName -Prompt 'Foundry project name' -PropertyName 'Foundry.ProjectName'
                    $config.Foundry.ModelDeploymentName = Resolve-RequiredValue -Value $config.Foundry.ModelDeploymentName -Prompt 'Foundry model deployment name' -PropertyName 'Foundry.ModelDeploymentName'
                    $config.Foundry.ModelName = Resolve-RequiredValue -Value $config.Foundry.ModelName -Prompt 'Foundry model name' -PropertyName 'Foundry.ModelName'
                    $config.Foundry.ModelFormat = Resolve-RequiredValue -Value $config.Foundry.ModelFormat -Prompt 'Foundry model format' -PropertyName 'Foundry.ModelFormat'
                }
                else {
                    $foundryProjectEndpoint = Resolve-RequiredValue -Value $foundryProjectEndpoint -Prompt 'Foundry project endpoint' -PropertyName 'Foundry.ProjectEndpoint'
                }

                if (-not $foundryManageAgents) {
                    $foundrySqlPlannerAgentRef = Resolve-RequiredValue -Value $foundrySqlPlannerAgentRef -Prompt 'Foundry SQL Planner agent ref (name:version)' -PropertyName 'Foundry.SqlPlannerAgentRef'
                    $foundryResultInterpreterAgentRef = Resolve-RequiredValue -Value $foundryResultInterpreterAgentRef -Prompt 'Foundry Result Interpreter agent ref (name:version)' -PropertyName 'Foundry.ResultInterpreterAgentRef'
                    $foundryConciergeAgentRef = Resolve-RequiredValue -Value $foundryConciergeAgentRef -Prompt 'Foundry Concierge agent ref (name:version)' -PropertyName 'Foundry.ConciergeAgentRef'
                }

                $completedPhases.Add($phase)
            }
            'Provision' {
                Write-Phase $phase 'Provisioning Azure infrastructure for backend, frontend, SQL, OpenAI, Content Safety and Key Vault'

                $provisionArguments = @(
                    'deployment', 'group', 'create',
                    '--resource-group', $resourceGroupName,
                    '--template-file', (Join-Path $repoRoot 'infra/bicep/main.bicep'),
                    '--parameters', "workloadName=$workloadName",
                    '--parameters', "environmentName=$environmentName",
                    '--parameters', "location=$location",
                    '--parameters', "sqlAdminLogin=$sqlAdminLogin",
                    '--parameters', "sqlAdminPassword=$sqlAdminPassword",
                    '--parameters', "openAiDeploymentName=$($config.AzureOpenAI.DeploymentName)",
                    '--parameters', "openAiModelName=$azureOpenAiModelName",
                    '--parameters', "openAiModelVersion=$azureOpenAiModelVersion",
                    '--parameters', "openAiCapacity=$azureOpenAiCapacity",
                    '--parameters', "sqlDbSkuName=$($config.Sql.SkuName)",
                    '--parameters', "sqlDbSkuTier=$sqlSkuTier",
                    '--parameters', "sqlPublicNetworkAccess=$sqlPublicNetworkAccess",
                    '--parameters', "allowAzureServicesToSql=$sqlAllowAzureServices",
                    '-o', 'json'
                )

                if (-not [string]::IsNullOrWhiteSpace($instance)) {
                    $provisionArguments += @('--parameters', "instance=$instance")
                }

                $deployment = Invoke-AzCli -ExpectJson -Arguments $provisionArguments

                $deployment.properties.outputs | ConvertTo-Json -Depth 10 | Set-Content -Path $outputsPath
                $completedPhases.Add($phase)
            }
            'Foundry' {
                Write-Phase $phase 'Provisioning or validating Foundry project and deploying managed agents'

                if ($foundryManageProject) {
                    $foundryResourceName = $config.Foundry.ResourceName
                    $foundryProjectName = $config.Foundry.ProjectName
                    $foundryResourceSkuName = if ([string]::IsNullOrWhiteSpace($config.Foundry.ResourceSkuName)) { 'S0' } else { $config.Foundry.ResourceSkuName }

                    $foundryResource = Try-Invoke-AzCli -ExpectJson -Arguments @('cognitiveservices', 'account', 'show', '--resource-group', $resourceGroupName, '--name', $foundryResourceName, '-o', 'json')
                    if ($null -eq $foundryResource) {
                        if (-not $foundryCreateResourceIfMissing) {
                            throw "Foundry resource '$foundryResourceName' does not exist and Foundry.CreateResourceIfMissing is false."
                        }

                        Write-Info "Creating Foundry resource '$foundryResourceName'"
                        $foundryResource = Invoke-AzCli -ExpectJson -Arguments @(
                            'cognitiveservices', 'account', 'create',
                            '--resource-group', $resourceGroupName,
                            '--name', $foundryResourceName,
                            '--kind', 'AIServices',
                            '--sku', $foundryResourceSkuName,
                            '--location', $location,
                            '--custom-domain', $foundryResourceName,
                            '--allow-project-management',
                            '--yes',
                            '-o', 'json'
                        )
                    }

                    $customSubDomain = Invoke-AzCli -Arguments @('cognitiveservices', 'account', 'show', '--resource-group', $resourceGroupName, '--name', $foundryResourceName, '--query', 'properties.customSubDomainName', '-o', 'tsv')
                    if ([string]::IsNullOrWhiteSpace($customSubDomain)) {
                        Write-Info "Configuring custom domain for Foundry resource '$foundryResourceName'"
                        Invoke-AzCli -Arguments @('cognitiveservices', 'account', 'update', '--resource-group', $resourceGroupName, '--name', $foundryResourceName, '--custom-domain', $foundryResourceName, '-o', 'none') | Out-Null
                        $customSubDomain = $foundryResourceName
                    }

                    $foundryProject = Try-Invoke-AzCli -ExpectJson -Arguments @('cognitiveservices', 'account', 'project', 'show', '--resource-group', $resourceGroupName, '--name', $foundryResourceName, '--project-name', $foundryProjectName, '-o', 'json')
                    if ($null -eq $foundryProject) {
                        if (-not $foundryCreateProjectIfMissing) {
                            throw "Foundry project '$foundryProjectName' does not exist and Foundry.CreateProjectIfMissing is false."
                        }

                        Write-Info "Creating Foundry project '$foundryProjectName'"
                        $foundryProject = Invoke-AzCli -ExpectJson -Arguments @(
                            'cognitiveservices', 'account', 'project', 'create',
                            '--resource-group', $resourceGroupName,
                            '--name', $foundryResourceName,
                            '--project-name', $foundryProjectName,
                            '--location', $location,
                            '-o', 'json'
                        )
                    }

                    $foundryProjectResourceId = $foundryProject.id
                    $foundryProjectEndpoint = Get-FoundryEndpoint -CustomSubDomain $customSubDomain -ProjectName $foundryProjectName

                    $modelDeploymentName = $config.Foundry.ModelDeploymentName
                    $modelDeployment = Try-Invoke-AzCli -ExpectJson -Arguments @('cognitiveservices', 'account', 'deployment', 'show', '--resource-group', $resourceGroupName, '--name', $foundryResourceName, '--deployment-name', $modelDeploymentName, '-o', 'json')
                    if ($null -eq $modelDeployment) {
                        Write-Info "Deploying model '$($config.Foundry.ModelName)' to Foundry resource '$foundryResourceName'"
                        Invoke-AzCli -Arguments @(
                            'cognitiveservices', 'account', 'deployment', 'create',
                            '--resource-group', $resourceGroupName,
                            '--name', $foundryResourceName,
                            '--deployment-name', $modelDeploymentName,
                            '--model-name', $config.Foundry.ModelName,
                            '--model-version', $config.Foundry.ModelVersion,
                            '--model-format', $config.Foundry.ModelFormat,
                            '--sku-name', $config.Foundry.ModelSkuName,
                            '--sku-capacity', "$($config.Foundry.ModelSkuCapacity)",
                            '-o', 'none'
                        ) | Out-Null
                    }
                }

                if ($foundryManageAgents) {
                    $pythonCommand = Resolve-PythonCommand -Root $repoRoot
                    Ensure-FoundryPythonDependencies -PythonCommand $pythonCommand -Root $repoRoot

                    & $pythonCommand (Join-Path $repoRoot 'tools/foundry/deploy_agents.py') 'apply' '--env' $foundryEnvironmentName '--project-endpoint' $foundryProjectEndpoint '--model-deployment' $config.Foundry.ModelDeploymentName | Out-Host
                    if ($LASTEXITCODE -ne 0) {
                        throw 'Foundry agent deployment failed.'
                    }

                    $generatedFoundryOutput = Join-Path $repoRoot "tools/foundry/output/$foundryEnvironmentName/foundry-deployment.json"
                    if (-not (Test-Path $generatedFoundryOutput)) {
                        throw "Foundry deployment output was not generated: $generatedFoundryOutput"
                    }

                    $foundryOutput = Get-Content $generatedFoundryOutput | ConvertFrom-Json

                    if ($foundryOutput.settings.PSObject.Properties.Name -contains 'FoundryAgent__SqlPlannerAgentRef' -and -not [string]::IsNullOrWhiteSpace($foundryOutput.settings.FoundryAgent__SqlPlannerAgentRef)) {
                        $foundrySqlPlannerAgentRef = $foundryOutput.settings.FoundryAgent__SqlPlannerAgentRef
                    }

                    if ($foundryOutput.settings.PSObject.Properties.Name -contains 'FoundryAgent__ResultInterpreterAgentRef' -and -not [string]::IsNullOrWhiteSpace($foundryOutput.settings.FoundryAgent__ResultInterpreterAgentRef)) {
                        $foundryResultInterpreterAgentRef = $foundryOutput.settings.FoundryAgent__ResultInterpreterAgentRef
                    }

                    if ($foundryOutput.settings.PSObject.Properties.Name -contains 'FoundryAgent__ConciergeAgentRef' -and -not [string]::IsNullOrWhiteSpace($foundryOutput.settings.FoundryAgent__ConciergeAgentRef)) {
                        $foundryConciergeAgentRef = $foundryOutput.settings.FoundryAgent__ConciergeAgentRef
                    }

                    @{
                        projectEndpoint = $foundryProjectEndpoint
                        projectResourceId = $foundryProjectResourceId
                        tenantId = $foundryTenantId
                        settings = $foundryOutput.settings
                        generatedAtUtc = [DateTime]::UtcNow.ToString('o')
                    } | ConvertTo-Json -Depth 10 | Set-Content -Path $foundryOutputsPath
                }
                else {
                    @{
                        projectEndpoint = $foundryProjectEndpoint
                        projectResourceId = $foundryProjectResourceId
                        tenantId = $foundryTenantId
                        settings = @{
                            FoundryAgent__ProjectEndpoint = $foundryProjectEndpoint
                            FoundryAgent__SqlPlannerAgentRef = $foundrySqlPlannerAgentRef
                            FoundryAgent__ResultInterpreterAgentRef = $foundryResultInterpreterAgentRef
                            FoundryAgent__ConciergeAgentRef = $foundryConciergeAgentRef
                        }
                        generatedAtUtc = [DateTime]::UtcNow.ToString('o')
                    } | ConvertTo-Json -Depth 10 | Set-Content -Path $foundryOutputsPath
                }

                $completedPhases.Add($phase)
            }
            'Configure' {
                Write-Phase $phase 'Configuring app settings, connection strings and optional Foundry RBAC'

                $outputs = Get-Content $outputsPath | ConvertFrom-Json
                $context = Resolve-InfrastructureContext -Outputs $outputs -ResourceGroupName $resourceGroupName
                $functionAppName = $context.functionAppName
                $functionAppHostname = $context.functionAppHostname
                $functionAppPrincipalId = $context.functionAppPrincipalId
                $webAppName = $context.webAppName
                $webAppHostname = $context.webAppHostname
                $sqlServerFqdn = $context.sqlServerFqdn
                $analyticsDbName = $context.analyticsDbName
                $appDbName = $context.appDbName
                $openAiName = $context.openAiName
                $openAiEndpoint = $context.openAiEndpoint
                $contentSafetyEndpoint = $context.contentSafetyEndpoint
                $appInsightsConnectionString = $context.appInsightsConnectionString
                $keyVaultName = $context.keyVaultName

                if ($foundryAutoConfigureFunctionIdentity) {
                    $functionAppPrincipalId = Ensure-FunctionManagedIdentity -ResourceGroupName $resourceGroupName -FunctionAppName $functionAppName
                }

                $openAiApiKey = Invoke-AzCli -Arguments @('cognitiveservices', 'account', 'keys', 'list', '--resource-group', $resourceGroupName, '--name', $openAiName, '--query', 'key1', '-o', 'tsv')
                $analyticsConnectionString = "Server=tcp:$sqlServerFqdn,1433;Initial Catalog=$analyticsDbName;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;User ID=$sqlAdminLogin;Password=$sqlAdminPassword;"
                $appDbConnectionString = "Server=tcp:$sqlServerFqdn,1433;Initial Catalog=$appDbName;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;User ID=$sqlAdminLogin;Password=$sqlAdminPassword;"
                $appDbConnectionStringKvRef = "@Microsoft.KeyVault(SecretUri=https://$keyVaultName.vault.azure.net/secrets/sql-connection-string)"
                $appInsightsConnectionStringKvRef = "@Microsoft.KeyVault(SecretUri=https://$keyVaultName.vault.azure.net/secrets/appinsights-connection-string)"
                $frontendTemplateTokens = @{
                    Prefix = $prefix
                    WebAppHostname = $webAppHostname
                    FunctionAppHostname = $functionAppHostname
                }
                $redirectUri = if ([string]::IsNullOrWhiteSpace($config.Frontend.RedirectUri)) {
                    "https://$webAppHostname"
                }
                else {
                    Resolve-TemplateValue -Value $config.Frontend.RedirectUri -Tokens $frontendTemplateTokens
                }
                $postLogoutRedirectUri = if ([string]::IsNullOrWhiteSpace($config.Frontend.PostLogoutRedirectUri)) {
                    $redirectUri
                }
                else {
                    Resolve-TemplateValue -Value $config.Frontend.PostLogoutRedirectUri -Tokens $frontendTemplateTokens
                }

                if ($authAutoConfigureSpaRedirectUris) {
                    Ensure-SpaRedirectUris -ClientId $authClientId -RequiredUris @($redirectUri, $postLogoutRedirectUri)
                }
                else {
                    Write-WarnLine 'Automatic SPA redirect URI sync is disabled (Auth.AutoConfigureSpaRedirectUris=false).'
                }

                if (Test-Path $foundryOutputsPath) {
                    $resolvedFoundry = Get-Content $foundryOutputsPath | ConvertFrom-Json
                    $foundryProjectEndpoint = $resolvedFoundry.projectEndpoint
                    $foundryProjectResourceId = $resolvedFoundry.projectResourceId
                    $foundryTenantId = if ([string]::IsNullOrWhiteSpace($resolvedFoundry.tenantId)) { $foundryTenantId } else { $resolvedFoundry.tenantId }
                    if ($resolvedFoundry.settings.PSObject.Properties.Name -contains 'FoundryAgent__SqlPlannerAgentRef') {
                        $foundrySqlPlannerAgentRef = $resolvedFoundry.settings.FoundryAgent__SqlPlannerAgentRef
                    }
                    if ($resolvedFoundry.settings.PSObject.Properties.Name -contains 'FoundryAgent__ResultInterpreterAgentRef') {
                        $foundryResultInterpreterAgentRef = $resolvedFoundry.settings.FoundryAgent__ResultInterpreterAgentRef
                    }
                    if ($resolvedFoundry.settings.PSObject.Properties.Name -contains 'FoundryAgent__ConciergeAgentRef') {
                        $foundryConciergeAgentRef = $resolvedFoundry.settings.FoundryAgent__ConciergeAgentRef
                    }
                }

                if ([string]::IsNullOrWhiteSpace($foundryProjectEndpoint) -or
                    [string]::IsNullOrWhiteSpace($foundrySqlPlannerAgentRef) -or
                    [string]::IsNullOrWhiteSpace($foundryResultInterpreterAgentRef) -or
                    [string]::IsNullOrWhiteSpace($foundryConciergeAgentRef)) {
                    throw 'Foundry configuration is incomplete. Ensure the Foundry phase succeeded or provide manual Foundry settings in Deploy.Configuration.psd1.'
                }

                $foundrySettings = @(
                    "FoundryAgent__ProjectEndpoint=$foundryProjectEndpoint",
                    "FoundryAgent__TenantId=$foundryTenantId",
                    "FoundryAgent__SqlPlannerAgentRef=$foundrySqlPlannerAgentRef",
                    "FoundryAgent__ResultInterpreterAgentRef=$foundryResultInterpreterAgentRef",
                    "FoundryAgent__ConciergeAgentRef=$foundryConciergeAgentRef"
                )

                if (Test-Path $foundryOutputsPath) {
                    $resolvedFoundry = Get-Content $foundryOutputsPath | ConvertFrom-Json
                    if ($resolvedFoundry.settings.PSObject.Properties.Name -contains 'FoundryAgent__VisualizationPlannerAgentId' -and -not [string]::IsNullOrWhiteSpace($resolvedFoundry.settings.FoundryAgent__VisualizationPlannerAgentId)) {
                        $foundrySettings += "FoundryAgent__VisualizationPlannerAgentId=$($resolvedFoundry.settings.FoundryAgent__VisualizationPlannerAgentId)"
                    }
                }

                $functionSettings = @(
                    "SqlConnectionString=$analyticsConnectionString",
                    "DatabaseConnectionString=$appDbConnectionStringKvRef",
                    "AppDbConnectionString=$appDbConnectionStringKvRef",
                    "AzureOpenAI__Endpoint=$openAiEndpoint",
                    "AzureOpenAI__Deployment=$($config.AzureOpenAI.DeploymentName)",
                    "AzureOpenAI__ApiKey=$openAiApiKey",
                    "ContentSafety__Endpoint=$contentSafetyEndpoint",
                    "Auth__AuthorityHost=$($config.Auth.AuthorityHost)",
                    "Auth__ClientId=$authClientId",
                    "Auth__AllowedAudiences=$($allowedAudiences -join ',')",
                    "APPLICATIONINSIGHTS_CONNECTION_STRING=$appInsightsConnectionStringKvRef",
                    'SemanticKernel__EnableDemoEndpoint=false'
                )

                $functionSettings += $foundrySettings

                $functionSettingsMap = @{}
                foreach ($setting in $functionSettings) {
                    $parts = $setting.Split('=', 2)
                    if ($parts.Count -eq 2) {
                        $functionSettingsMap[$parts[0]] = $parts[1]
                    }
                }

                Set-AppServiceAppSettingsViaArm -SubscriptionId $subscriptionId -ResourceGroupName $resourceGroupName -SiteName $functionAppName -Settings $functionSettingsMap

                $webSettings = @(
                    "API_BASE_URL=https://$functionAppHostname",
                    "NEXT_PUBLIC_AZURE_AD_CLIENT_ID=$authClientId",
                    "NEXT_PUBLIC_AZURE_AD_AUTHORITY=$frontendAuthority",
                    "NEXT_PUBLIC_REDIRECT_URI=$redirectUri",
                    "NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI=$postLogoutRedirectUri",
                    "APPLICATIONINSIGHTS_CONNECTION_STRING=$appInsightsConnectionString",
                    'SCM_DO_BUILD_DURING_DEPLOYMENT=false',
                    'ENABLE_ORYX_BUILD=false'
                )

                Invoke-AzCli -Arguments (@('webapp', 'config', 'appsettings', 'set', '--resource-group', $resourceGroupName, '--name', $webAppName, '--settings') + $webSettings + @('-o', 'none')) | Out-Null
                Invoke-AzCli -Arguments @('webapp', 'config', 'set', '--resource-group', $resourceGroupName, '--name', $webAppName, '--startup-file', 'node server.js', '-o', 'none') | Out-Null

                if ($foundryAutoAssignFunctionRole) {
                    $foundryRoleScope = Resolve-FoundryRoleScope -FoundryProjectResourceId $foundryProjectResourceId -FoundryProjectEndpoint $foundryProjectEndpoint -ResourceGroupName $resourceGroupName

                    if ([string]::IsNullOrWhiteSpace($foundryRoleScope)) {
                        Write-WarnLine 'Could not resolve Foundry RBAC scope from Foundry.ProjectResourceId or Foundry project endpoint. Skipping automatic role assignment.'
                    }
                    elseif ([string]::IsNullOrWhiteSpace($functionAppPrincipalId)) {
                        Write-WarnLine 'Function App managed identity principalId is empty. Skipping automatic role assignment.'
                    }
                    else {
                        Write-Info "Assigning Foundry RBAC role '$foundryRoleDefinitionName' to Function App managed identity"
                        try {
                            Ensure-RoleAssignment -PrincipalId $functionAppPrincipalId -RoleDefinitionName $foundryRoleDefinitionName -Scope $foundryRoleScope
                        }
                        catch {
                            Write-WarnLine "Foundry RBAC assignment failed. Continue after validating permissions manually. Error: $($_.Exception.Message)"
                        }
                    }
                }
                else {
                    Write-WarnLine 'Automatic Foundry RBAC assignment is disabled (Foundry.AutoAssignFunctionRole=false).'
                }

                $completedPhases.Add($phase)
            }
            'Database' {
                Write-Phase $phase 'Bootstrapping application and analytics databases'

                $outputs = Get-Content $outputsPath | ConvertFrom-Json
                $context = Resolve-InfrastructureContext -Outputs $outputs -ResourceGroupName $resourceGroupName
                $sqlServerFqdn = $context.sqlServerFqdn
                $sqlServerName = $context.sqlServerName
                $storageAccountName = $context.storageAccountName
                $analyticsDbName = $context.analyticsDbName
                $appDbName = $context.appDbName

                $clientIpAddress = Get-PublicIpAddress
                if (-not [string]::IsNullOrWhiteSpace($clientIpAddress)) {
                    $firewallRuleName = "Client-$($clientIpAddress.Replace('.', '-'))"
                    Write-Info "Ensuring SQL firewall rule '$firewallRuleName' for client IP $clientIpAddress"
                    Invoke-AzCli -Arguments @(
                        'sql', 'server', 'firewall-rule', 'create',
                        '--resource-group', $resourceGroupName,
                        '--server', $sqlServerName,
                        '--name', $firewallRuleName,
                        '--start-ip-address', $clientIpAddress,
                        '--end-ip-address', $clientIpAddress,
                        '-o', 'none'
                    ) | Out-Null
                }
                else {
                    Write-WarnLine 'Could not determine the current public IP address. Database bootstrap may fail if the SQL server does not already allow this client IP.'
                }

                if ($databaseImportBacpac) {
                    $resolvedBacpacPath = Join-Path $repoRoot $databaseBacpacFile
                    Write-Info "Database.Bacpac import is enabled. Path: '$resolvedBacpacPath'."
                    Invoke-BacpacImport -ResourceGroupName $resourceGroupName -StorageAccountName $storageAccountName -SqlServerName $sqlServerName -SqlAdminLogin $sqlAdminLogin -SqlAdminPassword $sqlAdminPassword -BacpacFilePath $resolvedBacpacPath -ContainerName $databaseContainerName -DatabaseName $databaseBacpacDatabaseName -ServiceObjective $databaseServiceObjective -PollIntervalSeconds $databaseImportPollIntervalSeconds -TimeoutMinutes $databaseImportTimeoutMinutes
                }

                Invoke-SqlFile -Server $sqlServerFqdn -Database $appDbName -User $sqlAdminLogin -Password $sqlAdminPassword -FilePath (Join-Path $repoRoot 'database/create_app_tables.sql')

                $analyticsScripts = @(
                    Get-ChildItem -Path (Join-Path $repoRoot 'database/schema') -File | Sort-Object Name
                    Get-ChildItem -Path (Join-Path $repoRoot 'database/seed') -File | Sort-Object Name
                )

                foreach ($script in $analyticsScripts) {
                    Invoke-SqlFile -Server $sqlServerFqdn -Database $analyticsDbName -User $sqlAdminLogin -Password $sqlAdminPassword -FilePath $script.FullName
                }

                $completedPhases.Add($phase)
            }
            'DeployApi' {
                Write-Phase $phase 'Publishing Azure Functions backend and deploying package'

                $outputs = Get-Content $outputsPath | ConvertFrom-Json
                $functionAppName = Get-OutputValue -Outputs $outputs -Name 'functionAppName' -Required
                $publishDir = Join-Path $artifactsDir 'backend-publish'
                $zipPath = Join-Path $artifactsDir 'backend-package.zip'

                if (Test-Path $publishDir) {
                    Remove-Item $publishDir -Recurse -Force
                }

                dotnet publish (Join-Path $repoRoot 'backend/src/Functions.Api/Functions.Api.csproj') -c Release -o $publishDir | Out-Host
                New-ZipFromDirectory -SourceDirectory $publishDir -ZipPath $zipPath
                Invoke-AzCli -Arguments @('functionapp', 'deployment', 'source', 'config-zip', '--resource-group', $resourceGroupName, '--name', $functionAppName, '--src', $zipPath, '-o', 'none') | Out-Null

                $completedPhases.Add($phase)
            }
            'DeployWeb' {
                Write-Phase $phase 'Building Next.js standalone bundle and deploying it to Azure App Service'

                $outputs = Get-Content $outputsPath | ConvertFrom-Json
                $context = Resolve-InfrastructureContext -Outputs $outputs -ResourceGroupName $resourceGroupName
                $webAppName = $context.webAppName
                $webAppHostname = $context.webAppHostname
                $functionAppHostname = $context.functionAppHostname
                $frontendPackageDir = Join-Path $artifactsDir 'frontend-package'
                $zipPath = Join-Path $artifactsDir 'frontend-package.zip'
                $frontendTemplateTokens = @{
                    Prefix = $prefix
                    WebAppHostname = $webAppHostname
                    FunctionAppHostname = $functionAppHostname
                }
                $redirectUri = if ([string]::IsNullOrWhiteSpace($config.Frontend.RedirectUri)) {
                    "https://$webAppHostname"
                }
                else {
                    Resolve-TemplateValue -Value $config.Frontend.RedirectUri -Tokens $frontendTemplateTokens
                }
                $postLogoutRedirectUri = if ([string]::IsNullOrWhiteSpace($config.Frontend.PostLogoutRedirectUri)) {
                    $redirectUri
                }
                else {
                    Resolve-TemplateValue -Value $config.Frontend.PostLogoutRedirectUri -Tokens $frontendTemplateTokens
                }
                $frontendBuildEnvironment = @{
                    API_BASE_URL = "https://$functionAppHostname"
                    NEXT_PUBLIC_AZURE_AD_CLIENT_ID = $authClientId
                    NEXT_PUBLIC_AZURE_AD_AUTHORITY = $frontendAuthority
                    NEXT_PUBLIC_REDIRECT_URI = $redirectUri
                    NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI = $postLogoutRedirectUri
                }

                Build-FrontendPackage -SourceRoot (Join-Path $repoRoot 'frontend') -DestinationRoot $frontendPackageDir -BuildEnvironment $frontendBuildEnvironment
                New-ZipFromDirectory -SourceDirectory $frontendPackageDir -ZipPath $zipPath

                # WebApp deploy tracking can produce false negatives if cold-start exceeds CLI timeout.
                # We disable CLI startup tracking and verify readiness via HTTP, which reflects real availability.
                Invoke-AzCli -Arguments @('webapp', 'deploy', '--resource-group', $resourceGroupName, '--name', $webAppName, '--src-path', $zipPath, '--type', 'zip', '--clean', 'true', '--restart', 'true', '--track-status', 'false', '-o', 'none') | Out-Null

                $deployWebReady = Wait-ForHttp -Url ("https://$webAppHostname") -MaxAttempts 30 -DelaySeconds 10 -SuccessStatusFloor 200 -SuccessStatusCeiling 499
                if (-not $deployWebReady) {
                    Write-WarnLine "Web app did not become reachable right after deployment. The Verify phase will perform a final smoke check."
                }

                $completedPhases.Add($phase)
            }
            'Verify' {
                Write-Phase $phase 'Running smoke checks against frontend and backend endpoints'

                $outputs = Get-Content $outputsPath | ConvertFrom-Json
                $context = Resolve-InfrastructureContext -Outputs $outputs -ResourceGroupName $resourceGroupName
                $functionAppHostname = $context.functionAppHostname
                $webAppHostname = $context.webAppHostname
                $frontendUrl = "https://$webAppHostname"
                $backendUrl = "https://$functionAppHostname"

                $frontendOk = Wait-ForHttp -Url $frontendUrl
                $backendOk = Wait-ForHttp -Url $backendUrl -SuccessStatusFloor 200 -SuccessStatusCeiling 499

                if (-not $frontendOk) {
                    throw "Frontend smoke test failed. Re-run with -ResumeFrom Verify after checking the Web App logs."
                }

                if (-not $backendOk) {
                    throw "Backend smoke test failed. Re-run with -ResumeFrom Verify after checking the Function App logs."
                }

                Write-Info "Frontend URL: $frontendUrl"
                Write-Info "Backend URL: $backendUrl"
                Write-WarnLine 'If interactive login succeeds but query execution fails, validate the existing app registration redirect URIs and Foundry permissions for the Function App managed identity.'
                $completedPhases.Add($phase)
            }
        }

        Save-State -CurrentPhase $phase -CompletedPhases $completedPhases.ToArray() -Status 'completed' -Message 'Phase completed.'
        Show-DeploymentProgress -PhaseIndex $phaseIndex -PhaseTotal $phaseOrder.Count -PhaseName $phase -Message 'Fase completada' -Completed
    }

    Complete-DeploymentProgress
    Write-Host ('=' * 88) -ForegroundColor Green
    Write-Host '[avance] Despliegue completado (100%)' -ForegroundColor Green
}
catch {
    Complete-DeploymentProgress
    $message = $_.Exception.Message
    Save-State -CurrentPhase $currentPhase -CompletedPhases $completedPhases.ToArray() -Status 'failed' -Message $message
    Write-Host "[error] $message" -ForegroundColor Red
    if ($completedPhases.Count -lt $phaseOrder.Count) {
        $nextPhase = $currentPhase
        Write-WarnLine "To continue after fixing the issue, re-run: .\deploy\Invoke-FullDeployment.ps1 -ConfigPath '$ConfigPath' -ResumeFrom $nextPhase"
    }
    throw
}