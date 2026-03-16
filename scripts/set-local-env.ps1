# Set local environment variables for Claude Local setup (Windows PowerShell)
# Run this from the project root:
# .\scripts\set-local-env.ps1

$env:CLAUDE_CODE_GIT_BASH_PATH = "C:\Users\tamash62\AppData\Local\Programs\Git\bin\bash.exe"
$env:ANTHROPIC_BASE_URL = "http://localhost:3000"
$env:ANTHROPIC_API_KEY = "local-model"

Write-Host "Environment set:" -ForegroundColor Green
Write-Host "  CLAUDE_CODE_GIT_BASH_PATH=$env:CLAUDE_CODE_GIT_BASH_PATH"
Write-Host "  ANTHROPIC_BASE_URL=$env:ANTHROPIC_BASE_URL"
Write-Host "  ANTHROPIC_API_KEY=$env:ANTHROPIC_API_KEY"
Write-Host "Run: claude \"Hello\"" -ForegroundColor Cyan
