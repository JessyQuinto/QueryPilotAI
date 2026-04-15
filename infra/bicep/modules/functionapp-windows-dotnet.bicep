@description('Function App name')
param functionAppName string

@description('Windows App Service Plan name')
param functionPlanName string

@description('Azure location')
param location string

@description('AzureWebJobsStorage secret URI in Key Vault')
param azureWebJobsStorageSecretUri string

@description('SQL connection string secret URI in Key Vault')
param sqlConnectionStringSecretUri string

@description('Application Insights connection string secret URI in Key Vault')
param appInsightsConnectionStringSecretUri string

@description('Azure OpenAI endpoint secret URI in Key Vault')
param azureOpenAiEndpointSecretUri string

@description('Content Safety endpoint secret URI in Key Vault')
param contentSafetyEndpointSecretUri string

@description('Azure OpenAI deployment name')
param azureOpenAiDeploymentName string

@description('Functions runtime version')
param functionsExtensionVersion string = '~4'

resource hostingPlan 'Microsoft.Web/serverfarms@2023-12-01' existing = {
  name: functionPlanName
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlan.id
    httpsOnly: true
    keyVaultReferenceIdentity: 'SystemAssigned'
    siteConfig: {
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: '@Microsoft.KeyVault(SecretUri=${azureWebJobsStorageSecretUri})'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: functionsExtensionVersion
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'dotnet-isolated'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: '@Microsoft.KeyVault(SecretUri=${appInsightsConnectionStringSecretUri})'
        }
        {
          name: 'SqlConnectionString'
          value: '@Microsoft.KeyVault(SecretUri=${sqlConnectionStringSecretUri})'
        }
        {
          name: 'AzureOpenAI__Endpoint'
          value: '@Microsoft.KeyVault(SecretUri=${azureOpenAiEndpointSecretUri})'
        }
        {
          name: 'AzureOpenAI__Deployment'
          value: azureOpenAiDeploymentName
        }
        {
          name: 'ContentSafety__Endpoint'
          value: '@Microsoft.KeyVault(SecretUri=${contentSafetyEndpointSecretUri})'
        }
      ]
    }
  }
}

resource functionAppConfig 'Microsoft.Web/sites/config@2023-12-01' = {
  name: 'web'
  parent: functionApp
  properties: {
    alwaysOn: true
    minTlsVersion: '1.2'
    ftpsState: 'Disabled'
    vnetRouteAllEnabled: false
  }
}

output functionAppName string = functionApp.name
output functionAppId string = functionApp.id
output principalId string = functionApp.identity.principalId
