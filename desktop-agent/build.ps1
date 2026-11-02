$ErrorActionPreference = 'Stop'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$outDir = Join-Path $PSScriptRoot 'dist'
$sdk = Join-Path $outDir 'webview2-sdk'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if (!(Test-Path "$sdk/lib/net462/Microsoft.Web.WebView2.Core.dll")) {
    New-Item -ItemType Directory -Force -Path $sdk | Out-Null
    Invoke-WebRequest 'https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/1.0.4314.35/microsoft.web.webview2.1.0.4314.35.nupkg' -OutFile "$sdk/sdk.zip"
    Expand-Archive -LiteralPath "$sdk/sdk.zip" -DestinationPath $sdk -Force
}
Copy-Item "$sdk/lib/net462/Microsoft.Web.WebView2.Core.dll", "$sdk/lib/net462/Microsoft.Web.WebView2.WinForms.dll", "$sdk/runtimes/win-x64/native/WebView2Loader.dll" -Destination $outDir -Force
Copy-Item "$sdk/LICENSE.txt" "$outDir/WebView2-LICENSE.txt" -Force
Copy-Item "$sdk/NOTICE.txt" "$outDir/WebView2-NOTICE.txt" -Force
& $compiler /nologo /target:winexe "/win32icon:$PSScriptRoot\app.ico" /platform:x64 /optimize+ "/out:$outDir\APTechWorkTracker.exe" /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Net.Http.dll /r:System.Web.Extensions.dll /r:System.Security.dll "/r:$outDir\Microsoft.Web.WebView2.Core.dll" "/r:$outDir\Microsoft.Web.WebView2.WinForms.dll" (Join-Path $PSScriptRoot 'Agent.cs') (Join-Path $PSScriptRoot 'Attendance.cs') (Join-Path $PSScriptRoot 'DailyTasks.cs') (Join-Path $PSScriptRoot 'WorkspaceHost.cs')
if ($LASTEXITCODE -ne 0) { throw 'Desktop build failed' }
& $compiler /nologo /target:winexe "/win32icon:$PSScriptRoot\app.ico" /platform:x64 /optimize+ "/out:$outDir\APTechWorkTrackerSetup.exe" /r:System.Windows.Forms.dll /r:System.Drawing.dll "/resource:$outDir\APTechWorkTracker.exe,AgentBinary" "/resource:$outDir\Microsoft.Web.WebView2.Core.dll,Microsoft.Web.WebView2.Core.dll" "/resource:$outDir\Microsoft.Web.WebView2.WinForms.dll,Microsoft.Web.WebView2.WinForms.dll" "/resource:$outDir\WebView2Loader.dll,WebView2Loader.dll" "/resource:$outDir\WebView2-LICENSE.txt,WebView2-LICENSE.txt" "/resource:$outDir\WebView2-NOTICE.txt,WebView2-NOTICE.txt" (Join-Path $PSScriptRoot 'Setup.cs')
if ($LASTEXITCODE -ne 0) { throw 'Installer build failed' }
Write-Output "Built $outDir\APTechWorkTracker.exe"
