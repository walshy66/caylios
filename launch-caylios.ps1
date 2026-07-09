$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

# Prefer npm-global shims over Corepack shims that can appear first on PATH.
$env:Path = "$env:APPDATA\npm;$env:Path"

$backendPort = 8000
$frontendPort = 5173
$backendUrl = "http://localhost:$backendPort"
$frontendUrl = "http://localhost:$frontendPort"

function Test-PortAvailable {
  param([int] $Port)

  $listener = $null
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($null -ne $listener) {
      try { $listener.Stop() } catch { }
    }
  }
}

function Assert-RequiredPortsAvailable {
  $requiredPorts = @(
    @{ Name = "Caylios backend"; Port = $backendPort },
    @{ Name = "Caylios frontend"; Port = $frontendPort }
  )

  foreach ($entry in $requiredPorts) {
    $Name = $entry.Name
    $Port = [int] $entry.Port
    if (-not (Test-PortAvailable -Port $Port)) {
      throw "Clear error: required port $Port ($Name) is already occupied. Stop the process using port $Port, then relaunch Caylios."
    }
  }
}

function Test-Url {
  param([string] $Url)
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

$python = "python"
$venvPython = Join-Path $repoRoot "backend\venv\Scripts\python.exe"
if (Test-Path $venvPython) {
  $python = $venvPython
}

Write-Host "Starting Caylios dev stack..." -ForegroundColor Cyan
Write-Host "Repo:     $repoRoot"
Write-Host "Backend:  $backendUrl"
Write-Host "Frontend: $frontendUrl"
Write-Host ""

Assert-RequiredPortsAvailable

$backendArgs = @(
  "-NoExit",
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-Command",
  "Set-Location '$repoRoot\backend'; & '$python' -m uvicorn app.main:app --reload --host 127.0.0.1 --port $backendPort"
)

$frontendArgs = @(
  "-NoExit",
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-Command",
  "Set-Location '$repoRoot\frontend'; npm run dev -- --host 127.0.0.1 --port $frontendPort"
)

Start-Process powershell.exe -ArgumentList $backendArgs -WindowStyle Normal
Start-Sleep -Seconds 2
Start-Process powershell.exe -ArgumentList $frontendArgs -WindowStyle Normal

Write-Host "Waiting for Caylios to become reachable..." -ForegroundColor Yellow
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
  if ((Test-Url -Url "$backendUrl/health") -and (Test-Url -Url $frontendUrl)) {
    Start-Process $frontendUrl
    Write-Host "Caylios is running. Browser opened to $frontendUrl" -ForegroundColor Green
    exit 0
  }
  Start-Sleep -Milliseconds 750
}

Write-Host "Caylios launcher started the dev windows, but readiness timed out." -ForegroundColor Yellow
Write-Host "Check the backend and frontend PowerShell windows for setup/config errors."
