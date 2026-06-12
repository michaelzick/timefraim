#!/usr/bin/env bash
# Updates the production deployment (docs/deploy-linux-prod.md §8):
# pull, install, build, restart the API service, then verify it came back up.
set -euo pipefail

DEPLOY_DIR="${TIMEFRAIM_DEPLOY_DIR:-/opt/timefraim}"
SERVICE="timefraim-api"

if [[ ! -d "$DEPLOY_DIR/.git" ]]; then
  echo "deploy: $DEPLOY_DIR is not a git checkout — set TIMEFRAIM_DEPLOY_DIR or run the initial deploy first" >&2
  exit 1
fi

cd "$DEPLOY_DIR"
git pull --ff-only
corepack pnpm install
corepack pnpm build
sudo systemctl restart "$SERVICE"

sleep 2
if ! systemctl is-active --quiet "$SERVICE"; then
  echo "deploy: $SERVICE is not active after restart — check: journalctl -u $SERVICE -n 50" >&2
  exit 1
fi

health="$(curl -fsS --max-time 5 http://127.0.0.1:6173/health 2>/dev/null || echo 'unreachable')"
echo "deploy: $SERVICE restarted at $(git rev-parse --short HEAD); web health: $health"
