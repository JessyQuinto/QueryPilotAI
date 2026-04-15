@description('Web App name')
param webAppName string

@description('Linux App Service Plan name')
param webPlanName string

@description('Azure location')
param location string

@description('Node.js runtime stack')
@allowed([
  'NODE|18-lts'
  'NODE|20-lts'
  'NODE|22-lts'
  'NODE|24-lts'
])
param linuxFxVersion string = 'NODE|20-lts'

resource hostingPlan 'Microsoft.Web/serverfarms@2023-12-01' existing = {
  name: webPlanName
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      alwaysOn: true
      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
      ]
    }
  }
}

resource webAppConfig 'Microsoft.Web/sites/config@2023-12-01' = {
  name: 'web'
  parent: webApp
  properties: {
    linuxFxVersion: linuxFxVersion
    minTlsVersion: '1.2'
    ftpsState: 'Disabled'
    alwaysOn: true
  }
}

output webAppName string = webApp.name
output webAppId string = webApp.id
output principalId string = webApp.identity.principalId
