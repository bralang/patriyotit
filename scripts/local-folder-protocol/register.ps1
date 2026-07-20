# One-time setup: registers the openlocal:// URL protocol for the current
# Windows user, so links like openlocal:C%3A%5CClients%5CFoo open that
# folder in File Explorer when clicked from the app in the browser.
# Run this script (not as admin needed — it only writes to HKEY_CURRENT_USER).

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$handlerPath = Join-Path $scriptDir 'open-folder.ps1'

if (-not (Test-Path $handlerPath)) {
    Write-Error "Handler script not found at $handlerPath"
    exit 1
}

$command = "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$handlerPath`" `"%1`""

New-Item -Path 'HKCU:\Software\Classes\openlocal' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\Software\Classes\openlocal' -Name '(Default)' -Value 'URL:Open Local Folder Protocol'
Set-ItemProperty -Path 'HKCU:\Software\Classes\openlocal' -Name 'URL Protocol' -Value ''

New-Item -Path 'HKCU:\Software\Classes\openlocal\shell\open\command' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\Software\Classes\openlocal\shell\open\command' -Name '(Default)' -Value $command

Write-Host "openlocal:// protocol registered for user $env:USERNAME."
Write-Host "Handler: $handlerPath"
