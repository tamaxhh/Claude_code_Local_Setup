function Ask-AI {
  param($prompt)
  $body = @{
    model="qwen2.5-coder:7b"
    messages=@(@{role="user"; content=$prompt})
    max_tokens=500
  } | ConvertTo-Json -Depth 10

  Invoke-WebRequest -Uri http://localhost:3000/v1/messages `
    -Method POST `
    -Headers @{'Content-Type'='application/json'; 'x-api-key'='local-model'} `
    -Body $body `
  | ConvertFrom-Json | % { $_.content[0].text }
}

function Ask-Agent {
  param($question)
$body = @{query=$question} | ConvertTo-Json

  Invoke-WebRequest -Uri http://localhost:4000/agent/complete `
    -Method POST `
    -Headers @{'Content-Type'='application/json'} `
    -Body $body `
  | ConvertFrom-Json | % answer
}

Write-Host "Type 1 = basic | 2 = agent | exit to quit"

while ($true) {
  $mode = Read-Host "Mode (1/2)"

  if ($mode -eq "exit") { break }

  if ($mode -eq "1") {
    Ask-AI (Read-Host "Ask AI")
  }
  elseif ($mode -eq "2") {
    Ask-Agent (Read-Host "Ask Agent (project-aware)")
  }
}