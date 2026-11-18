# CarbonTwin 正式参赛版三维资源下载脚本
# 用法：在“代码规范”文件夹中运行  powershell -ExecutionPolicy Bypass -File .\download-assets.ps1
# 说明：从正式网站 https://carbontwin.pages.dev 逐文件下载运行所需静态资源（约 808 MB）。
#       仅下载缺失或大小不一致的文件，不重复下载；所有文件来自当前生产部署，公开可访问。

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifestPath = Join-Path $here 'assets-manifest.json'
$targetRoot = Join-Path $here 'CarbonTwin项目源代码'
if (-not (Test-Path $manifestPath)) { throw "缺少 assets-manifest.json" }
if (-not (Test-Path $targetRoot)) { throw "缺少源码目录 CarbonTwin项目源代码，请先解压源码包" }
$manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$ok = 0; $skip = 0; $fail = 0
foreach ($item in $manifest.files) {
    $rel = $item.path.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
    $dest = Join-Path $targetRoot $rel
    $dir = Split-Path -Parent $dest
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    if ((Test-Path $dest) -and ((Get-Item $dest).Length -eq $item.bytes)) { $skip++; continue }
    $url = $manifest.base + $item.path
    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -TimeoutSec 300
        $size = (Get-Item $dest).Length
        if ($size -ne $item.bytes) { Write-Warning "大小不一致: $rel ($size != $($item.bytes))"; $fail++ } else { $ok++ }
    } catch { Write-Warning "下载失败: $url -> $($_.Exception.Message)"; $fail++ }
}
Write-Host ("完成：下载 {0}，跳过 {1}，失败 {2}，目标目录 {3}" -f $ok,$skip,$fail,$targetRoot)
