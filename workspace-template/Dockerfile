FROM node:20-bullseye-slim AS node-runtime

FROM codercom/code-server:4.96.4-ubuntu

USER root

COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
  && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

RUN apt-get update \
  && apt-get install -y --no-install-recommends git python3 python3-venv \
  && rm -rf /var/lib/apt/lists/*

RUN node --version && npm --version

ARG CLINE_EXTENSION_VERSION=3.59.0
RUN mkdir -p /opt/code-server/extensions \
  && code-server --install-extension "saoudrizwan.claude-dev@${CLINE_EXTENSION_VERSION}" --extensions-dir /opt/code-server/extensions --force

COPY startup.sh /usr/local/bin/vibe-workspace-start
COPY run-app.sh /usr/local/bin/vibe-run-app
COPY run-generated-app.sh /usr/local/bin/vibe-run-generated-app
COPY golden-app /opt/vibe/golden-app
RUN python3 -m venv /opt/vibe/python-venv \
  && /opt/vibe/python-venv/bin/pip install --no-cache-dir --requirement /opt/vibe/golden-app/backend/requirements.txt \
  && cd /opt/vibe/golden-app/backend \
  && APPLICATION_DATABASE=/tmp/vibe-golden-app-test.sqlite /opt/vibe/python-venv/bin/python -m unittest -v test_main.py \
  && rm -rf /opt/vibe/golden-app/__pycache__ /opt/vibe/golden-app/backend/__pycache__ /tmp/vibe-golden-app-test-* /tmp/vibe-golden-app-test.sqlite \
  && cd /opt/vibe/golden-app/frontend \
  && npm install --no-audit --no-fund \
  && npm run build \
  && rm -rf /opt/vibe/golden-app/frontend/node_modules \
  && chmod 0755 /usr/local/bin/vibe-workspace-start /usr/local/bin/vibe-run-app /usr/local/bin/vibe-run-generated-app \
  && mkdir -p /workspaces/project/source /opt/code-server \
  && chown -R coder:coder /workspaces /opt/vibe /opt/code-server

# Make the prepared template runtime the default in every code-server terminal.
# The venv provides `python`, `python3`, `pip`, FastAPI, SQLAlchemy, and uvicorn.
ENV PATH="/opt/vibe/python-venv/bin:${PATH}"

# Startup reconciles the shared volume as root, then drops to coder before
# launching code-server.
USER root
WORKDIR /workspaces/project/source

ENTRYPOINT ["/usr/local/bin/vibe-workspace-start"]
