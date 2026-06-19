# Foreign Flow Detective — 평일 자동 업데이트 작업 등록
# 기본: 월~금 20:47 (장 마감 후 KRX 데이터 반영 대기)
# 관리자 권한 불필요 (현재 사용자 계정으로 등록)

param(
    [string]$Time = "20:47"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BatchPath = Join-Path $ProjectRoot "scripts\daily_update.bat"
$LogDir = Join-Path $ProjectRoot "logs"
$TaskName = "ForeignFlowDetective-DailyUpdate"

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

if (-not (Test-Path $BatchPath)) {
    Write-Error "daily_update.bat 없음: $BatchPath"
}

$Action = New-ScheduledTaskAction -Execute $BatchPath -WorkingDirectory $ProjectRoot
$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday, Tuesday, Wednesday, Thursday, Friday -At $Time
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 6)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "외국인 지분 수집 + Supabase 동기화 (sync_stocks + ingest + sync_to_supabase)" `
    -Force | Out-Null

Write-Host "등록 완료: $TaskName"
Write-Host "  실행: 월~금 $Time"
Write-Host "  경로: $BatchPath"
Write-Host "  로그: $LogDir\daily_update.log"
Write-Host ""
Write-Host "수동 실행: schtasks /Run /TN `"$TaskName`""
Write-Host "삭제:      schtasks /Delete /TN `"$TaskName`" /F"
