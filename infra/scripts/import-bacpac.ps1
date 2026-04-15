param(
    [Parameter(Mandatory = $true)]
    [SecureString]$SqlAdminPassword,

    [string]$ParametersFile = "./parameters/dev.parameters.json",
    [string]$DeploymentName = "main",
    [string]$BacpacFile = "./dbs/Clinic.bacpac",
    [string]$ContainerName = "bacpac",
    [string]$DatabaseName = "",
    [string]$ServiceObjective = "S0"
)

$ErrorActionPreference = 'Stop'

function Convert-SecureStringToPlainText {
    param(
        [Parameter(Mandatory = $true)]
        [SecureString]$SecureValue
    )

    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    }
    finally {
        if ($bstr -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    }
}

function Assert-AzLogin {
    $null = az account show 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "No hay sesión activa en Azure CLI. Ejecuta 'az login' primero."
    }
}

function Assert-FileExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        throw "No existe el archivo: $Path"
    }
}

function Get-JsonParameterValue {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Json,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $value = $Json.parameters.$Name.value
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "El parámetro '$Name' no está definido en el archivo de parámetros."
    }

    return $value
}

Assert-AzLogin
Assert-FileExists -Path $ParametersFile
Assert-FileExists -Path $BacpacFile

# Leer parámetros del ambiente
try {
    $paramsJson = Get-Content $ParametersFile -Raw | ConvertFrom-Json
}
catch {
    throw "No fue posible leer $ParametersFile como JSON válido. Detalle: $($_.Exception.Message)"
}

$workloadName = Get-JsonParameterValue -Json $paramsJson -Name "workloadName"
$environmentName = Get-JsonParameterValue -Json $paramsJson -Name "environmentName"
$sqlAdminLogin = Get-JsonParameterValue -Json $paramsJson -Name "sqlAdminLogin"

$resourceGroupName = "rg-$workloadName-$environmentName"

Write-Host "Resource Group detectado: $resourceGroupName"

# Obtener outputs del deployment principal
$deploymentJson = az deployment group show `
    --resource-group $resourceGroupName `
    --name $DeploymentName `
    -o json | ConvertFrom-Json

if (-not $deploymentJson.properties.outputs) {
    throw "El deployment '$DeploymentName' no tiene outputs disponibles en el RG '$resourceGroupName'."
}

$outputs = $deploymentJson.properties.outputs

$storageAccountName = $outputs.storageAccountName.value
$sqlServerName = $outputs.sqlServerName.value

if ([string]::IsNullOrWhiteSpace($storageAccountName)) {
    throw "No se pudo obtener 'storageAccountName' desde los outputs del deployment."
}

if ([string]::IsNullOrWhiteSpace($sqlServerName)) {
    throw "No se pudo obtener 'sqlServerName' desde los outputs del deployment."
}

# Si no envían nombre de DB, usar el nombre del bacpac sin extensión
if ([string]::IsNullOrWhiteSpace($DatabaseName)) {
    $DatabaseName = [System.IO.Path]::GetFileNameWithoutExtension($BacpacFile)
}

$BacpacFileResolved = (Resolve-Path $BacpacFile).Path
$BacpacBlobName = [System.IO.Path]::GetFileName($BacpacFileResolved)

Write-Host "Storage Account: $storageAccountName"
Write-Host "SQL Server: $sqlServerName"
Write-Host "Database: $DatabaseName"
Write-Host "BACPAC: $BacpacFileResolved"
Write-Host "Container: $ContainerName"

# Obtener key del storage
$storageKey = az storage account keys list `
    --account-name $storageAccountName `
    --resource-group $resourceGroupName `
    --query "[0].value" -o tsv

if ([string]::IsNullOrWhiteSpace($storageKey)) {
    throw "No fue posible obtener la key del Storage Account '$storageAccountName'."
}

# Crear contenedor si no existe
Write-Host "Creando/validando contenedor '$ContainerName'..."
az storage container create `
    --name $ContainerName `
    --account-name $storageAccountName `
    --account-key $storageKey `
    --only-show-errors | Out-Null

# Subir BACPAC
Write-Host "Subiendo BACPAC al Storage..."
az storage blob upload `
    --account-name $storageAccountName `
    --account-key $storageKey `
    --container-name $ContainerName `
    --file $BacpacFileResolved `
    --name $BacpacBlobName `
    --overwrite true `
    --only-show-errors | Out-Null

# Crear DB si no existe
$dbExists = az sql db show `
    --resource-group $resourceGroupName `
    --server $sqlServerName `
    --name $DatabaseName `
    --query "name" -o tsv 2>$null

if ([string]::IsNullOrWhiteSpace($dbExists)) {
    Write-Host "Creando base de datos '$DatabaseName'..."
    az sql db create `
        --resource-group $resourceGroupName `
        --server $sqlServerName `
        --name $DatabaseName `
        --service-objective $ServiceObjective `
        --only-show-errors | Out-Null
}
else {
    Write-Host "La base de datos '$DatabaseName' ya existe. Se reutilizará para el import."
}

# Importar BACPAC
$sqlAdminPasswordPlain = Convert-SecureStringToPlainText -SecureValue $SqlAdminPassword
$storageUri = "https://$storageAccountName.blob.core.windows.net/$ContainerName/$BacpacBlobName"

Write-Host "Iniciando import del BACPAC..."
az sql db import `
    --resource-group $resourceGroupName `
    --server $sqlServerName `
    --name $DatabaseName `
    --admin-user $sqlAdminLogin `
    --admin-password $sqlAdminPasswordPlain `
    --storage-key-type StorageAccessKey `
    --storage-key $storageKey `
    --storage-uri $storageUri `
    --only-show-errors

Write-Host "Proceso finalizado."
Write-Host "RG: $resourceGroupName"
Write-Host "Storage: $storageAccountName"
Write-Host "SQL Server: $sqlServerName"
Write-Host "Database: $DatabaseName"
Write-Host "BACPAC URI: $storageUri"