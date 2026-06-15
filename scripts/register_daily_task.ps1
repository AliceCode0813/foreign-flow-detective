# Foreign Flow Detective — 매일 1회 자동 업데이트 작업 등록
# 기본 실행 시각: 평일 19:00 (장 마감 후 KRX 데이터 반영 대기)
# 관리자 권한 불필요 (현재 사용자 계정으로 등록)

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
# 매일 19:00 (로컬 시간)
$Trigger = New-ScheduledTaskTrigger -Daily -At "19:00"
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
    -Description "외국인 지분 데이터 일 1회 수집 (sync_stocks + ingest)" `
    -Force | Out-Null

Write-Host "등록 완료: $TaskName"
Write-Host "  실행: 매일 19:00"
Write-Host "  경로: $BatchPath"
Write-Host "  로그: $LogDir\daily_update.log"
Write-Host ""
Write-Host "수동 실행: schtasks /Run /TN `"$TaskName`""
Write-Host "삭제:      schtasks /Delete /TN `"$TaskName`" /F"
