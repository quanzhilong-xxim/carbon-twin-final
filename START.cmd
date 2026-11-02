@echo off
cd /d "%~dp0"
set "npm_config_cache=%CD%\npm-cache"
set "TEMP=%CD%\temp"
set "TMP=%CD%\temp"
set "NEXT_TELEMETRY_DISABLED=1"
echo CarbonTwin local preview: http://127.0.0.1:3014
call npm.cmd run dev -- --hostname 127.0.0.1 --port 3014
pause
