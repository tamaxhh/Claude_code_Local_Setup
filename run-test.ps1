$body = @{ question = "Write a hello world function in JavaScript"; mode = "local" } | ConvertTo-Json
$result = Invoke-RestMethod -Uri "http://localhost:4000/agent/complete" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 60
Write-Host "Tools used: $($result.tools_used -join ', ')"
Write-Host "Answer: $($result.answer.Substring(0, [Math]::Min(200, $result.answer.Length)))..."
