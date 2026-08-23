#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/vibe/python-venv/bin:${PATH}"
chown -R coder:coder /workspaces

if [ "${VIBE_LOCAL_COMPOSE:-false}" = "true" ]; then
  mkdir -p /workspaces
  exec su -s /bin/bash coder -c 'exec code-server --extensions-dir /opt/code-server/extensions --bind-addr 0.0.0.0:8080 --auth none --cert false /workspaces'
fi

mkdir -p /workspaces/project/source
export APPLICATION_DATABASE=/workspaces/project/application.sqlite
if [ ! -f /workspaces/project/source/backend/main.py ]; then
  cp -R /opt/vibe/golden-app/. /workspaces/project/source/
fi

chown -R coder:coder /workspaces/project
exec su -s /bin/bash coder -c 'exec code-server --extensions-dir /opt/code-server/extensions --bind-addr 0.0.0.0:8080 --auth none --cert false /workspaces/project/source'
