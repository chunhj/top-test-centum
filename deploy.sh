#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

docker compose config --quiet
docker compose up -d --build
address=$(docker compose port nginx 80)
curl --fail --silent --show-error --retry 12 --retry-connrefused --retry-delay 5 --max-time 5 "http://$address/api/polls" >/dev/null
curl --fail --silent --show-error "http://$address/" >/dev/null
docker compose ps
