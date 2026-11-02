$ErrorActionPreference='Stop'
$repoRoot=Split-Path $PSScriptRoot
$dist=Join-Path $repoRoot 'desktop-agent/dist/client'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$shared=Join-Path $repoRoot 'desktop-agent/dist'
foreach($file in @('Microsoft.Web.WebView2.Core.dll','Microsoft.Web.WebView2.WinForms.dll','WebView2Loader.dll','WebView2-LICENSE.txt','WebView2-NOTICE.txt')){Copy-Item (Join-Path $shared $file) $dist -Force}
$compiler=Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
& $compiler /nologo /target:winexe /platform:x64 /optimize+ "/win32icon:$repoRoot/desktop-agent/app.ico" "/out:$dist/APTechClient.exe" /r:System.Windows.Forms.dll /r:System.Drawing.dll "/r:$dist/Microsoft.Web.WebView2.Core.dll" "/r:$dist/Microsoft.Web.WebView2.WinForms.dll" (Join-Path $PSScriptRoot 'ClientApp.cs')
if($LASTEXITCODE -ne 0){throw 'Client build failed'}
$resources=@('APTechClient.exe','Microsoft.Web.WebView2.Core.dll','Microsoft.Web.WebView2.WinForms.dll','WebView2Loader.dll','WebView2-LICENSE.txt','WebView2-NOTICE.txt')|ForEach-Object{"/resource:$dist/$_,$_"}
& $compiler /nologo /target:winexe /platform:x64 /optimize+ "/win32icon:$repoRoot/desktop-agent/app.ico" "/out:$dist/APTechClientSetup.exe" /r:System.Windows.Forms.dll /r:System.Drawing.dll $resources (Join-Path $PSScriptRoot 'Setup.cs')
if($LASTEXITCODE -ne 0){throw 'Client installer build failed'}
$public=Join-Path $repoRoot 'public/downloads/client'
New-Item -ItemType Directory -Force -Path $public | Out-Null
Copy-Item "$dist/APTechClientSetup.exe" $public -Force
@{version='1.0.0';installerSha256=(Get-FileHash "$public/APTechClientSetup.exe").Hash.ToLower();publishedDate='2026-11-02'}|ConvertTo-Json|Set-Content "$public/release.json" -Encoding utf8NoBOM
