@description('Application or workload name, for example insightforge')
param workloadName string

@description('Environment name, for example dev, qa, prod')
@allowed([
  'dev'
  'qa'
  'prod'
  'test'
  'uat'
  'sbx'
])
param environmentName string

@description('Optional instance identifier, for example 01 or shared')
param instance string = ''

@description('Seed used to generate a stable or random unique suffix')
param uniqueSeed string = resourceGroup().id

@description('Length of the generated suffix')
@minValue(4)
@maxValue(8)
param suffixLength int = 5

var normalizedWorkload = toLower(replace(replace(workloadName, '_', '-'), ' ', '-'))
var normalizedEnvironment = toLower(replace(replace(environmentName, '_', '-'), ' ', '-'))
var normalizedInstance = empty(instance) ? '' : toLower(replace(replace(instance, '_', '-'), ' ', '-'))

var baseName = empty(normalizedInstance)
  ? '${normalizedWorkload}-${normalizedEnvironment}'
  : '${normalizedWorkload}-${normalizedEnvironment}-${normalizedInstance}'

var compactBaseName = toLower(replace(baseName, '-', ''))
var suffix = take(uniqueString(uniqueSeed), suffixLength)

var standardPrefix = baseName
var standardPrefixWithSuffix = '${baseName}-${suffix}'

var names = {
  base: baseName
  baseWithSuffix: standardPrefixWithSuffix
  suffix: suffix

  appInsights: take('${baseName}-appi-${suffix}', 260)
  logAnalytics: take('${baseName}-law-${suffix}', 63)

  functionPlanWindows: take('${baseName}-planwin-${suffix}', 40)
  functionAppWindows: take('${baseName}-func-${suffix}', 60)

  webPlanLinux: take('${baseName}-planlnx-${suffix}', 40)
  webAppLinux: take('${baseName}-web-${suffix}', 60)

  appServicePlan: take('${baseName}-plan-${suffix}', 40)
  apiManagement: take('${baseName}-apim-${suffix}', 50)
  applicationGateway: take('${baseName}-agw-${suffix}', 80)
  frontDoor: take('${baseName}-fd-${suffix}', 64)

  sqlServer: take('${baseName}-sql-${suffix}', 63)
  sqlDatabase: take('${baseName}-db', 128)
  cosmosAccount: take('${baseName}-cosmos-${suffix}', 44)
  redis: take('${baseName}-redis-${suffix}', 63)

  keyVault: take('${baseName}-kv-${suffix}', 24)

  openAi: take('${baseName}-aoai-${suffix}', 64)
  contentSafety: take('${baseName}-cs-${suffix}', 64)
  aiSearch: take('${baseName}-srch-${suffix}', 60)

  serviceBusNamespace: take('${baseName}-sb-${suffix}', 50)
  eventGridTopic: take('${baseName}-egt-${suffix}', 64)

  storage: take('${compactBaseName}st${suffix}', 24)
  storageAccount: take('${compactBaseName}st${suffix}', 24)

  vnet: take('${baseName}-vnet-${suffix}', 64)
  subnetApp: take('${baseName}-snet-app', 80)
  subnetData: take('${baseName}-snet-data', 80)
  privateEndpoint: take('${baseName}-pep-${suffix}', 64)
  privateDnsZone: take('${baseName}-pdns-${suffix}', 64)

  acr: take('${compactBaseName}acr${suffix}', 50)
  aks: take('${baseName}-aks-${suffix}', 63)
}

output baseName string = baseName
output compactBaseName string = compactBaseName
output suffix string = suffix
output standardPrefix string = standardPrefix
output standardPrefixWithSuffix string = standardPrefixWithSuffix
output names object = names
