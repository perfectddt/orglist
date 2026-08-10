$ErrorActionPreference = 'SilentlyContinue'
$appId = 'perfectddt.Orglist.Reminder'
$shortcutPath = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs\Orglist Reminder.lnk'
$startupShortcutPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'Orglist Reminder.lnk'
Remove-Item -LiteralPath $shortcutPath -Force
Remove-Item -LiteralPath $startupShortcutPath -Force
Remove-Item -LiteralPath ('HKCU:\Software\Classes\AppUserModelId\' + $appId) -Recurse -Force
