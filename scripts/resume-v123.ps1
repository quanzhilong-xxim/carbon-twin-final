param(
    [ValidateSet('stable','review')][string]$Site = 'review',
    [switch]$CheckOnly
)

# Local recovery only. Never stop an existing listener, rebuild, or call a model API.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeFile = Join-Path $projectRoot 'docs/recovery/v123/RUNTIME_MANIFEST.json'
$runtime = Get-Content -LiteralPath $runtimeFile -Raw | ConvertFrom-Json
$target = $runtime.sites.$Site
if (-not $target) { throw "Missing recovery target: $Site" }
$buildPath = Join-Path $projectRoot $target.directory
$buildIdFile = Join-Path $buildPath 'BUILD_ID'
if (-not (Test-Path -LiteralPath $buildIdFile)) { throw "Saved build missing: $buildPath. Read NEXT_ACTION.md; no automatic rebuild attempted." }
$buildId = (Get-Content -LiteralPath $buildIdFile -Raw).Trim()
if ($buildId -ne $target.buildId) { throw 'Build identity changed; update the recovery manifest after verification.' }
$url = "http://127.0.0.1:$($target.port)/"
$listener = Get-NetTCPConnection -State Listen -LocalPort $target.port -ErrorAction SilentlyContinue
if ($listener) {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -ne 200) { throw 'The existing listener is not healthy; it was left running.' }
    Write-Output "Already running: $url (HTTP 200). Existing process preserved. Saved build: $buildId"
    return
}
if ($CheckOnly) { Write-Output "Not listening: $url. Saved build verified: $buildId. No process started."; return }
$logDirectory = Join-Path $projectRoot 'work/recovery-runtime'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stdout = Join-Path $logDirectory "$Site-$stamp.stdout.log"
$stderr = Join-Path $logDirectory "$Site-$stamp.stderr.log"
$previousDirectory = $env:CARBONTWIN_PREVIEW_DIR
try {
    $env:CARBONTWIN_PREVIEW_DIR = $target.directory
    $process = Start-Process -FilePath (Get-Command node -ErrorAction Stop).Source -ArgumentList @('node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',[string]$target.port) -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
} finally { $env:CARBONTWIN_PREVIEW_DIR = $previousDirectory }
for ($attempt = 0; $attempt -lt 10; $attempt++) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) { Write-Output "Recovered: $url (HTTP 200), process $($process.Id), build $buildId. Logs: $logDirectory"; return }
    } catch { if ($process.HasExited) { throw "Server exited. Review $stderr" } }
    Start-Sleep -Milliseconds 500
}
throw "Started once but health was not confirmed. No repeated start attempted. Review $stdout and $stderr."
