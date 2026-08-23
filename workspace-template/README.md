# Vibe workspace template

This image is the repeatable browser-IDE runtime for the POC's Coder provider.

- Base image: `codercom/code-server:4.96.4-ubuntu`
- Source mount: `/workspaces/project/source`
- Generated app data: SQLite inside the workspace volume
- Runtime tools: Node.js 20, Git, Python 3.8, and Python virtual-environment support
- IDE extension: pinned Cline `saoudrizwan.claude-dev` 3.59.0
- Project guidance: pinned Ponytail `.clinerules/ponytail.md` and `.github/copilot-instructions.md` snapshots for Cline/GitHub Copilot YAGNI/minimal-diff behavior
- GitHub Copilot agent skills: eight project-scoped skills under `.github/skills/`, including intake sizing, UX/design direction, minimal implementation, safe prototype spikes, browser QA, and skill supply-chain review. GitHub Copilot, VS Code agent mode, and the Copilot CLI discover these project skills automatically; use `/skills list` in the CLI to confirm them after opening the workspace.

The integrated terminal starts with `/opt/vibe/python-venv/bin` first on `PATH`.
That means both `python` and `python3` use the prepared template runtime, and
the generated app dependencies are immediately available:

```bash
cd backend
python -m unittest test_main -v
python -c "import fastapi, sqlalchemy, uvicorn"
```
- Golden app: React/Vite/TypeScript frontend under `frontend/` plus Python/FastAPI/SQLAlchemy/SQLite backend under `backend/`
- Golden app backend checks: `cd /opt/vibe/golden-app/backend && /opt/vibe/python-venv/bin/python -m unittest -v test_main.py`

The Coder deployment must put this image behind Coder's authenticated workspace
proxy. This POC intentionally has no SSO/OIDC or LiteLLM/model gateway
integration. Cline is installed in the IDE, but model configuration remains a
user-provided IDE setting and no provider credential is baked into the image. The Kubernetes Coder template creates one deployment and one PVC per
workspace, applies 4 GiB memory / 2 CPU limits, and mounts no host Docker
socket. The template's `Run generated application` script starts the FastAPI
preview only when the user explicitly invokes it; the Coder app health check
then confirms whether the preview is available.

Optional `git_remote_url` template variable
connect the workspace to an operator-created Git repository. The startup
contract initializes or fetches `main` and pushes the golden commit without
embedding a credential in the image.

Terminal commands remain an explicit user-approved action in the product flow.
No Docker socket is mounted into the workspace.

Run the generated app only after explicit approval with the Coder `Run generated
application` script or `/usr/local/bin/vibe-run-app`; it builds the React
frontend, starts FastAPI, and keeps the SQLAlchemy database at
`/workspaces/project/application.sqlite`.

In local Compose, run `/usr/local/bin/vibe-run-generated-app` from the opened
project source folder. It starts the app in the background, detects that folder,
and uses its sibling `application.sqlite`; it does not assume the external Coder
path. Use `/usr/local/bin/vibe-run-app` when a foreground process is preferred.

The image preinstalls the pinned FastAPI/SQLAlchemy runtime and runs
`test_main.py` during the image build, so the warm workspace does not need to
download Python dependencies before its first preview.

The initial schema is created idempotently by SQLAlchemy `Base.metadata.create_all`
so a new workspace can start without a migration service. A shared or production
deployment must replace that bootstrap with reviewed, versioned Alembic
migrations before accepting schema changes.
