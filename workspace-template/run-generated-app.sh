#!/usr/bin/env bash
set -euo pipefail

workspace_source="${VIBE_SOURCE_PATH:-$(pwd -P)}"
workspace_key=$(printf '%s' "$workspace_source" | tr '/:' '__')
pid_file="/tmp/vibe-generated-app-${workspace_key}.pid"
log_file="/tmp/vibe-generated-app-${workspace_key}.log"
if [[ -f "$pid_file" ]] && kill -0 "$(<"$pid_file")" 2>/dev/null; then
  echo "Generated application is already running."
  exit 0
fi

nohup env VIBE_SOURCE_PATH="$workspace_source" /usr/local/bin/vibe-run-app >"$log_file" 2>&1 &
echo "$!" >"$pid_file"
echo "Generated application started from $workspace_source; logs: $log_file"
