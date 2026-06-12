$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeExe = "C:\Program Files\nodejs\node.exe"
$nextCli = Join-Path $projectRoot "node_modules\next\dist\bin\next"

Set-Location $projectRoot
& $nodeExe $nextCli dev -p 3100
