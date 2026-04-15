param(
    [Parameter(Mandatory = $false)]
    [string]$SubscriptionId = "",

    [Parameter(Mandatory = $false)]
    [string]$ResourceGroup = "",

    [Parameter(Mandatory = $false)]
    [string]$StorageAccountName = "",

    [Parameter(Mandatory = $false)]
    [string]$SqlConnectionString = "",

    [Parameter(Mandatory = $false)]
    [string]$SqlServerName = "",

    [Parameter(Mandatory = $false)]
    [string]$SqlDatabaseName = "",

    [Parameter(Mandatory = $false)]
    [string]$SqlUser = "",

    [Parameter(Mandatory = $false)]
    [string]$SqlPassword = "",

    [Parameter(Mandatory = $false)]
    [string]$AzureOpenAiEndpoint = "",

    [Parameter(Mandatory = $false)]
    [string]$AzureOpenAiDeployment = "",

    [Parameter(Mandatory = $false)]
    [string]$ContentSafetyEndpoint = "",

    [Parameter(Mandatory = $false)]
    [string]$FrontendPath = "frontend",

    [Parameter(Mandatory = $false)]
    [int]$FrontendPort = 3000,

    [Parameter(Mandatory = $false)]
    [switch]$SkipBuild,

    [Parameter(Mandatory = $false)]
    [switch]$SkipBackend,

    [Parameter(Mandatory = $false)]
    [switch]$SkipFrontend
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "[start-local-dev] $Message"
}

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' is not installed or not available in PATH."
    }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$frontendFullPath = Resolve-Path (Join-Path $repoRoot $FrontendPath)
$logsDir = Join-Path $repoRoot ".logs"

if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

if (-not $SkipBackend) {
    Write-Step "Starting backend (Azure Functions)"
    $backendArgs = @{
        SubscriptionId = $SubscriptionId
        ResourceGroup = $ResourceGroup
        StorageAccountName = $StorageAccountName
        SqlConnectionString = $SqlConnectionString
        SqlServerName = $SqlServerName
        SqlDatabaseName = $SqlDatabaseName
        SqlUser = $SqlUser
        SqlPassword = $SqlPassword
        AzureOpenAiEndpoint = $AzureOpenAiEndpoint
        AzureOpenAiDeployment = $AzureOpenAiDeployment
        ContentSafetyEndpoint = $ContentSafetyEndpoint
    }

    if ($SkipBuild) {
        $backendArgs["SkipBuild"] = $true
    }

    & (Join-Path $PSScriptRoot "start-local-functions.ps1") @backendArgs
}

if (-not $SkipFrontend) {
    Require-Command "npm"

    Write-Step "Stopping stale Next.js processes for this workspace"
    Get-CimInstance Win32_Process |
        Where-Object {
            $_.Name -eq "node.exe" -and
            $_.CommandLine -match "QueryPilotAI\\frontend" -and
            $_.CommandLine -match "next"
        } |
        ForEach-Object {
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        }

    $frontendStdoutLog = Join-Path $logsDir "frontend.stdout.log"
    $frontendStderrLog = Join-Path $logsDir "frontend.stderr.log"

    Write-Step "Starting frontend (Next.js) in background"
    $frontendProc = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev", "--", "--port", "$FrontendPort") -WorkingDirectory $frontendFullPath -PassThru -RedirectStandardOutput $frontendStdoutLog -RedirectStandardError $frontendStderrLog

    Write-Step "Waiting for frontend health endpoint"
    $frontendReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        try {
            $status = Invoke-WebRequest -UseBasicParsing -Method Get -Uri "http://localhost:$FrontendPort" -TimeoutSec 5
            if ($status.StatusCode -ge 200 -and $status.StatusCode -lt 500) {
                $frontendReady = $true
                break
            }
        }
        catch {
            # Keep polling until timeout.
        }
    }

    if (-not $frontendReady) {
        Write-Step "Frontend did not become healthy in time."
        if (-not $frontendProc.HasExited) {
            Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue
        }
        throw "Frontend startup timed out. Check logs at $frontendStdoutLog and $frontendStderrLog"
    }

    Write-Step "Frontend is healthy (http://localhost:$FrontendPort). PID: $($frontendProc.Id)"
    Write-Step "Logs: $frontendStdoutLog"
}

Write-Step "Local development environment is ready."