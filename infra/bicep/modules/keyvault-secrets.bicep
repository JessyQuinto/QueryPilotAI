@description('Key Vault name')
param keyVaultName string

@secure()
@description('Secret values to store in Key Vault')
param secretValues object

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource azureWebJobsStorageSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'azure-webjobs-storage'
  parent: keyVault
  properties: {
    value: string(secretValues.azureWebJobsStorage)
  }
}

resource sqlConnectionStringSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'sql-connection-string'
  parent: keyVault
  properties: {
    value: string(secretValues.sqlConnectionString)
  }
}

resource sqlAdminLoginSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'sql-admin-login'
  parent: keyVault
  properties: {
    value: string(secretValues.sqlAdminLogin)
  }
}

resource sqlAdminPasswordSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'sql-admin-password'
  parent: keyVault
  properties: {
    value: string(secretValues.sqlAdminPassword)
  }
}

resource appInsightsConnectionStringSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'appinsights-connection-string'
  parent: keyVault
  properties: {
    value: string(secretValues.appInsightsConnectionString)
  }
}

resource azureOpenAiEndpointSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'azure-openai-endpoint'
  parent: keyVault
  properties: {
    value: string(secretValues.azureOpenAiEndpoint)
  }
}

resource contentSafetyEndpointSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'content-safety-endpoint'
  parent: keyVault
  properties: {
    value: string(secretValues.contentSafetyEndpoint)
  }
}

output azureWebJobsStorageSecretUri string = azureWebJobsStorageSecret.properties.secretUriWithVersion
output sqlConnectionStringSecretUri string = sqlConnectionStringSecret.properties.secretUriWithVersion
output sqlAdminLoginSecretUri string = sqlAdminLoginSecret.properties.secretUriWithVersion
output sqlAdminPasswordSecretUri string = sqlAdminPasswordSecret.properties.secretUriWithVersion
output appInsightsConnectionStringSecretUri string = appInsightsConnectionStringSecret.properties.secretUriWithVersion
output azureOpenAiEndpointSecretUri string = azureOpenAiEndpointSecret.properties.secretUriWithVersion
output contentSafetyEndpointSecretUri string = contentSafetyEndpointSecret.properties.secretUriWithVersion
