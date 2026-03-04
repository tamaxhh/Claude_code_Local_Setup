# PowerShell: Start all services
# Run from: c:\My Project\Claude_local_setup\
# Usage: .\scripts\start-all.ps1

Write-Host "Starting Claude Local Agent services..." -ForegroundColor Cyan

# Start Proxy (port 3000)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\proxy'; npm install; node index.js" -WindowStyle Normal

Start-Sleep -Seconds 2

# Start Agent Backend (port 4000)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\agent-backend'; npm install; node index.js" -WindowStyle Normal

Write-Host ""
Write-Host "Services starting in separate windows:" -ForegroundColor Green
Write-Host "  Proxy:         http://localhost:3000" -ForegroundColor Yellow
Write-Host "  Agent Backend: http://localhost:4000" -ForegroundColor Yellow
Write-Host ""
Write-Host "To use Claude Code CLI with local model:" -ForegroundColor Cyan
Write-Host '  $env:ANTHROPIC_BASE_URL = "http://localhost:3000"' -ForegroundColor White
Write-Host '  $env:ANTHROPIC_API_KEY  = "local-model"' -ForegroundColor White
Write-Host "  claude" -ForegroundColor White
