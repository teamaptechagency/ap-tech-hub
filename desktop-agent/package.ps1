$ErrorActionPreference = 'Stop'
$dist = Join-Path $PSScriptRoot 'dist'
$public = Join-Path (Split-Path $PSScriptRoot) 'public/downloads/work-tracker'
$package = Join-Path $dist ('package-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $package | Out-Null
$files = @('APTechWorkTracker.exe', 'APTechWorkTrackerSetup.exe', 'Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll', 'WebView2Loader.dll', 'WebView2-LICENSE.txt', 'WebView2-NOTICE.txt')
foreach ($file in $files) { Copy-Item (Join-Path $dist $file) $package }
Copy-Item (Join-Path $PSScriptRoot 'browser-extension') $package -Recurse
Copy-Item (Join-Path $PSScriptRoot 'README.md') (Join-Path $package 'README.md')
Copy-Item (Join-Path $dist 'APTechWorkTracker.exe') $public -Force
Copy-Item (Join-Path $dist 'APTechWorkTrackerSetup.exe') $public -Force
Compress-Archive -Path "$package/*" -DestinationPath (Join-Path $public 'APTechWorkTracker-Pilot.zip') -Force
$releasePath = Join-Path $public 'release.json'
$release = Get-Content $releasePath -Raw | ConvertFrom-Json
$release.version = '0.5.0'
$release.publishedDate = '2026-11-02'
$release.exeSha256 = (Get-FileHash (Join-Path $public 'APTechWorkTracker.exe') -Algorithm SHA256).Hash.ToLower()
$release.installerSha256 = (Get-FileHash (Join-Path $public 'APTechWorkTrackerSetup.exe') -Algorithm SHA256).Hash.ToLower()
$release.packageSha256 = (Get-FileHash (Join-Path $public 'APTechWorkTracker-Pilot.zip') -Algorithm SHA256).Hash.ToLower()
$release.releaseNotes = "New Workspace desktop interface with separate PC and employee identities.`nChoose your name: employee ID is automatic. Attendance, daily tasks and shift timer remain independent of activity tracking.`nFiverr, Upwork, Freelancer, website/direct project and task entry with USD/BDT values.`nEmployee blog drafts and review submissions; admin job, programmer application, partner and blog management.`nWebsite visitor chat with replies, handover and tray alerts. Windows x64 and Microsoft WebView2 Runtime required.`nClose to tray, reopen from shortcut, and update from inside the app."
$release | ConvertTo-Json -Depth 5 | Set-Content $releasePath -Encoding utf8NoBOM
Write-Output "Packaged desktop $($release.version)"
