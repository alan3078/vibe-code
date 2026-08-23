# Governed-workspace extension

## Authority and intent

This extension records the product owner's current request to evolve the local POC
from a basic owned-project journey into a governed, observable multi-user pilot
foundation. It supersedes the earlier FTR-001 non-goal that excluded an admin
dashboard and configuration management.

## Actors

| Actor | Responsibilities | Explicitly cannot do |
|---|---|---|
| Member | Create, start, stop, open, and delete only their own projects; view their own lifecycle history. | View or operate another member's projects, configuration, or audit history. |
| Administrator | View all projects, set platform resource policy, force lifecycle transitions, delete projects, and inspect audit events. | Read workspace source, terminal contents, or secrets through the portal. |
| System | Provisions, starts, stops, deletes, and idles workspaces according to policy. | Act without an audit event or bypass ownership checks. |
| Workspace provider | Executes local/Coder lifecycle commands and returns observed state. | Decide platform policy or authorize users. |

## Scope

1. **Governed lifecycle** — `Creating`, `Starting`, `Running`, `Stopping`,
   `Stopped`, `Deleting`, `Deleted`, and `Failed` are distinct observable states.
   Create/start/stop/delete requests acknowledge a transition immediately; the
   provider result is reconciled asynchronously.
2. **Resource policy** — administrator-managed settings define the maximum active
   workspaces per member and a last-observed-activity timeout. A scheduled reaper
   stops idle running workspaces and reconciles pre-existing over-limit workspaces.
3. **Project deletion** — a member must explicitly confirm deletion. The project is
   soft-deleted for audit retention; the local workspace directory, SQLite data,
   and recovery snapshot are removed by the provider. A configured Git remote is
   not deleted.
4. **Administration CMS** — a seeded local administrator can create projects for
   a selected user, manage user role assignments, view and update configuration
   groups/items in one module, perform governed lifecycle actions, and inspect
   the audit trail.
5. **Auditability** — authenticated controller actions are decorated and captured;
   asynchronous workspace/provider failures emit system audit events with the
   request correlation ID when available.
6. **Platform metadata** — introduce configuration groups/items, audit events, and
   explicit role and lifecycle/activity timestamps alongside the existing project
   aggregate. Generated-app SQLite remains separate from platform PostgreSQL.

## Policies and defaults

| Configuration key | Default | Effect |
|---|---:|---|
| `workspace.max_active_per_user` | `1` | `Creating`, `Starting`, `Running`, and `Stopping` consume the active-workspace slot. |
| `workspace.idle_timeout_minutes` | `30` | A `Running` workspace with no observed portal/preview/IDE-open activity is stopped. |
| `workspace.reaper_interval_seconds` | `30` | Frequency for local policy reconciliation. |

The local POC can only observe portal, preview, and workspace-open activity. It
cannot yet measure inside-IDE keyboard/terminal activity; that is a documented
future code-server/Coder telemetry integration, not a reason to keep a workspace
running indefinitely.

The local Compose POC runs one control-plane process. It serializes concurrent
create attempts per member so the active-workspace policy cannot be bypassed by
two simultaneous requests. A horizontally scaled production deployment must
replace that process-local gate with a PostgreSQL advisory lock or equivalent
transactional capacity reservation.

## Acceptance criteria

1. A member cannot exceed the configured active-workspace limit through create or
   start requests; the response is a useful conflict error and audit event.
2. Creation visibly begins as `Creating`; start, stop, and delete visibly pass
   through their transition state before provider reconciliation reaches the final
   state.
3. The idle reaper stops an inactive running workspace and records a
   `WORKSPACE_STOPPED_BY_POLICY` system audit event with an `idle_timeout` or
   `active_workspace_limit` reason.
4. Deleting a project requires a client confirmation, removes the local workspace
   data, hides the project from member lists, and preserves an audit event.
5. An administrator can update the policy through the portal; the next lifecycle
   decision observes the changed value without an application rebuild.
6. Member CRUD/lifecycle, admin actions, provider failures, and reaper actions have
   actor, action, resource, outcome, timestamp, and correlation context in PostgreSQL.
7. A member cannot call any admin endpoint; an administrator cannot use the admin
   portal to read workspace source or generated-app data.
8. The CMS exposes Overview, Projects, Configuration, Users & roles, and Audit log
   modules. Configuration groups and their items are presented together rather
   than as separate navigation destinations.
9. Every list has three visible basic filters. An Advanced search toggle reveals
   domain-specific filters, all of which execute server-side with pagination.
10. Audit rows display separate Date/time, User, Actor type, User role, Action,
    Resource, and Outcome columns. A user's name is never labelled as an actor
    type. Actor type is limited to `User` or `System`; `Member` and
    `Administrator` are user roles, not actor types.
11. An administrator can create a project for a selected user through the Projects
    module, subject to the same template, uniqueness, quota, and audit rules as
    member creation.
12. The Users & roles module lists users and built-in roles and allows safe role
    assignment; the final Administrator account cannot be demoted.

## Risks and non-goals

- The local Compose adapter still shares the code-server container. It models
  policy and owner-scoped filesystem paths but does not prove process isolation;
  the Coder/Kubernetes template remains the one-pod/PVC-per-project deployment
  path.
- Git remote lifecycle and enterprise-repository creation remain separate
  integration work. Deleting a platform project never deletes a Git remote.
- The POC records audit events in PostgreSQL; tamper-resistant export/retention,
  SIEM streaming, and IDE command telemetry are follow-up work.

## Delivered POC data model

The platform database deliberately distinguishes product ownership, policy, and
evidence instead of storing all controls in a single project row:

- `users`: named local members and administrators, including provider mapping.
- `templates`: approved provisionable template identity/version.
- `projects`: the owned project aggregate, asynchronous lifecycle, provider
  identifier, activity/provision/stop/deletion timestamps, and non-secret last
  provider error.
- `configuration_groups` and `configuration_items`: typed, bounded, mutable
  administrative policy; values are read at decision time rather than compiled
  into the service.
- `audit_logs`: append-only application evidence with actor type/role, resource,
  outcome, timestamp, request correlation, and redacted metadata.

### Administration CMS contract

The administration area is a module-based CMS, not a single settings page. Its
left navigation contains Overview, Projects, Configuration, Users & roles, and
Audit log. Configuration is a parent/child editor: groups organize their items
inside one module and are not separate navigation destinations. Every list
module is backed by an authenticated, administrator-only API with three visible
basic filters, optional advanced filters, `page`, and `pageSize` (default 20,
maximum 100). Search executes in PostgreSQL and pagination is applied before the
response is sent; the browser must not load an unbounded administrative dataset.

The built-in roles are `Member` and `Administrator`. They are fixed application
capabilities for this POC, displayed with descriptions and user counts in the
Users & roles module; administrators assign users to them. Arbitrary permission
composition and custom role creation remain production RBAC follow-up work.

Every decorated governed request persists a `*_REQUESTED` audit record before
the handler may mutate state. Database-backed configuration and role changes
persist their completion evidence in the same PostgreSQL transaction; system
workspace completion/failure evidence is awaited rather than discarded on an
audit write failure.

| Table | Purpose and relationships | Operational constraints |
|---|---|---|
| `users` | One user owns many `projects` and can be referenced by many `audit_logs`. | Role distinguishes Member from Administrator. |
| `templates` | One approved template can be used by many `projects`. | The template version is persisted with each project reference. |
| `projects` | Owned workspace aggregate; many audit rows can point to one project. | Owner/name and owner/idempotency uniqueness are enforced for non-deleted rows; owner/status is indexed for quota decisions. |
| `configuration_groups` | Parent category for one or more `configuration_items`. | Unique stable `key`; `isActive` prevents mutable item updates while a policy area is disabled. |
| `configuration_items` | Typed administrative policy values belonging to exactly one group. | Unique global key and group/key uniqueness; values carry type, bounds, mutability, sensitivity, and timestamps. Sensitive values are redacted from CMS responses. |
| `audit_logs` | Append-only evidence linking an optional actor and optional project to each administrative or system action. | Indexed by creation time, resource identity, and request ID; no portal update/delete operation is exposed. |

Configuration groups and items are intentionally separate tables: groups control
policy-area identity and activation, while items provide typed, validated,
auditable values. This allows the CMS to evolve groups without adding columns
to the project aggregate or conflating deployment-managed secrets with policy.

Generated-app SQLite is intentionally not part of platform governance metadata:
it stays inside the project workspace and is removed with that workspace.
# Workspace governance and local-demo security boundary

The Docker Compose stack is a loopback-only, single-developer demonstration. It publishes the portal, control plane, and shared code-server only on `127.0.0.1`; its named-user demo login is enabled only by the Compose-only `LOCAL_DEMO_AUTH=true` setting. It must never be exposed as a multi-user deployment.

The control plane serializes active-slot reservation per member. In PostgreSQL deployments it uses a transaction-scoped advisory lock and conditional status updates, so independently running API replicas cannot both reserve the same active workspace slot and an asynchronous worker cannot overwrite a later deletion.

Fresh production PostgreSQL databases apply the compiled baseline migration when started with `RUN_MIGRATIONS=true`; the local development POC continues to use TypeORM synchronization. A production release runs migrations as a one-off, single replica before scaling the control plane.

Coder provisioning is idempotent at the provider boundary: the control plane derives the workspace name from the immutable project ID, then resolves that owner/name before creating a new Coder workspace. This lets restart recovery reattach a provider workspace created before its ID was persisted.

If a Coder creation response is ambiguous (for example, a network response is lost), the project remains in `Creating`, records a reconciliation audit event, and retries the deterministic lookup instead of creating a duplicate workspace or declaring the operation terminally failed.

The Coder workspace template uses a dedicated service account with token automount disabled, non-root execution, `RuntimeDefault` seccomp, dropped Linux capabilities, disabled privilege escalation, a read-only root filesystem, and explicit writable mounts only for the workspace PVC, `/tmp`, and the Coder home directory. Cluster egress policy remains an operator-owned deployment concern because the Coder control-plane and approved Git/DNS destinations vary by installation.

For multi-user use, each project is provisioned through Coder as an owner-only application backed by its own Kubernetes pod and persistent volume. The shared local code-server is not a tenant boundary. Workspace Git credentials are not passed into the user-controlled container; use user-managed Git credentials or a server-side broker instead.
