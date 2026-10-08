#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

docker compose config --quiet
docker compose up -d --build --remove-orphans
address=$(docker compose port backend 8080)
base="http://127.0.0.1:${address##*:}"
curl --fail --silent --show-error --retry 24 --retry-all-errors --retry-delay 5 --max-time 5 "$base/api/polls" >/dev/null
curl --fail --silent --show-error "$base/" >/dev/null
docker compose ps

# Cleanup after a successful deploy: dangling images and the retired Nginx image.
docker image prune -f
docker image rm top-nginx >/dev/null 2>&1 || true

# Keep the current release and the two most recent others under top-releases.
releases_dir="$(dirname "$PWD")"
if [ "$(basename "$releases_dir")" = "top-releases" ]; then
  ls -1dt "$releases_dir"/*/ | sed 's:/$::' | grep -vxF "$PWD" | tail -n +3 | xargs -r rm -rf -- || true
fi
