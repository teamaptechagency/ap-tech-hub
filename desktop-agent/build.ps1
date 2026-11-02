$ErrorActionPreference = 'Stop'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$outDir = Join-Path $PSScriptRoot 'dist'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
& $compiler /nologo /target:winexe /optimize+ "/out:$outDir\APTechWorkTracker.exe" /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Net.Http.dll /r:System.Web.Extensions.dll /r:System.Security.dll (Join-Path $PSScriptRoot 'Agent.cs')
if ($LASTEXITCODE -ne 0) { throw 'Desktop build failed' }
Write-Output "Built $outDir\APTechWorkTracker.exe"
