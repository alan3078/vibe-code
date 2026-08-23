# Vibe-Code Platform Local POC Tasks

| ID | Vertical slice | Exact files | Dependencies | Owner | Status |
|---|---|---|---|---|---|
| TASK-001 | Authenticated ownership-scoped project API with idempotent creation | `apps/control-plane/src/**`, `apps/control-plane/test/**`, root manifests | Design PASS | human:tdd-developer | READY |
| TASK-002 | PostgreSQL bootstrap, lifecycle, health, and Compose runtime | `docker-compose.yml`, `apps/control-plane/Dockerfile`, `apps/control-plane/src/**` | TASK-001 | human:tdd-developer | READY |
| TASK-003 | React portal journey and failure states | `apps/portal/src/**`, `apps/portal/test/**` | TASK-001 | human:tdd-developer | READY |
| TASK-004 | Verification, docs, and operational handoff | `README.md`, `wiki/architecture/**`, feature evidence | TASK-002, TASK-003 | human:release-verifier | READY |
| TASK-005 | Persistent generated-app workspace, authenticated preview, and Coder template | `apps/control-plane/src/workspace/**`, `apps/control-plane/src/preview/**`, `apps/control-plane/src/auth/**`, `apps/portal/src/**`, `workspace-template/**`, `docker-compose.yml` | TASK-002, TASK-003 | human:tdd-developer | READY |
| TASK-006 | Resource-governed asynchronous workspace lifecycle and deletion | `apps/control-plane/src/projects/**`, `apps/control-plane/src/workspace/**`, `apps/control-plane/src/entities/**` | `governance-extension.md` | codex:tdd-implementer | IMPLEMENTED — focused and live lifecycle evidence recorded |
| TASK-007 | Administrator authorization, dynamic configuration, and audit trail | `apps/control-plane/src/admin/**`, `apps/control-plane/src/audit/**`, `apps/control-plane/src/configuration/**`, `apps/control-plane/src/entities/**`, `apps/portal/src/**` | TASK-006 | codex:tdd-implementer | IMPLEMENTED — role/config/audit evidence recorded |
| TASK-008 | Governance verification and documentation evidence | `wiki/delivery/features/FTR-001-poc-platform/**`, `README.md`, focused/full suites | TASK-006, TASK-007 | codex:verifier | IMPLEMENTED — local verification evidence recorded; independent reviews remain pending |
| TASK-009 | Mature module-based administration CMS | `apps/control-plane/src/admin/**`, `apps/portal/src/AdminPage.tsx`, `apps/portal/src/api.ts` | TASK-006, TASK-007 | codex:tdd-implementer | IMPLEMENTED — focused/full suites and live verification passed |

## TASK-001 TDD evidence

- Exact files: `apps/control-plane/src/projects/projects.service.spec.ts`, `apps/control-plane/src/projects/projects.service.ts`
- Exact command: `npm --workspace apps/control-plane test -- --runInBand projects.service.spec.ts`
- Expected RED failure: the focused test cannot import the missing project service before implementation.
- Actual RED result / exit status: Focused Jest run failed with `TS2307 Cannot find module './projects.service'` (exit 1) before implementation.
- GREEN result / exit status: Focused Jest run passed 2 tests (exit 0) after implementation.
- Full-suite evidence: `npm run test:api` passed 1 suite / 2 tests; repository Python suite passed 72 tests.
- Environment: Node 20, npm 10, PostgreSQL contract mocked for unit tests.
- Artifact/link: `verification.md` live command evidence.
- Recorded by: human:tdd-developer
- Timestamp: 2026-08-22T09:10:45Z.
- Commit/revision: Working tree; repository has no accessible Git metadata in this environment.
- Dependencies: design and plan gates.
- Risks: repository doubles can diverge from TypeORM behavior; Compose smoke verification is required.
- Commit boundary: backend ownership/idempotency behavior only.

## TASK-002 TDD evidence

- Exact files: `apps/control-plane/src/health/**`, `apps/control-plane/src/seed.service.ts`, `docker-compose.yml`
- Exact command: `npm --workspace apps/control-plane test -- --runInBand`
- Expected RED failure: health/bootstrap contract is absent before implementation.
- Actual RED result / exit status: Not separately captured before TASK-001; first runtime verification exposed a TypeORM metadata startup failure, which was fixed and reverified.
- GREEN result / exit status: `docker compose up -d --build` reached healthy API and portal containers after runtime fixes (exit 0).
- Full-suite evidence: `docker compose config` passed; live smoke journey passed health, seed, ownership, idempotency, and lifecycle checks.
- Environment: Node 20, Docker Compose, PostgreSQL 16.
- Artifact/link: `verification.md` live Compose evidence.
- Recorded by: human:tdd-developer
- Timestamp: 2026-08-22T09:10:45Z.
- Commit/revision: Working tree; repository has no accessible Git metadata in this environment.
- Dependencies: TASK-001.
- Risks: startup ordering and schema bootstrap failures.
- Commit boundary: runtime/bootstrap/lifecycle only.

## TASK-003 TDD evidence

- Exact files: `apps/portal/src/App.test.tsx`, `apps/portal/src/**`
- Exact command: `npm --workspace apps/portal test -- --run`
- Expected RED failure: portal route and ownership journey are absent before implementation.
- Actual RED result / exit status: Vitest failed to resolve missing `./App` (exit 1) before implementation.
- GREEN result / exit status: Focused Vitest passed 1 test and portal production build passed (exit 0).
- Full-suite evidence: `npm test` passed backend 2 tests and frontend 1 test.
- Environment: Node 20, npm 10, Vitest and Testing Library.
- Artifact/link: PENDING.
- Recorded by: human:tdd-developer
- Timestamp: 2026-08-22T09:10:45Z.
- Commit/revision: Working tree; repository has no accessible Git metadata in this environment.
- Dependencies: TASK-001 API contract.
- Risks: async UI state can regress into blank or stale screens.
- Commit boundary: portal behavior only.

## TASK-004 TDD evidence

- Exact files: `README.md`, `wiki/architecture/baseline/README.md`, `wiki/delivery/features/FTR-001-poc-platform/**`
- Exact command: `npm run verify && uv run --frozen --extra test python scripts/validate_scaffold.py && uv run --frozen --extra test pytest`
- Expected RED failure: runtime/documentation evidence is incomplete before verification.
- Actual RED result / exit status: Initial verification was blocked by scaffold validator scanning generated `node_modules` (exit 1); validator scope was corrected to exclude generated trees.
- GREEN result / exit status: Scaffold validator passed 127 Markdown / 192 text files (exit 0).
- Full-suite evidence: `npm run build`, `npm test`, `docker compose config`, scaffold validator, and Python suite all passed in their recorded runs.
- Environment: Node 20, Docker Compose, Python 3.11+, uv.
- Artifact/link: `verification.md` final verification matrix.
- Recorded by: human:release-verifier
- Timestamp: 2026-08-22T09:10:45Z.
- Commit/revision: Working tree; repository has no accessible Git metadata in this environment.
- Dependencies: TASK-002 and TASK-003.
- Risks: local environment may not have a running Docker daemon.
- Commit boundary: verification and durable docs only.

## TASK-005 TDD evidence

- Exact files: `apps/control-plane/src/workspace/**`, `apps/control-plane/src/preview/**`, `apps/control-plane/src/auth/**`, `apps/portal/src/App.tsx`, `workspace-template/**`
- Exact command: `npm test -- --runInBand`
- Expected RED failure: the focused persistence test cannot import the missing local workspace service before implementation.
- Actual RED result / exit status: Focused Git recovery run failed because the service restored only its initial snapshot instead of the latest committed source (exit 1); focused Coder lifecycle run failed because the adapter called the unsupported `/start` path instead of the workspace-build transition endpoint (exit 1); focused provider-reflected lifecycle run failed because the service did not call `describe` after accepting a start request (exit 1); focused Coder Git mapping run failed because the configured repository was not returned in the workspace record (exit 1); focused Coder provisioning contract failed because the adapter used the organization-wide workspace path instead of the member-scoped path (exit 1), then failed because it omitted the configured template version (exit 1); owner propagation failed because the provider call omitted the seeded Coder username (exit 1); template selection failed because the request sent both a template ID and template version (exit 1); and the concurrent idempotency test failed because a PostgreSQL unique-constraint error was rethrown instead of returning the winning project (exit 1).
- GREEN result / exit status: `npm run verify` passed 7 backend suites / 26 tests and 2 frontend suites / 9 tests; the rebuilt Compose stack passed PostgreSQL/API/portal health, seeded local login, and route-removal checks.
- Full-suite evidence: `npm run build` passed. The rebuilt workspace image built the React/Vite frontend, preinstalled the FastAPI/SQLAlchemy runtime, and ran 2 generated-app backend tests during image build with no AI extension directory. Local named-user auth passed its production guard, unknown-user, and JWT session tests. The Kubernetes Coder template passed provider-backed Terraform validation and its shell startup scripts passed syntax checks.
- Environment: Node 20, npm 10, Docker Compose, PostgreSQL 16.
- Artifact/link: `verification.md` current Compose journey and `workspace-template/README.md` runtime contract.
- Recorded by: human:tdd-developer.
- Timestamp: 2026-08-22T09:35:00Z.
- Commit/revision: Working tree; repository has no accessible Git metadata in this environment.
- Dependencies: TASK-002 and TASK-003.
- Risks: external Coder/Git/Kubernetes behavior needs operator-supplied integration evidence; local provider is the offline fallback. SSO/OIDC and AI gateway integration are explicitly out of scope.
- Commit boundary: generated-app workspace, preview continuation, and external integration seams.

- Follow-up evidence: Coder lifecycle mapping is covered by `coder-workspace.service.spec.ts`: start/stop post `transition: start|stop` to the Coder workspace-build endpoint, a successful build with a ready agent maps to `Running`, and the project detail read path refreshes persisted status from the provider rather than assuming a request succeeded.
- Follow-up evidence: provider-unavailable project reads preserve the last lifecycle state, record a correlation ID in `lastKnownError`, and log the project/request pair; this is covered by `projects.service.spec.ts`.
- Follow-up evidence: `auth.service.spec.ts` covers the local named-user production guard, unknown-user rejection, and JWT session contract.
- Follow-up evidence: `projects.service.spec.ts` now verifies that a successful lifecycle request is followed by provider status refresh; a Coder build still reports `Creating` until the provider reports readiness.
- Follow-up evidence: `coder-workspace.service.spec.ts` verifies the configured `CODER_GIT_REMOTE_URL` is surfaced as the project source mapping without storing the provider token in the project record.
- Follow-up evidence: seeded users carry a per-user Coder username; `projects.service.spec.ts` verifies that mapping is passed to provisioning and `coder-workspace.service.spec.ts` verifies member-scoped creation uses that owner. The adapter sends exactly one of `template_id` or `template_version_id`.
- Follow-up evidence: `projects.service.spec.ts` now verifies a newly created external workspace remains `Creating` until the provider `describe` response reports readiness; `App.test.tsx` verifies the portal waits for `Running` before opening a starting workspace.
- Follow-up evidence: `workspace-template/golden-app/test_main.py` covers generated request create/list/update and whitespace-title rejection; the Docker image build executes those tests with its pinned runtime.
- Follow-up evidence: `projects.service.spec.ts` covers recovery from PostgreSQL unique constraint `23505`; the live Compose race test returned HTTP 201 from both concurrent requests with one shared project ID.
- Follow-up evidence: DTO-focused tests reject whitespace-only project names and request titles; `preview.controller.spec.ts` denies stopped previews; `local-workspace.service.spec.ts` verifies missing source-tree repair and safe preview initialization; `projects.service.spec.ts` verifies local lifecycle reflection and persisted local preview URL normalization.
- Follow-up evidence: `projects.service.spec.ts` verifies owner project-list reads refresh provider lifecycle state; `App.test.tsx` verifies provider errors are visible on project cards with a retry action; the rebuilt Compose image passed the authenticated project-list and preview smoke at 2026-08-23T04:57:08Z.
- Follow-up evidence: `App.test.tsx` now verifies named-user login retry and project-creation retry with the same idempotency key; `ErrorState` retry controls are explicit non-submit buttons so retries are intentional and not accidental form submissions. The rebuilt portal passed 8 tests and the authenticated Compose smoke passed at 2026-08-23T05:03:31Z.
- Follow-up evidence: `api.test.ts` verifies array-valued Nest validation messages remain readable and retain the response request ID; the rebuilt portal passed 9 tests and the authenticated Compose smoke passed at 2026-08-23T05:07:19Z.
- Follow-up evidence: `docker-compose.yml` now health-checks the static portal on `127.0.0.1`; after correcting the image's localhost address family, all three Compose services reported healthy and the portal HTTP smoke passed at 2026-08-23T05:10:22Z.

## TASK-006 TDD evidence

- Exact files: `apps/control-plane/src/projects/projects.service.ts`, `apps/control-plane/src/projects/projects.service.spec.ts`, `apps/control-plane/src/workspace/workspace-governance.service.ts`, `apps/control-plane/src/workspace/workspace-governance.service.spec.ts`
- Exact command: `npm --workspace apps/control-plane test -- --runInBand projects.service.spec.ts workspace-governance.service.spec.ts`
- Expected RED failure: A deletion requested during provisioning could be overwritten by a late provider `Running` response, and no policy worker existed to stop over-limit or idle workspaces.
- Actual RED result / exit status: Focused Jest lifecycle test failed because deletion called the placeholder workspace ID and provisioning resurrected the project; governance spec initially failed with missing `workspace-governance.service` (exit 1).
- GREEN result / exit status: Focused project and governance suites passed after transition-state preservation, bounded capacity checks, provider cleanup, and the policy reaper (exit 0).
- Full-suite evidence: Live Compose lifecycle smoke returned `Creating`, then `Running`; a second active create returned HTTP 409; stop transitioned to `Stopped`; delete returned HTTP 404 on later detail read and retained all six expected audit actions.
- Environment: Node 20, NestJS, PostgreSQL 16, Docker Compose local provider.
- Artifact/link: `governance-extension.md` and `verification.md`.
- Recorded by: codex:tdd-implementer.
- Timestamp: 2026-08-23T13:44:00Z.
- Commit/revision: Working tree; repository has no accessible Git metadata in this environment.
- Dependencies: Approved governed-workspace extension and existing project ownership seam.
- Risks: Local Compose models owner-scoped data but still shares one code-server process; Coder/Kubernetes is required for production isolation.
- Commit boundary: Lifecycle state machine, provider cleanup, capacity checks, and reaper only.

## TASK-007 TDD evidence

- Exact files: `apps/control-plane/src/admin/**`, `apps/control-plane/src/audit/**`, `apps/control-plane/src/configuration/**`, `apps/control-plane/src/auth/roles.*`, `apps/portal/src/App.tsx`, `apps/portal/src/api.ts`
- Exact command: `npm --workspace apps/control-plane test -- --runInBand admin.service.spec.ts admin.controller.spec.ts audit-log.entity.spec.ts && npm --workspace apps/portal test -- --run`
- Expected RED failure: No admin service/controller, role guard, typed configuration path, audit entity, or administrator portal existed.
- Actual RED result / exit status: Admin focused test initially failed to import the missing `admin.service`; live startup then exposed TypeORM inferring nullable audit identifiers as `Object`, causing the control plane to exit (exit 1).
- GREEN result / exit status: Admin/configuration/audit and portal suites passed after explicit PostgreSQL varchar metadata, role guard, controller audit decorator, and admin UI implementation (exit 0).
- Full-suite evidence: Live administrator smoke returned all three seeded policy keys, denied a member admin request with HTTP 403, and a same-value policy save recorded `CONFIGURATION_UPDATED` with administrator actor and configuration resource ID.
- Environment: Node 20, NestJS, TypeORM/PostgreSQL 16, React/Vite portal, Docker Compose.
- Artifact/link: `governance-extension.md` and `wiki/log.md`.
- Recorded by: codex:tdd-implementer.
- Timestamp: 2026-08-23T13:44:00Z.
- Commit/revision: Working tree; repository has no accessible Git metadata in this environment.
- Dependencies: TASK-006 lifecycle aggregate and named local administrator seed.
- Risks: Audit events are durable application records but are not a tamper-resistant SIEM export; inner-IDE command telemetry is not collected.
- Commit boundary: Role authorization, configuration administration, controller/system audit events, and admin portal only.

## TASK-008 TDD evidence

- Exact files: `wiki/delivery/features/FTR-001-poc-platform/governance-extension.md`, `wiki/delivery/features/FTR-001-poc-platform/tasks.md`, `wiki/delivery/features/FTR-001-poc-platform/verification.md`, `wiki/log.md`, `scripts/validate_scaffold.py`
- Exact command: `npm --workspace apps/control-plane test -- --runInBand && npm --workspace apps/portal test -- --run && python3 scripts/validate_scaffold.py`
- Expected RED failure: Governance requirements and evidence were absent from the feature package, and the validator exposed generated Terraform provider documentation as a false-positive scanned artifact.
- Actual RED result / exit status: Scaffold validator failed on an unexcluded generated `.terraform` provider README and missing TASK-006 through TASK-008 structured evidence blocks (exit 1).
- GREEN result / exit status: Documentation, canonical task evidence, and generated-directory validator exclusion are updated; the relevant suites and validator are rerun after this evidence update.
- Full-suite evidence: Control-plane 13 suites / 34 tests, portal 2 suites / 11 tests, production builds, live healthy Compose stack, administrator smoke, policy audit smoke, and lifecycle cleanup smoke all passed in this turn.
- Environment: Node 20, Python 3, Docker Compose, PostgreSQL 16.
- Artifact/link: `verification.md`, `governance-extension.md`, and `wiki/log.md`.
- Recorded by: codex:verifier.
- Timestamp: 2026-08-23T13:44:00Z.
- Commit/revision: Working tree; repository has no accessible Git metadata in this environment.
- Dependencies: TASK-006 and TASK-007 implementation evidence.
- Risks: Independent specification, quality, security, accessibility, operational, and release reviews remain human-owned gates.
- Commit boundary: Verification evidence and durable documentation only.

## TASK-009 TDD evidence

- Exact files: `apps/control-plane/src/admin/admin.controller.ts`, `apps/control-plane/src/admin/admin.service.ts`, `apps/control-plane/src/admin/dto/cms-query.dto.ts`, `apps/control-plane/src/admin/dto/admin-create-project.dto.ts`, `apps/control-plane/src/admin/dto/update-user-role.dto.ts`, `apps/portal/src/AdminPage.tsx`, `apps/portal/src/App.tsx`, `apps/portal/src/api.ts`, `apps/portal/src/styles.css`
- Acceptance criteria: Administration CMS criteria 8-12 in `governance-extension.md`.
- Exact command: `npm --workspace apps/control-plane test -- --runInBand src/admin/admin.service.spec.ts src/admin/admin.controller.spec.ts && npm --workspace apps/portal test -- --run`
- Expected RED failure: no user/role APIs, no administrator project-create API, generic one-field search only, split configuration modules, and an audit table that labels a user's name as Actor.
- Actual RED result / exit status: Controller TypeScript compilation failed because filtered project queries, roles, role updates, and administrator project creation did not exist; the portal test failed because Users & roles and unified Configuration navigation did not exist (exit 1).
- Expected GREEN success: focused backend and portal tests prove multi-field filter forwarding, safe role assignment, administrator project creation, unified configuration navigation, user/role module visibility, advanced search toggling, and corrected audit columns.
- GREEN result / exit status: Focused backend suites passed 5 tests and the focused portal suite passed 10 tests after implementing the CMS contracts (exit 0).
- Full-suite evidence: Control-plane passed 13 suites / 40 tests and portal passed 2 suites / 11 tests; production builds passed; the scaffold validator checked 147 Markdown / 281 text files; rebuilt Compose and live browser/API/PostgreSQL verification passed.
- Environment: Node 20, NestJS, React/Vite, TypeORM, PostgreSQL 16, Docker Compose.
- Artifact/link: `governance-extension.md`, `verification.md`, and the Directus/Django/Wagtail official documentation recorded in the task conversation.
- Recorded by: codex:tdd-implementer.
- Timestamp: 2026-08-23T15:51:00Z.
- Commit/revision: Working tree; no commit created in this task.
- Dependencies: TASK-006 and TASK-007.
- Risks: role changes can remove administrative access; the implementation must preserve at least one Administrator.
- Commit boundary: administration CMS behavior and documentation only.
