# start-dev.ps1

Remove-Item "$env:TEMP\cf-tunnel.log" -ErrorAction SilentlyContinue

# ✅ Apenas um tunnel para a porta 8081
Start-Process cloudflared -ArgumentList "tunnel --url http://127.0.0.1:8081 --logfile $env:TEMP\cf-tunnel.log" -NoNewWindow

Write-Host "Aguardando URL do tunnel..."

$tunnelUrl = ""
while (-not $tunnelUrl) {
    Start-Sleep -Seconds 1
    $log = Get-Content "$env:TEMP\cf-tunnel.log" -ErrorAction SilentlyContinue
    $tunnelUrl = $log | Select-String -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' |
                 ForEach-Object { $_.Matches[0].Value } | Select-Object -First 1
}

Write-Host "Tunnel: $tunnelUrl"

$tunnelHost = $tunnelUrl -replace 'https://', ''
[System.Environment]::SetEnvironmentVariable("REACT_NATIVE_PACKAGER_HOSTNAME", $tunnelHost, "Process")
[System.Environment]::SetEnvironmentVariable("EXPO_PACKAGER_PROXY_URL", $tunnelUrl, "Process")
[System.Environment]::SetEnvironmentVariable("EXPO_DEV_SERVER_PROXY_URL", $tunnelUrl, "Process")
[System.Environment]::SetEnvironmentVariable("WDS_SOCKET_HOST", $tunnelHost, "Process")
[System.Environment]::SetEnvironmentVariable("PUBLIC_URL", $tunnelUrl, "Process")
[System.Environment]::SetEnvironmentVariable("WEBPACK_PUBLIC_URL", $tunnelUrl, "Process")

Start-Process powershell -ArgumentList "-Command `"cd '$PWD'; `$env:REACT_NATIVE_PACKAGER_HOSTNAME='$tunnelHost'; `$env:EXPO_PACKAGER_PROXY_URL='$tunnelUrl'; `$env:EXPO_DEV_SERVER_PROXY_URL='$tunnelUrl'; `$env:WDS_SOCKET_HOST='$tunnelHost'; `$env:PUBLIC_URL='$tunnelUrl'; `$env:WEBPACK_PUBLIC_URL='$tunnelUrl'; npx expo start --web`"" -NoNewWindow

Write-Host "Aguardando servidor iniciar na porta 8081..."
while (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 8081 -InformationLevel Quiet -WarningAction SilentlyContinue)) {
    Start-Sleep -Seconds 2
}

Write-Host "Pronto!"
Start-Process $tunnelUrl
Write-Host "Mobile e Web: $tunnelUrl"