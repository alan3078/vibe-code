#!/usr/bin/env bash
set -euo pipefail

workspace_source="${VIBE_SOURCE_PATH:-$(pwd -P)}"
if [[ ! -f "$workspace_source/backend/main.py" && -f /workspaces/project/source/backend/main.py ]]; then
  workspace_source=/workspaces/project/source
fi
if [[ ! -f "$workspace_source/backend/main.py" ]]; then
  echo "No generated app found in $workspace_source. Open a project source folder first." >&2
  exit 1
fi

workspace_root="${VIBE_WORKSPACE_PATH:-${workspace_source%/source}}"
cd "$workspace_source"
export APPLICATION_DATABASE="${APPLICATION_DATABASE:-$workspace_root/application.sqlite}"
if [ -f frontend/package.json ]; then
  npm install --prefix frontend --no-audit --no-fund
  npm run build --prefix frontend
fi
cd backend
exec /opt/vibe/python-venv/bin/uvicorn main:app --host 0.0.0.0 --port "${APP_PORT:-8000}"
