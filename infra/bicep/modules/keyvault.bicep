@description('Key Vault name')
param keyVaultName string

@description('Azure location')
param location string

@description('Tenant ID for the Key Vault')
param tenantId string

@description('Enable purge protection')
param enablePurgeProtection bool = true

@description('Enable soft delete (always true in new KV)')
param enableSoftDelete bool = true

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    tenantId: tenantId

    sku: {
      family: 'A'
      name: 'standard'
    }

    enableSoftDelete: enableSoftDelete
    enablePurgeProtection: enablePurgeProtection

    // 🔐 Usar RBAC en lugar de access policies
    enableRbacAuthorization: true

    // 🌐 Para pruebas (luego puedes restringir)
    publicNetworkAccess: 'Enabled'

    // 🔒 Seguridad básica
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: false

    // Opcional (puedes dejar vacío)
    accessPolicies: []
  }
}

output keyVaultName string = keyVault.name
output keyVaultId string = keyVault.id
output keyVaultUri string = keyVault.properties.vaultUri
