param openAiName string
param contentSafetyName string
param location string
param openAiDeploymentName string
param openAiModelName string
param openAiModelVersion string
param openAiCapacity int = 10

resource openAi 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: openAiName
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
  }
}

resource openAiDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  name: openAiDeploymentName
  parent: openAi
  sku: {
    name: 'Standard'
    capacity: openAiCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: openAiModelName
      version: openAiModelVersion
    }
  }
}

resource contentSafety 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: contentSafetyName
  location: location
  kind: 'ContentSafety'
  sku: {
    name: 'S0'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
  }
}

output openAiEndpoint string = openAi.properties.endpoint
output contentSafetyEndpoint string = contentSafety.properties.endpoint
