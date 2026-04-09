$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$venvDir = Join-Path $repoRoot '.venv'
$pythonExe = Join-Path $repoRoot '.venv\Scripts\python.exe'
$pythonApp = Join-Path $repoRoot 'python-ai\main.py'
$nextCmd = Join-Path $repoRoot 'node_modules\.bin\next.cmd'

function Get-SeedPython {
  if (Get-Command py -ErrorAction SilentlyContinue) {
    return @('py', @('-3'))
  }

  if (Get-Command python -ErrorAction SilentlyContinue) {
    return @('python', @())
  }

  throw 'Python was not found on PATH. Install Python 3 and ensure `py` or `python` is available.'
}

function Ensure-Venv {
  if (Test-Path $pythonExe) {
    return
  }

  Write-Host "Python virtual environment not found at $venvDir. Creating it now..."
  $seed = Get-SeedPython
  $seedCmd = $seed[0]
  $seedArgs = $seed[1]

  & $seedCmd @seedArgs -m venv $venvDir

  if (-not (Test-Path $pythonExe)) {
    throw "Failed to create virtual environment at $venvDir"
  }
}

function Ensure-PythonDeps {
  $requiredPackages = @('fastapi', 'uvicorn', 'opencv-python', 'numpy', 'ultralytics', 'mediapipe')

  $checkCode = "import importlib.util as u;mods=['fastapi','uvicorn','cv2','numpy','ultralytics','mediapipe'];missing=[m for m in mods if u.find_spec(m) is None];print(','.join(missing))"
  $missingOutputRaw = & $pythonExe -c $checkCode
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to validate required Python modules.'
  }

  $missingOutput = ($missingOutputRaw | Out-String).Trim()
  if ([string]::IsNullOrWhiteSpace($missingOutput)) {
    return
  }

  Write-Host 'Installing missing Python dependencies for python-ai...'
  & $pythonExe -m pip install --upgrade pip
  & $pythonExe -m pip install @requiredPackages
}

Ensure-Venv
Ensure-PythonDeps

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