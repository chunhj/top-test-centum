$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$composeFile = Join-Path $repoRoot "compose.yaml"
$resultsDir = Join-Path $scriptDir "results"
New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null

$SseVus = if ($env:SSE_VUS) { [int]$env:SSE_VUS } else { 500 }
$VoteVus = if ($env:VOTE_VUS) { [int]$env:VOTE_VUS } else { 1000 }
$VoteConcurrency = if ($env:VOTE_CONCURRENCY) { [int]$env:VOTE_CONCURRENCY } else { 50 }
$PollId = if ($env:POLL_ID) { [long]$env:POLL_ID } else { 1 }
$RunTag = Get-Date -Format "MMddHHmmss"
$sseContainer = "top-k6-sse-$RunTag"
$voteContainer = "top-k6-vote-$RunTag"
$metricsFile = Join-Path $resultsDir "scenario-c-metrics-$RunTag.csv"
$sseImage = "top-k6-sse:0.1.11"

function Invoke-PostgresScalar([string]$sql) {
    $value = $sql | docker compose -f $composeFile exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -At -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL query failed." }
    return ($value | Select-Object -Last 1).Trim()
}

function Get-BackendMetric([string]$name) {
    try {
        $json = docker compose -f $composeFile exec -T backend wget -qO- "http://127.0.0.1:8080/actuator/metrics/$name"
        if ($LASTEXITCODE -ne 0) { return 0 }
        return [double](($json | ConvertFrom-Json).measurements[0].value)
    } catch { return 0 }
}

function Get-SseActive { return Get-BackendMetric "top.sse.connections.active" }

$publishedAddresses = @(docker compose -f $composeFile port nginx 80)
$composeExit = $LASTEXITCODE
$publishedAddress = $publishedAddresses | Select-Object -First 1
if ($composeExit -ne 0 -or $publishedAddress -notmatch ':(\d+)$') {
    throw "Cannot resolve the published Nginx port. Start Compose first."
}
$baseUrl = if ($env:BASE_URL) { $env:BASE_URL.TrimEnd('/') } else { "http://127.0.0.1:$($Matches[1])" }
$frontendNetwork = docker network ls --filter "label=com.docker.compose.project=poll-top-app" --filter "label=com.docker.compose.network=frontend" --format '{{.Name}}' | Select-Object -First 1
if (-not $frontendNetwork) { throw "Cannot resolve the Compose frontend network." }
$dockerBaseUrl = "http://nginx"

Write-Host "Commands used:" -ForegroundColor Cyan
Write-Host "  docker compose -f $composeFile exec -T postgres ..."
Write-Host "  docker run grafana/k6:latest run scenario-c-sse.js"
Write-Host "  docker run grafana/k6:latest run scenario-c-vote.js"
Write-Host "Target: API=$baseUrl, poll=$PollId, SSE=$SseVus, new voters=$VoteVus, run=$RunTag"

$health = Invoke-WebRequest -Uri "$baseUrl/api/polls/$PollId" -UseBasicParsing -TimeoutSec 10
if ($health.StatusCode -ne 200) { throw "Poll API is unavailable." }

$ballotsBefore = [long](Invoke-PostgresScalar "SELECT count(*) FROM ballot WHERE poll_id=$PollId;")
$deadlocksBefore = [long](Invoke-PostgresScalar "SELECT deadlocks FROM pg_stat_database WHERE datname=current_database();")
Write-Host "Ballots before: $ballotsBefore"

$window = Invoke-PostgresScalar "UPDATE poll SET status='OPEN', starts_at=now()-interval '1 hour', ends_at=now()+interval '1 hour' WHERE id=$PollId RETURNING ends_at;"
Write-Host "Poll ends at: $window (database server time + 1 hour)"

$existingSseImage = docker image ls -q $sseImage
if (-not $existingSseImage) {
    Write-Host "Building pinned xk6-sse v0.1.11 image ..." -ForegroundColor Yellow
    docker build -t $sseImage -f (Join-Path $scriptDir 'Dockerfile.k6-sse') $scriptDir
    if ($LASTEXITCODE -ne 0) { throw "Could not build the xk6-sse image." }
}

$samples = [System.Collections.Generic.List[object]]::new()
try {
    Write-Host "Starting $SseVus SSE clients in container $sseContainer ..." -ForegroundColor Yellow
    docker run -d --name $sseContainer `
		--network $frontendNetwork `
        --env "BASE_URL=$dockerBaseUrl" --env "POLL_ID=$PollId" --env "SSE_VUS=$SseVus" --env "RUN_TAG=$RunTag" `
        --mount "type=bind,source=$scriptDir,target=/scripts" `
        $sseImage run --summary-export="/scripts/results/scenario-c-sse-$RunTag.json" /scripts/scenario-c-sse.js | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "Could not start the SSE load container." }

    $active = 0
    for ($i = 1; $i -le 60; $i++) {
        Start-Sleep -Seconds 1
        $active = Get-SseActive
        Write-Host "SSE connection check $i/60: $active / $SseVus"
        if ($active -ge $SseVus) { break }
        $running = docker inspect -f '{{.State.Running}}' $sseContainer 2>$null
        if ($running -ne 'true') { break }
    }
    if ($active -lt $SseVus) {
        docker logs $sseContainer | Out-Host
        throw "Only $active/$SseVus SSE subscriptions became active. Votes were not started."
    }

    Write-Host "Verified $active active SSE subscriptions. Starting $VoteVus random votes ..." -ForegroundColor Green
    docker run -d --name $voteContainer `
		--network $frontendNetwork `
        --env "BASE_URL=$dockerBaseUrl" --env "POLL_ID=$PollId" --env "VOTER_COUNT=$VoteVus" --env "VOTE_CONCURRENCY=$VoteConcurrency" --env "RUN_TAG=$RunTag" `
        --mount "type=bind,source=$scriptDir,target=/scripts" `
        grafana/k6:latest run --summary-export="/scripts/results/scenario-c-vote-$RunTag.json" /scripts/scenario-c-vote.js | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "Could not start the vote load container." }

    do {
        $pg = (Invoke-PostgresScalar "SELECT (SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND state='active') || '|' || (SELECT count(*) FROM pg_locks WHERE NOT granted) || '|' || (SELECT deadlocks FROM pg_stat_database WHERE datname=current_database());").Split('|')
        $sample = [pscustomobject]@{
            timestamp = (Get-Date).ToString('o')
            sse_active = Get-SseActive
            hikari_active = Get-BackendMetric 'hikaricp.connections.active'
            hikari_idle = Get-BackendMetric 'hikaricp.connections.idle'
            hikari_pending = Get-BackendMetric 'hikaricp.connections.pending'
            hikari_max = Get-BackendMetric 'hikaricp.connections.max'
            postgres_active = [int]$pg[0]
            postgres_waiting_locks = [int]$pg[1]
            postgres_deadlocks = [long]$pg[2]
        }
        $samples.Add($sample)
        Write-Host ("sample: SSE={0} Hikari active/idle/pending={1}/{2}/{3} PostgreSQL active/waiting={4}/{5}" -f $sample.sse_active, $sample.hikari_active, $sample.hikari_idle, $sample.hikari_pending, $sample.postgres_active, $sample.postgres_waiting_locks)
        Start-Sleep -Seconds 2
        $voteRunning = docker inspect -f '{{.State.Running}}' $voteContainer 2>$null
    } while ($voteRunning -eq 'true')

    $samples | Export-Csv -NoTypeInformation -Encoding UTF8 $metricsFile
    try { docker logs $voteContainer 2>&1 | Tee-Object -FilePath (Join-Path $resultsDir "scenario-c-vote-$RunTag.log") | Out-Host } catch { Write-Warning "Could not copy the vote container log: $_" }
    $voteExit = [int](docker inspect -f '{{.State.ExitCode}}' $voteContainer)
    if ($voteExit -ne 0) { Write-Warning "Vote k6 exited with code $voteExit; database results below remain authoritative." }
}
finally {
    if (docker container inspect $sseContainer 2>$null) {
        docker stop $sseContainer | Out-Host
        try { docker logs $sseContainer 2>&1 | Set-Content -Encoding UTF8 (Join-Path $resultsDir "scenario-c-sse-$RunTag.log") } catch {}
        docker rm $sseContainer | Out-Null
    }
    if (docker container inspect $voteContainer 2>$null) { docker rm $voteContainer | Out-Null }
}

$activeAfter = Get-SseActive
for ($i = 0; $i -lt 30 -and $activeAfter -gt 0; $i++) {
    Start-Sleep -Seconds 1
    $activeAfter = Get-SseActive
}

$ballotsAfter = [long](Invoke-PostgresScalar "SELECT count(*) FROM ballot WHERE poll_id=$PollId;")
$selectionsAfter = [long](Invoke-PostgresScalar "SELECT count(*) FROM ballot_selection s JOIN ballot b ON b.id=s.ballot_id WHERE b.poll_id=$PollId;")
$counterAfter = [long](Invoke-PostgresScalar "SELECT coalesce(sum(c.vote_count),0) FROM poll_option_counter c JOIN poll_option o ON o.id=c.option_id WHERE o.poll_id=$PollId;")
$deadlocksAfter = [long](Invoke-PostgresScalar "SELECT deadlocks FROM pg_stat_database WHERE datname=current_database();")
$added = $ballotsAfter - $ballotsBefore

Write-Host ""
Write-Host "Final verification" -ForegroundColor Cyan
Write-Host "  ballots: $ballotsBefore -> $ballotsAfter (added $added)"
Write-Host "  selections=$selectionsAfter, counter sum=$counterAfter"
Write-Host "  SSE active after shutdown=$activeAfter"
Write-Host "  PostgreSQL deadlocks added=$($deadlocksAfter - $deadlocksBefore)"
if ($samples.Count -gt 0) {
    Write-Host "  peak Hikari active=$((($samples | Measure-Object hikari_active -Maximum).Maximum)), pending=$((($samples | Measure-Object hikari_pending -Maximum).Maximum))"
    Write-Host "  peak PostgreSQL active=$((($samples | Measure-Object postgres_active -Maximum).Maximum)), waiting locks=$((($samples | Measure-Object postgres_waiting_locks -Maximum).Maximum))"
}
Write-Host "  metrics: $metricsFile"
Write-Host "  k6 summaries: $resultsDir\scenario-c-sse-$RunTag.json, scenario-c-vote-$RunTag.json"

if ($selectionsAfter -ne $ballotsAfter -or $counterAfter -ne $ballotsAfter) { throw "Ballot/selection/counter totals are inconsistent." }
if ($activeAfter -ne 0) { throw "SSE subscriptions did not return to zero." }
