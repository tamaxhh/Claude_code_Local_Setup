# PowerShell: Start Self-Extending Agent services
# Run from: c:/My Project/Claude_local_setup/
# Usage: .\scripts\start-all.ps1

Write-Host "Starting Self-Extending Agent (ADKGoogle features ported)..." -ForegroundColor Cyan

# Start Proxy (port 3000, Ollama compat)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\proxy'; npm install; node index.js" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start Self-Extending Agent Backend (port 4000, skills/UI)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\agent-backend'; npm install; npm start" -WindowStyle Normal

Write-Host ""
Write-Host "Services launched:" -ForegroundColor Green
Write-Host "  Proxy: http://localhost:3000/v1 (Ollama compat)" -ForegroundColor Yellow
Write-Host "  Agent: http://localhost:4000" -ForegroundColor Yellow
Write-Host "  UI:    http://localhost:4000/ui ← Self-extending chat!" -ForegroundColor Magenta
Write-Host "  Skills: http://localhost:4000/skills" -ForegroundColor Magenta
Write-Host ""
Write-Host "Test: Open UI, ask 'explain redis in node js' twice (creates/reuses skill)" -ForegroundColor Cyan

