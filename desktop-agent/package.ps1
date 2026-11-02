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
$release.version = '0.5.3'
$release.publishedDate = '2026-11-02'
$release.exeSha256 = (Get-FileHash (Join-Path $public 'APTechWorkTracker.exe') -Algorithm SHA256).Hash.ToLower()
$release.installerSha256 = (Get-FileHash (Join-Path $public 'APTechWorkTrackerSetup.exe') -Algorithm SHA256).Hash.ToLower()
$release.packageSha256 = (Get-FileHash (Join-Path $public 'APTechWorkTracker-Pilot.zip') -Algorithm SHA256).Hash.ToLower()
$release.releaseNotes = "Employee and partner website login opens the restricted role-based app workspace. Separate Windows Client installer is available on Download Apps. Android Hub supports role-based jobs, progress, requests, conversations and referral earnings. Existing attendance and consented monitoring remain unchanged."
$release | ConvertTo-Json -Depth 5 | Set-Content $releasePath -Encoding utf8NoBOM
Write-Output "Packaged desktop $($release.version)"
