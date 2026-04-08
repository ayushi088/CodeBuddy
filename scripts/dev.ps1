$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$pythonExe = Join-Path $repoRoot '.venv\Scripts\python.exe'
$pythonApp = Join-Path $repoRoot 'python-ai\main.py'
$nextCmd = Join-Path $repoRoot 'node_modules\.bin\next.cmd'

if (-not (Test-Path $pythonExe)) {
  throw "Python executable not found at $pythonExe"
}

if (-not (Test-Path $nextCmd)) {
  throw "Next.js executable not found at $nextCmd"
}

$pythonJob = $null

try {
  $healthUrl = 'http://127.0.0.1:8000/health'
  $ready = $false
  try {
    Invoke-RestMethod -Uri $healthUrl -TimeoutSec 1 | Out-Null
    $ready = $true
    Write-Host 'Python AI helper already running on port 8000. Reusing it.'
  } catch {
    Write-Host 'Starting Python AI helper on http://127.0.0.1:8000 ...'
    $pythonJob = Start-Job -ScriptBlock {
      param($pythonExePath, $pythonAppPath)
      Set-Location (Split-Path -Parent $pythonAppPath)
      & $pythonExePath $pythonAppPath --mode api --host 127.0.0.1 --port 8000
    } -ArgumentList $pythonExe, $pythonApp

    for ($i = 0; $i -lt 60 -and -not $ready; $i++) {
      try {
        Invoke-RestMethod -Uri $healthUrl -TimeoutSec 1 | Out-Null
        $ready = $true
      } catch {
        Start-Sleep -Milliseconds 500
      }
    }
  }
  if (-not $ready) {
    throw 'Python AI helper failed to start on port 8000.'
  }

  Write-Host 'Starting Next.js on http://localhost:3000 ...'
  Set-Location $repoRoot
  & $nextCmd dev -p 3000 --hostname localhost
}
finally {
  if ($pythonJob) {
    Stop-Job -Job $pythonJob -ErrorAction SilentlyContinue
    Remove-Job -Job $pythonJob -Force -ErrorAction SilentlyContinue
  }
}