@description('Linux App Service Plan name')
param planName string

@description('Azure location')
param location string

@description('SKU name')
param skuName string = 'B1'

@description('SKU tier')
param skuTier string = 'Basic'

resource servicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: {
    name: skuName
    tier: skuTier
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

output planName string = servicePlan.name
output planId string = servicePlan.id
