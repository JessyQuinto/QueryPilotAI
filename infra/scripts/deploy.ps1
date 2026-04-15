param(
    [Parameter(Mandatory = $true)]
    [string]$Location,

    [Parameter(Mandatory = $true)]
    [SecureString]$SqlAdminPassword,

    [string]$TemplateFile = "./bicep/main.bicep",
    [string]$ParametersFile = "./parameters/dev.parameters.json",

    [switch]$WhatIf,
    [switch]$RandomSuffix
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $TemplateFile)) {
    throw "No existe el archivo template: $TemplateFile"
}

if (-not (Test-Path $ParametersFile)) {
    throw "No existe el archivo de parámetros: $ParametersFile"
}

# Leer parámetros del archivo JSON
try {
    $paramsJson = Get-Content $ParametersFile -Raw | ConvertFrom-Json
}
catch {
    throw "No fue posible leer $ParametersFile como JSON válido. Detalle: $($_.Exception.Message)"
}

$workloadName = $paramsJson.parameters.workloadName.value
$environmentName = $paramsJson.parameters.environmentName.value

if ([string]::IsNullOrWhiteSpace($workloadName)) {
    throw "workloadName no está definido en $ParametersFile"
}

if ([string]::IsNullOrWhiteSpace($environmentName)) {
    throw "environmentName no está definido en $ParametersFile"
}

# Construcción automática del Resource Group
$ResourceGroupName = "rg-$workloadName-$environmentName"

# Obtener subscription actual
$subscriptionId = az account show --query id -o tsv
if (-not $subscriptionId) {
    throw "No se pudo obtener la suscripción actual. Verifica que estés autenticado con Azure CLI."
}

# Seed estable o random
if ($RandomSuffix) {
    $uniqueSeed = [guid]::NewGuid().ToString()
    Write-Host "Modo RandomSuffix habilitado. uniqueSeed generado: $uniqueSeed"
}
else {
    $uniqueSeed = "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroupName"
    Write-Host "Modo suffix estable. uniqueSeed calculado: $uniqueSeed"
}

# Convertir SecureString a texto plano solo en memoria
$BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SqlAdminPassword)
try {
    $SqlAdminPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

    Write-Host "Creando/validando resource group $ResourceGroupName en $Location..."
    az group create --name $ResourceGroupName --location $Location | Out-Null

    Write-Host "Ejecutando despliegue Bicep..."

    if ($WhatIf) {
        az deployment group what-if `
            --resource-group $ResourceGroupName `
            --template-file $TemplateFile `
            --parameters @$ParametersFile `
            --parameters sqlAdminPassword="$SqlAdminPasswordPlain" `
            --parameters uniqueSeed="$uniqueSeed" `
            --parameters location="$Location"
    }
    else {
        az deployment group create `
            --resource-group $ResourceGroupName `
            --template-file $TemplateFile `
            --parameters @$ParametersFile `
            --parameters sqlAdminPassword="$SqlAdminPasswordPlain" `
            --parameters uniqueSeed="$uniqueSeed" `
            --parameters location="$Location"
    }
}
finally {
    if ($BSTR -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    }
}