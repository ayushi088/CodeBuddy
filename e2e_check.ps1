$ErrorActionPreference = "Continue"
$pyOut = Join-Path $env:TEMP "studybuddy_py_out.log"
$pyErr = Join-Path $env:TEMP "studybuddy_py_err.log"
$nextOut = Join-Path $env:TEMP "studybuddy_next_out.log"
$nextErr = Join-Path $env:TEMP "studybuddy_next_err.log"
Remove-Item $pyOut,$pyErr,$nextOut,$nextErr -ErrorAction SilentlyContinue
$pyProc = $null
$nextProc = $null
$startedPy = $false
$startedNext = $false
Write-Host "Starting StudyBuddy E2E check..."
try {
  $reusePy = $false
  $reuseNext = $false

  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 1 | Out-Null
    $reusePy = $true
    Write-Host "Python AI API already running on port 8000. Reusing it."
  } catch {}

  try {
    $existingNext = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 1
    if($existingNext.StatusCode -ge 200) {
      $reuseNext = $true
      Write-Host "Next.js app already running on port 3000. Reusing it."
    }
  } catch {}

  if(-not $reusePy) {
    $pyProc = Start-Process -FilePath "C:\Projects\StudyBuddy\.venv\Scripts\python.exe" -ArgumentList "main.py --mode api --host 127.0.0.1 --port 8000" -WorkingDirectory "C:\Projects\StudyBuddy\python-ai" -RedirectStandardOutput $pyOut -RedirectStandardError $pyErr -PassThru
    $startedPy = $true
  }

  if(-not $reuseNext) {
    $nextProc = Start-Process -FilePath "C:\Users\padha\AppData\Roaming\npm\pnpm.cmd" -ArgumentList "dev" -WorkingDirectory "C:\Projects\StudyBuddy" -RedirectStandardOutput $nextOut -RedirectStandardError $nextErr -PassThru
    $startedNext = $true
  }

  $pyReady = $false
  $nextReady = $false
  for($i=0; $i -lt 80 -and -not ($pyReady -and $nextReady); $i++) {
    if($i % 5 -eq 0) {
      Write-Host ("Waiting for services... attempt {0}/80 | PY_READY={1} NEXT_READY={2}" -f ($i + 1), $pyReady, $nextReady)
    }

    if(-not $pyReady) {
      try { Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 1 | Out-Null; $pyReady = $true } catch {}
    }
    if(-not $nextReady) {
      try { $r = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 1; if($r.StatusCode -ge 200){ $nextReady = $true } } catch {}
    }

    Start-Sleep -Milliseconds 250
  }

  Write-Output "PY_READY=$pyReady"
  Write-Output "NEXT_READY=$nextReady"

  if(-not $pyReady) {
    Write-Output "FAIL_STAGE=python_health"
    Write-Output "PY_ERR_TAIL:"
    if(Test-Path $pyErr){ Get-Content $pyErr -Tail 40 }
    Write-Output "PY_OUT_TAIL:"
    if(Test-Path $pyOut){ Get-Content $pyOut -Tail 40 }
    exit 1
  }

  if(-not $nextReady) {
    Write-Output "FAIL_STAGE=next_home"
    Write-Output "NEXT_ERR_TAIL:"
    if(Test-Path $nextErr){ Get-Content $nextErr -Tail 80 }
    Write-Output "NEXT_OUT_TAIL:"
    if(Test-Path $nextOut){ Get-Content $nextOut -Tail 80 }
    exit 1
  }

  $sampleImagePath = "C:\Projects\StudyBuddy\python-ai\model\user.jpg"
  if(Test-Path $sampleImagePath) {
    $bytes = [System.IO.File]::ReadAllBytes($sampleImagePath)
    $img = "data:image/jpeg;base64," + [System.Convert]::ToBase64String($bytes)
  } else {
    Write-Host "Sample image not found at $sampleImagePath. Falling back to tiny PNG test payload."
    $img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+cZ1EAAAAASUVORK5CYII="
  }
  $payload = @{ image = $img; userId = "e2e-check" } | ConvertTo-Json -Compress
  try {
    $resp = Invoke-RestMethod -Uri "http://localhost:3000/api/ai/analyze" -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 30
    Write-Output "POST_OK=true"
    Write-Output ("RESPONSE_JSON=" + ($resp | ConvertTo-Json -Depth 10 -Compress))
    $simTrue = $false
    if($resp.PSObject.Properties.Name -contains "simulated") { if($resp.simulated -eq $true){ $simTrue = $true } }
    Write-Output "SIMULATED_TRUE=$simTrue"
  } catch {
    Write-Output "FAIL_STAGE=post_analyze"
    Write-Output ("POST_ERROR=" + $_.Exception.Message)
    if($_.ErrorDetails -and $_.ErrorDetails.Message){ Write-Output ("POST_ERROR_DETAILS=" + $_.ErrorDetails.Message) }
    exit 1
  }
}
finally {
  if($startedPy -and $pyProc -and -not $pyProc.HasExited){ Stop-Process -Id $pyProc.Id -Force -ErrorAction SilentlyContinue; Write-Output "STOPPED_PY_PID=$($pyProc.Id)" }
  if($startedNext -and $nextProc -and -not $nextProc.HasExited){ Stop-Process -Id $nextProc.Id -Force -ErrorAction SilentlyContinue; Write-Output "STOPPED_NEXT_PID=$($nextProc.Id)" }
}
