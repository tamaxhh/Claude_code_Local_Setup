# PowerShell: Quick health check — tests proxy + agent backend
# Run from anywhere: .\scripts\test-proxy.ps1

Write-Host "Testing Claude Local Agent services..." -ForegroundColor Cyan

# 1. Test Proxy health
Write-Host "`n[1] Proxy health (port 3000):" -ForegroundColor Yellow
try {
    $proxy = Invoke-RestMethod -Uri "http://localhost:3000/" -Method GET -TimeoutSec 5
    Write-Host "    OK: $($proxy.message)" -ForegroundColor Green
}
catch {
    Write-Host "    FAIL: Proxy not running. Start with .\scripts\start-all.ps1" -ForegroundColor Red
}

# 2. Test Agent Backend health
Write-Host "`n[2] Agent Backend health (port 4000):" -ForegroundColor Yellow
try {
    $agent = Invoke-RestMethod -Uri "http://localhost:4000/" -Method GET -TimeoutSec 5
    Write-Host "    OK: $($agent.message)" -ForegroundColor Green
}
catch {
    Write-Host "    FAIL: Agent backend not running. Start with .\scripts\start-all.ps1" -ForegroundColor Red
}

# 3. Test a real agent call
Write-Host "`n[3] Sending test question to agent..." -ForegroundColor Yellow
try {
    $body = @{ question = "Write a hello world function in JavaScript"; mode = "local" } | ConvertTo-Json
    $result = Invoke-RestMethod -Uri "http://localhost:4000/agent/complete" -Method POST `
        -Body $body -ContentType "application/json" -TimeoutSec 60
    Write-Host "    OK! Tools used: $($result.tools_used -join ', ')" -ForegroundColor Green
    Write-Host "    Answer preview: $($result.answer.Substring(0, [Math]::Min(200, $result.answer.Length)))..." -ForegroundColor White
}
catch {
    Write-Host "    FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nDone." -ForegroundColor Cyan
