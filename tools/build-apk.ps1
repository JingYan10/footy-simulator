# Builds a test APK of the store app (debug, not for the Play Store): store web files, then Gradle.
# Run in a normal PowerShell window:  .\tools\build-apk.ps1
# The APK ends up in app\android\app\build\outputs\apk\debug\app-debug.apk
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = Split-Path (Split-Path (Get-Command java).Source)

& "$PSScriptRoot\build-app.ps1"
Push-Location "$root\app\android"
try {
  & .\gradlew.bat assembleDebug
  if ($LASTEXITCODE -ne 0) { throw "Gradle build failed ($LASTEXITCODE)" }
} finally { Pop-Location }
$apk = "$root\app\android\app\build\outputs\apk\debug\app-debug.apk"
Write-Host "APK ready: $apk ($([math]::Round((Get-Item $apk).Length / 1MB, 1)) MB)"
