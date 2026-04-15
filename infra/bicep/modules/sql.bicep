@description('Azure location')
param location string

@description('SQL Server name')
param sqlServerName string

@description('SQL Database name')
param databaseName string

@description('SQL administrator login')
param administratorLogin string

@description('SQL administrator password')
@secure()
param administratorLoginPassword string

@description('SQL database SKU name')
param databaseSkuName string = 'Basic'

@description('SQL database SKU tier')
param databaseSkuTier string = 'Basic'

@description('Enable public network access on SQL Server')
param publicNetworkAccessEnabled bool = true

@description('Allow Azure services to access SQL Server')
param allowAzureServices bool = true

resource sqlServer 'Microsoft.Sql/servers@2021-11-01' = {
  name: sqlServerName
  location: location
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    publicNetworkAccess: publicNetworkAccessEnabled ? 'Enabled' : 'Disabled'
    version: '12.0'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2021-11-01' = {
  name: databaseName
  parent: sqlServer
  location: location
  sku: {
    name: databaseSkuName
    tier: databaseSkuTier
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
  }
}

resource firewallRuleAllowAzure 'Microsoft.Sql/servers/firewallRules@2021-11-01' = if (allowAzureServices) {
  name: 'AllowAzureServices'
  parent: sqlServer
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

output sqlServerName string = sqlServer.name
output sqlServerId string = sqlServer.id
output sqlDatabaseName string = sqlDatabase.name
output sqlDatabaseId string = sqlDatabase.id
