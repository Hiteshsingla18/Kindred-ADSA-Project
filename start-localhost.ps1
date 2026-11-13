$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$compiler = Get-Command g++ -ErrorAction SilentlyContinue
if (-not $compiler) {
    throw "g++ was not found. Install MinGW-w64 and add g++ to PATH."
}

$server = Join-Path $PSScriptRoot "backend\kindred-server.exe"
Get-Process -Name kindred-server -ErrorAction SilentlyContinue | Stop-Process -Force
& $compiler.Source -std=c++17 -O2 -static (Join-Path $PSScriptRoot "backend\main.cpp") -lws2_32 -o $server
if ($LASTEXITCODE -ne 0) {
    throw "The C++ backend did not compile."
}

Write-Host "Kindred City is running at http://localhost:8000"
& $server --root $PSScriptRoot --port 8000
if ($LASTEXITCODE -ne 0) {
    throw "The C++ backend stopped with an error."
}
