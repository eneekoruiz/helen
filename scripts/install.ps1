$ErrorActionPreference = "Stop"

$Version = if ($env:HELEN_VERSION) { $env:HELEN_VERSION } else { "2.1.0" }
Write-Host "Installing HELEN CLI v$Version..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Error: Node.js (v18+) is required to run HELEN."
    exit 1
}

npm install -g "helen-cli@$Version"
Write-Host "HELEN CLI installed successfully!" -ForegroundColor Green
Write-Host "Run 'helen --help' to get started."
