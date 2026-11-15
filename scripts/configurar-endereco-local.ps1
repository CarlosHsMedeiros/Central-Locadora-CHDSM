$ErrorActionPreference = 'Stop'
$hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
$aliasName = 'central-locadora-chdsm'
$logDirectory = Join-Path $env:LOCALAPPDATA 'CentralLocadora'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
try {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Execute este instalador como administrador.' }
    $hostsText = [IO.File]::ReadAllText($hostsPath)
    $aliasLines = $hostsText -split '\r?\n' | Where-Object { ($_ -split '#', 2)[0] -match '(?i)(?:^|\s)central-locadora-chdsm(?:\s|$)' }
    if ($aliasLines) {
        if ($aliasLines | Where-Object { $_ -notmatch '^\s*127\.0\.0\.1\s' }) { throw 'Ja existe um endereco diferente para esse nome no Windows.' }
    } else {
        $backupPath = Join-Path $logDirectory ('hosts-antes-endereco-' + (Get-Date -Format 'yyyyMMddHHmmss') + '.bak')
        Copy-Item -LiteralPath $hostsPath -Destination $backupPath
        [IO.File]::AppendAllText($hostsPath, "`r`n127.0.0.1 central-locadora-chdsm # Central Locadora local`r`n", [Text.Encoding]::ASCII)
    }
    & netsh interface portproxy add v4tov4 listenport=80 listenaddress=127.0.0.1 connectport=3000 connectaddress=127.0.0.1
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel configurar a porta local.' }
    & ipconfig /flushdns | Out-Null
    Set-Content -LiteralPath (Join-Path $logDirectory 'endereco-local-status.txt') -Value 'OK' -Encoding ASCII
} catch {
    Set-Content -LiteralPath (Join-Path $logDirectory 'endereco-local-status.txt') -Value ('ERRO: ' + $_.Exception.Message) -Encoding UTF8
    exit 1
}
