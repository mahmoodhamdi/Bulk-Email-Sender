# ============================================================
# Bulk Email Sender - Docker Start Script (PowerShell)
# ============================================================
# Automatically finds available ports and starts containers
#
# Usage:
#   .\start.ps1                 # Use default ports
#   .\start.ps1 -AppPort 3001   # Start with specific app port
#   .\start.ps1 -NoWorker       # Skip worker container
# ============================================================

param(
    [int]$AppPort = 3000,
    [int]$DbPort = 5432,
    [int]$RedisPort = 6379,
    [int]$MaxAttempts = 10,
    [switch]$NoWorker,
    [switch]$NoBuild
)

# Colors
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    $args | Write-Output
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success($message) { Write-Host "[SUCCESS] $message" -ForegroundColor Green }
function Write-Info($message) { Write-Host "[INFO] $message" -ForegroundColor Blue }
function Write-Warning($message) { Write-Host "[WARNING] $message" -ForegroundColor Yellow }
function Write-Error($message) { Write-Host "[ERROR] $message" -ForegroundColor Red }

Write-Host "============================================================"
Write-Host "Bulk Email Sender - Docker Startup"
Write-Host "============================================================"
Write-Host ""

# Function to check if port is available
function Test-PortAvailable {
    param([int]$Port)
    try {
        $connection = New-Object Net.Sockets.TcpClient
        $connection.Connect("127.0.0.1", $Port)
        $connection.Close()
        return $false  # Port is in use
    }
    catch {
        return $true   # Port is available
    }
}

# Function to find available port
function Find-AvailablePort {
    param(
        [int]$StartPort,
        [string]$ServiceName
    )

    $port = $StartPort
    $attempts = 0

    while ($attempts -lt $MaxAttempts) {
        if (Test-PortAvailable -Port $port) {
            Write-Success "Using port $port for $ServiceName"
            return $port
        }
        Write-Warning "Port $port is busy, trying next..."
        $port++
        $attempts++
    }

    Write-Error "Could not find available port for $ServiceName after $MaxAttempts attempts"
    exit 1
}

# Find available ports
Write-Info "Checking port availability..."
Write-Host ""

$env:APP_PORT = Find-AvailablePort -StartPort $AppPort -ServiceName "App"
$env:DB_PORT = Find-AvailablePort -StartPort $DbPort -ServiceName "PostgreSQL"
$env:REDIS_PORT = Find-AvailablePort -StartPort $RedisPort -ServiceName "Redis"

Write-Host ""
Write-Host "============================================================"
Write-Host "Starting containers with ports:"
Write-Host "  App:      http://localhost:$($env:APP_PORT)"
Write-Host "  Postgres: localhost:$($env:DB_PORT)"
Write-Host "  Redis:    localhost:$($env:REDIS_PORT)"
Write-Host "============================================================"
Write-Host ""

# Change to docker directory
Push-Location $PSScriptRoot

try {
    # Build docker-compose command
    $composeArgs = @("up", "-d")
    if (-not $NoBuild) {
        $composeArgs += "--build"
    }

    # Run docker-compose
    $result = docker-compose @composeArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "============================================================"
        Write-Success "Containers started successfully!"
        Write-Host ""
        Write-Host "  Application: http://localhost:$($env:APP_PORT)"
        Write-Host "  Database:    postgresql://postgres:postgres@localhost:$($env:DB_PORT)/emailsender"
        Write-Host "  Redis:       redis://localhost:$($env:REDIS_PORT)"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  View logs:   docker-compose logs -f"
        Write-Host "  Stop:        docker-compose down"
        Write-Host "  Restart:     docker-compose restart"
        Write-Host "============================================================"

        # Save ports to file
        @"
APP_PORT=$($env:APP_PORT)
DB_PORT=$($env:DB_PORT)
REDIS_PORT=$($env:REDIS_PORT)
"@ | Out-File -FilePath ".ports" -Encoding utf8

        Write-Host ""
        Write-Info "Port configuration saved to docker/.ports"

        # Open browser
        $openBrowser = Read-Host "Open application in browser? (Y/n)"
        if ($openBrowser -ne 'n' -and $openBrowser -ne 'N') {
            Start-Process "http://localhost:$($env:APP_PORT)"
        }
    }
    else {
        Write-Host ""
        Write-Error "Failed to start containers"
        exit 1
    }
}
finally {
    Pop-Location
}
