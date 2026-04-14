# Inicia o Expo com EXPO_PACKAGER_PROXY_URL a partir do túnel ngrok em localhost:4040.
# Uso: na pasta do projeto, após Metro estar na 8081, rode `ngrok http 8081` em outro terminal
# OU deixe este script iniciar o ngrok se a API local (4040) ainda não estiver no ar.

$ErrorActionPreference = "Stop"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

function Get-NgrokHttpsUrl {
  $resp = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 5
  $t = $resp.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
  if (-not $t) { throw "Nenhum túnel HTTPS encontrado na API do ngrok (127.0.0.1:4040)." }
  return $t.public_url.TrimEnd("/")
}

$hasNgrokApi = $false
try {
  Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2 | Out-Null
  $hasNgrokApi = $true
} catch {
  $hasNgrokApi = $false
}

if (-not $hasNgrokApi) {
  Write-Host "Iniciando ngrok em segundo plano (ngrok http 8081)..."
  Start-Process -FilePath "ngrok" -ArgumentList @("http", "8081") -WindowStyle Minimized
  $deadline = (Get-Date).AddSeconds(45)
  while ((Get-Date) -lt $deadline) {
    try {
      $url = Get-NgrokHttpsUrl
      if ($url) { break }
    } catch { }
    Start-Sleep -Milliseconds 500
  }
}

$proxyUrl = Get-NgrokHttpsUrl
Write-Host "EXPO_PACKAGER_PROXY_URL=$proxyUrl"
$env:EXPO_PACKAGER_PROXY_URL = $proxyUrl

# Libera a porta 8081 se um Metro antigo tiver ficado preso
$lines = netstat -ano | Select-String ":8081\s"
foreach ($line in $lines) {
  $parts = ($line.ToString() -split '\s+') | Where-Object { $_ -ne "" }
  $listenPid = [int]$parts[-1]
  if ($listenPid -gt 0) {
    try { Stop-Process -Id $listenPid -Force -ErrorAction SilentlyContinue } catch { }
  }
}

npx expo start --lan --port 8081
