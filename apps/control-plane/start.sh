#!/bin/sh
set -eu

# Compose volumes can outlive the image that created them. Reconcile ownership
# before dropping privileges so upgrades from the original root-running POC do
# not strand Git recovery snapshots behind EACCES errors.
mkdir -p /var/lib/vibe/workspaces
chown -R node:node /var/lib/vibe/workspaces

exec su -s /bin/sh node -c 'exec node apps/control-plane/dist/main.js'
