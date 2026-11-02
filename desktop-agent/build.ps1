$ErrorActionPreference = 'Stop'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$outDir = Join-Path $PSScriptRoot 'dist'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
& $compiler /nologo /target:winexe /optimize+ "/out:$outDir\APTechWorkTracker.exe" /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Net.Http.dll /r:System.Web.Extensions.dll /r:System.Security.dll (Join-Path $PSScriptRoot 'Agent.cs') (Join-Path $PSScriptRoot 'Attendance.cs') (Join-Path $PSScriptRoot 'DailyTasks.cs')
if ($LASTEXITCODE -ne 0) { throw 'Desktop build failed' }
& $compiler /nologo /target:winexe /optimize+ "/out:$outDir\APTechWorkTrackerSetup.exe" /r:System.Windows.Forms.dll /r:System.Drawing.dll "/resource:$outDir\APTechWorkTracker.exe,AgentBinary" (Join-Path $PSScriptRoot 'Setup.cs')
if ($LASTEXITCODE -ne 0) { throw 'Installer build failed' }
Write-Output "Built $outDir\APTechWorkTracker.exe"
