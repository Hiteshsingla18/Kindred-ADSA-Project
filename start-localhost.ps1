$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
Write-Host "Kindred Grid is running at http://localhost:8000"
Write-Host "Press Ctrl+C to stop the server."
python -m http.server 8000
