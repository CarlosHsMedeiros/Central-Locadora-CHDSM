param([switch]$Abrir)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$systemUrl = 'http://central-locadora-chdsm/LOCADORA_PAGINA_INICIAL.HTML'
$mutex = New-Object System.Threading.Mutex($false, 'Local\CentralLocadoraServidor')
$ownsMutex = $false
try {
    $ownsMutex = $mutex.WaitOne(0)
    if (-not $ownsMutex) {
        if ($Abrir) { Start-Process $systemUrl }
        exit
    }
    Set-Location -LiteralPath $projectRoot
    $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
    $logDirectory = Join-Path $env:LOCALAPPDATA 'CentralLocadora'
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    $openPending = [bool]$Abrir
    while ($true) {
        $listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
        if ($listener) {
            if ($openPending) { Start-Process $systemUrl; $openPending = $false }
            Start-Sleep -Seconds 5
            continue
        }
        $nodeProcess = Start-Process -FilePath $nodePath -ArgumentList 'server.js' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'servidor.log') -RedirectStandardError (Join-Path $logDirectory 'erros.log')
        if ($openPending) {
            for ($attempt = 0; $attempt -lt 30; $attempt++) {
                if ($nodeProcess.HasExited) { break }
                if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) {
                    Start-Process $systemUrl
                    $openPending = $false
                    break
                }
                Start-Sleep -Seconds 1
            }
        }
        $nodeProcess.WaitForExit()
        Start-Sleep -Seconds 5
    }
} finally {
    if ($ownsMutex) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
