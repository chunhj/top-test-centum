<#
  Scenario C (SSE + concurrent voting) after-fix retest automation script.
  Prerequisite: backend (gradlew bootRun) must already be running in a separate
  terminal window (secret env vars like SPRING_DATASOURCE_PASSWORD are not known
  to this script, so you must start it yourself).
  What this script does:
    1) Wait for backend (8080) to respond
    2) Auto-detect the Postgres container name
    3) Reset existing vote data for Poll 1 (test seed poll, not real prod data)
    4) Run k6 Scenario C with VUS=5 then VUS=10, saving results to results/*-after.json
    5) During the VUS=10 run, periodically sample pg_stat_activity and docker stats
    6) Print a summary to console + results/after-fix-summary.txt
#>

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$resultsDir = Join-Path $root "results"
New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null
$summaryPath = Join-Path $resultsDir "after-fix-summary.txt"
[System.IO.File]::WriteAllText($summaryPath, "", [System.Text.UTF8Encoding]::new($false))

function Log($msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $msg
    Write-Host $line
    Add-Content -Path $summaryPath -Value $line -Encoding UTF8
}

# 1) Wait for backend
Log "1) Waiting for backend (127.0.0.1:8080) to respond..."
$ok = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/polls" -UseBasicParsing -TimeoutSec 3
        if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) { $ok = $true; break }
    } catch { Start-Sleep -Seconds 2 }
}
if (-not $ok) {
    Log "FAILED: backend is not responding. Start it first with 'cd backend; .\gradlew bootRun' in another window, then re-run this script."
    exit 1
}
Log "backend is responding."

# 2) Auto-detect Postgres container
Log "2) Detecting Postgres container..."
$pgContainer = (docker ps --format "{{.Names}} {{.Image}}" | Select-String -Pattern "postgres" | ForEach-Object { ($_ -split " ")[0] } | Select-Object -First 1)
if (-not $pgContainer) {
    Log "WARNING: no running postgres container found (check 'docker ps' and hardcode the name at the top of this script if needed). Skipping pg_stat_activity collection."
} else {
    Log "Postgres container: $pgContainer"
}

# 3) Reset Poll 1 test vote data (V6 seed poll)
if ($pgContainer) {
    Log "3) Resetting existing vote data for Poll 1 (test seed poll)..."
    $resetSql = @"
DELETE FROM vote_history WHERE ballot_id IN (SELECT id FROM ballot WHERE poll_id = 1);
DELETE FROM ballot_selection WHERE ballot_id IN (SELECT id FROM ballot WHERE poll_id = 1);
DELETE FROM idempotency_request WHERE poll_id = 1;
DELETE FROM ballot WHERE poll_id = 1;
UPDATE poll_option_counter SET vote_count = 0 WHERE option_id IN (SELECT id FROM poll_option WHERE poll_id = 1);
"@
    $resetSql | docker exec -i $pgContainer psql -U postgres -d postgres | Out-Null
    Log "Reset done."
}

# 4) k6 Scenario C: VUS=5
Log "4) Running k6 Scenario C (VUS=5)..."
docker run --rm --env BASE_URL=http://host.docker.internal:8080 --env VUS=5 `
    --mount type=bind,source="$root",target=/scripts `
    grafana/k6:latest run --summary-export=/scripts/results/scenario-c-5-after.json /scripts/scenario-c-sse-and-vote.js *>&1 |
    Tee-Object -FilePath (Join-Path $resultsDir "scenario-c-5-after.log")

# pg_stat_activity / docker stats watcher job (for the 10+10 run)
$watchJob = $null
if ($pgContainer) {
    Log "5) Starting pg_stat_activity / docker stats watcher for the 10+10 run..."
    $watchScript = {
        param($pg, $outDir)
        for ($i = 0; $i -lt 15; $i++) {
            $ts = Get-Date -Format "HH:mm:ss.fff"
            $cnt = docker exec $pg psql -U postgres -d postgres -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='postgres';"
            Add-Content -Path (Join-Path $outDir "pg-activity-during-10.log") -Value "[$ts] active_connections=$($cnt.Trim())" -Encoding UTF8
            $stats = docker stats --no-stream --format "{{.Name}}: CPU={{.CPUPerc}} MEM={{.MemUsage}}"
            Add-Content -Path (Join-Path $outDir "docker-stats-during-10.log") -Value "[$ts]`n$stats`n" -Encoding UTF8
            Start-Sleep -Milliseconds 700
        }
    }
    $watchJob = Start-Job -ScriptBlock $watchScript -ArgumentList $pgContainer, $resultsDir
}

# k6 Scenario C: VUS=10
Log "Running k6 Scenario C (VUS=10)..."
docker run --rm --env BASE_URL=http://host.docker.internal:8080 --env VUS=10 `
    --mount type=bind,source="$root",target=/scripts `
    grafana/k6:latest run --summary-export=/scripts/results/scenario-c-10-after.json /scripts/scenario-c-sse-and-vote.js *>&1 |
    Tee-Object -FilePath (Join-Path $resultsDir "scenario-c-10-after.log")

if ($watchJob) {
    Wait-Job $watchJob -Timeout 5 | Out-Null
    Receive-Job $watchJob | Out-Null
    Remove-Job $watchJob -Force
}

# 6) Host CPU/RAM snapshot
Log "6) Host CPU/RAM snapshot..."
try {
    $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
    $os = Get-CimInstance Win32_OperatingSystem
    $memUsedPct = [math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 1)
    Log "Host CPU load avg: $cpu% / Memory used: $memUsedPct%"
} catch { Log "Failed to read CPU/RAM: $_" }

try {
    $javaProc = Get-Process -Name java -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($javaProc) {
        Log "Backend(java) process: CPU(s)=$($javaProc.CPU) WorkingSet(MB)=$([math]::Round($javaProc.WorkingSet64/1MB,1))"
    }
} catch {}

Log "Done. Result files:"
Log "  $resultsDir\scenario-c-5-after.json / .log"
Log "  $resultsDir\scenario-c-10-after.json / .log"
Log "  $resultsDir\pg-activity-during-10.log"
Log "  $resultsDir\docker-stats-during-10.log"
Log "  $resultsDir\after-fix-summary.txt (this full log)"
