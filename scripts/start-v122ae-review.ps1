# Restore only the isolated current review. Retained 3066/3067 are untouched.
$ErrorActionPreference = 'Stop'
$ctProject = Split-Path -Parent $PSScriptRoot
$ctBuildDirectory = Join-Path $ctProject '.next-v122ae-final-review'
$ctBuild = (Get-Content -LiteralPath (Join-Path $ctBuildDirectory 'BUILD_ID') -Raw).Trim()
if ($ctBuild -ne 'jU5ucVyuVyvfw_2vfjb-8') { throw 'The recorded review build is different; verify before starting.' }
$ctListener = Get-NetTCPConnection -State Listen -LocalPort 3070 -ErrorAction SilentlyContinue
if ($ctListener) {
    Write-Output 'Port 3070 already has a listener. Preserve it and inspect before replacing any process.'
    return
}
$env:CARBONTWIN_PREVIEW_DIR = '.next-v122ae-final-review'
$env:NEXT_PUBLIC_CT_CHARACTER_PREVIEW_REVISION = 'v122ae'
$ctStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$ctStarted = Start-Process -FilePath 'C:/Program Files/nodejs/node.exe' -ArgumentList @('node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '3070') -WorkingDirectory $ctProject -WindowStyle Hidden -RedirectStandardOutput (Join-Path $ctProject "outputs/v122/ae-server-$ctStamp.log") -RedirectStandardError (Join-Path $ctProject "outputs/v122/ae-server-$ctStamp-error.log") -PassThru
[pscustomobject]@{ pid = $ctStarted.Id; buildId = $ctBuild; url = 'http://127.0.0.1:3070/#identities' } | ConvertTo-Json
