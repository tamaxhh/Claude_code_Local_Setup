# PowerShell: Stop all local agent services
# Kills node processes listening on ports 3000 and 4000

Write-Host "Stopping Claude Local Agent services..." -ForegroundColor Cyan

@(3000, 4000) | ForEach-Object {
    $port = $_
    $connections = netstat -ano | Select-String ":$port " | Where-Object { $_ -match "LISTENING" }
    foreach ($conn in $connections) {
        $parts = ($conn -split '\s+') | Where-Object { $_ -ne '' }
        $pid = $parts[-1]
        if ($pid -match '^\d+$') {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "  Killed PID $pid (port $port)" -ForegroundColor Yellow
        }
    }
}

Write-Host "Done." -ForegroundColor Green
