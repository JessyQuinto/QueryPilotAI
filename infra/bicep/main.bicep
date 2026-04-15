targetScope = 'resourceGroup'

@description('Application or workload name')
param workloadName string = 'insightforge'

@description('Environment name')
@allowed([
  'dev'
  'qa'
  'prod'
  'test'
  'uat'
  'sbx'
])
param environmentName string = 'dev'

@description('Optional instance identifier')
param instance string = ''

@description('Location for deployed resources')
param location string = resourceGroup().location

@description('Seed used to generate naming suffix')
param uniqueSeed string = resourceGroup().id

@description('SQL administrator login')
param sqlAdminLogin string

@secure()
@description('SQL administrator password')
param sqlAdminPassword string

@description('Azure OpenAI deployment name')
param openAiDeploymentName string = 'gpt-4o-mini'

@description('Azure OpenAI model name')
param openAiModelName string = 'gpt-4o-mini'

@description('Azure OpenAI model version')
param openAiModelVersion string = '2024-07-18'

@description('Azure OpenAI capacity')
param openAiCapacity int = 10

@description('SQL database SKU')
param sqlDbSkuName string = 'Basic'

@description('SQL database SKU tier')
param sqlDbSkuTier string = 'Basic'

@description('Allow public network access to SQL')
param sqlPublicNetworkAccess bool = true

@description('Allow Azure services to access SQL')
param allowAzureServicesToSql bool = true

@description('Node.js runtime for Linux Web App')
@allowed([
  'NODE|18-lts'
  'NODE|20-lts'
  'NODE|22-lts'
  'NODE|24-lts'
])
param webLinuxFxVersion string = 'NODE|20-lts'

@description('Azure Functions runtime version')
param functionsExtensionVersion string = '~4'

module naming './modules/naming.bicep' = {
  name: 'namingDeployment'
  params: {
    workloadName: workloadName
    environmentName: environmentName
    instance: instance
    uniqueSeed: uniqueSeed
    suffixLength: 5
  }
}

module storage './modules/storage.bicep' = {
  name: 'storageDeployment'
  params: {
    location: location
    storageAccountName: naming.outputs.names.storage
  }
}

module monitoring './modules/monitoring.bicep' = {
  name: 'monitoringDeployment'
  params: {
    location: location
    logAnalyticsName: naming.outputs.names.logAnalytics
    appInsightsName: naming.outputs.names.appInsights
  }
}

module keyVault './modules/keyvault.bicep' = {
  name: 'keyVaultDeployment'
  params: {
    location: location
    keyVaultName: naming.outputs.names.keyVault
    tenantId: subscription().tenantId
  }
}

module sql './modules/sql.bicep' = {
  name: 'sqlDeployment'
  params: {
    location: location
    sqlServerName: naming.outputs.names.sqlServer
    databaseName: naming.outputs.names.sqlDatabase
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    databaseSkuName: sqlDbSkuName
    databaseSkuTier: sqlDbSkuTier
    publicNetworkAccessEnabled: sqlPublicNetworkAccess
    allowAzureServices: allowAzureServicesToSql
  }
}

module ai './modules/ai-services.bicep' = {
  name: 'aiServicesDeployment'
  params: {
    location: location
    openAiName: naming.outputs.names.openAi
    contentSafetyName: naming.outputs.names.contentSafety
    openAiDeploymentName: openAiDeploymentName
    openAiModelName: openAiModelName
    openAiModelVersion: openAiModelVersion
    openAiCapacity: openAiCapacity
  }
}

var storageConnectionString = storage.outputs.storageConnectionString
var sqlServerSuffix = environment().suffixes.sqlServerHostname
var normalizedSqlServerSuffix = startsWith(sqlServerSuffix, '.') ? sqlServerSuffix : '.${sqlServerSuffix}'
var sqlServerFqdn = '${sql.outputs.sqlServerName}${normalizedSqlServerSuffix}'
var sqlConnectionString = 'Server=tcp:${sqlServerFqdn},1433;Initial Catalog=${sql.outputs.sqlDatabaseName};Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;User ID=${sqlAdminLogin};Password=${sqlAdminPassword};'

module appSecrets './modules/keyvault-secrets.bicep' = {
  name: 'keyVaultSecretsDeployment'
  params: {
    keyVaultName: keyVault.outputs.keyVaultName
    secretValues: {
      azureWebJobsStorage: storageConnectionString
      sqlConnectionString: sqlConnectionString
      sqlAdminLogin: sqlAdminLogin
      sqlAdminPassword: sqlAdminPassword
      appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
      azureOpenAiEndpoint: ai.outputs.openAiEndpoint
      contentSafetyEndpoint: ai.outputs.contentSafetyEndpoint
    }
  }
}

module functionPlanWindows './modules/appserviceplan-windows.bicep' = {
  name: 'functionPlanWindowsDeployment'
  params: {
    planName: naming.outputs.names.functionPlanWindows
    location: location
  }
}

module functionAppWindows './modules/functionapp-windows-dotnet.bicep' = {
  name: 'functionAppWindowsDeployment'
  params: {
    location: location
    functionAppName: naming.outputs.names.functionAppWindows
    functionPlanName: functionPlanWindows.outputs.planName
    azureWebJobsStorageSecretUri: appSecrets.outputs.azureWebJobsStorageSecretUri
    sqlConnectionStringSecretUri: appSecrets.outputs.sqlConnectionStringSecretUri
    appInsightsConnectionStringSecretUri: appSecrets.outputs.appInsightsConnectionStringSecretUri
    azureOpenAiEndpointSecretUri: appSecrets.outputs.azureOpenAiEndpointSecretUri
    contentSafetyEndpointSecretUri: appSecrets.outputs.contentSafetyEndpointSecretUri
    azureOpenAiDeploymentName: openAiDeploymentName
    functionsExtensionVersion: functionsExtensionVersion
  }
}

module webPlanLinux './modules/appserviceplan-linux.bicep' = {
  name: 'webPlanLinuxDeployment'
  params: {
    planName: naming.outputs.names.webPlanLinux
    location: location
  }
}

module webAppLinux './modules/webapp-linux-node.bicep' = {
  name: 'webAppLinuxDeployment'
  params: {
    location: location
    webAppName: naming.outputs.names.webAppLinux
    webPlanName: webPlanLinux.outputs.planName
    linuxFxVersion: webLinuxFxVersion
  }
}

module keyVaultAccess './modules/keyvault-rbac.bicep' = {
  name: 'keyVaultRbacDeployment'
  params: {
    keyVaultName: keyVault.outputs.keyVaultName
    principalId: functionAppWindows.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

output functionAppName string = naming.outputs.names.functionAppWindows
output webAppName string = naming.outputs.names.webAppLinux
output functionPlanName string = naming.outputs.names.functionPlanWindows
output webPlanName string = naming.outputs.names.webPlanLinux
output keyVaultName string = naming.outputs.names.keyVault
output storageAccountName string = naming.outputs.names.storage
output sqlServerName string = naming.outputs.names.sqlServer
output sqlDatabaseName string = naming.outputs.names.sqlDatabase
output openAiName string = naming.outputs.names.openAi
output contentSafetyName string = naming.outputs.names.contentSafety
