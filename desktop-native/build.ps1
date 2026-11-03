$ErrorActionPreference = 'Stop'
$framework = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319'
$outDir = Join-Path $PSScriptRoot 'dist'
New-Item -ItemType Directory -Force $outDir | Out-Null
& "$framework/csc.exe" /nologo /target:winexe /platform:x64 /optimize+ "/win32icon:$PSScriptRoot/../desktop-agent/app.ico" "/out:$outDir/APTechWorkStationNative.exe" /r:System.Net.Http.dll /r:System.Web.Extensions.dll /r:System.Security.dll /r:System.Xaml.dll "/r:$framework/WPF/WindowsBase.dll" /r:System.Windows.Forms.dll /r:System.Drawing.dll "/r:$framework/WPF/PresentationCore.dll" "/r:$framework/WPF/PresentationFramework.dll" "/resource:$PSScriptRoot\MainWindow.xaml,MainWindow.xaml" "$PSScriptRoot\NativeWorkStation.cs" "$PSScriptRoot\..\desktop-agent\DailyTasks.cs"
if ($LASTEXITCODE -ne 0) { throw 'Native build failed' }
Write-Output "Built native WPF preview: $outDir/APTechWorkStationNative.exe"


