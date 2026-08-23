# Vibe-Code Platform Local POC Use Cases

## UC-01: Sign in and list owned projects

- Actor: Named POC user
- Trigger: User opens the portal.
- Preconditions: Compose stack is healthy; user exists in the seed data.
- Success flow: User selects a seeded identity, receives a session, and sees only their projects.
- Alternate flow: User has no projects and sees the empty state with a create action.
- Failure flow: API unavailable; portal shows an error and retry action.
- Postconditions: Browser holds only the local session token.
- Observable acceptance evidence: portal smoke test and API ownership tests.

## UC-02: Create and continue a project

- Actor: Named POC user
- Trigger: User submits a valid project name.
- Preconditions: Authenticated session and available API/database.
- Success flow: API creates one owner-scoped project from the pinned golden template; portal shows progress then a usable running detail state.
- Alternate flow: Same idempotency key is retried; original project is returned.
- Failure flow: Invalid name or unavailable API; form error includes retry guidance.
- Postconditions: Project metadata and lifecycle status are persisted in PostgreSQL.
- Observable acceptance evidence: focused service tests and browser/API smoke flow.

## UC-03: Protect project ownership

- Actor: Second named POC user
- Trigger: User calls a project detail or lifecycle endpoint for another user’s project.
- Preconditions: First user owns the project.
- Success flow: Backend returns `404` without disclosing ownership; portal cannot open the project.
- Alternate flow: User lists projects and receives only their own rows.
- Failure flow: Missing/invalid token returns `401`.
- Postconditions: No cross-user project data is returned.
- Observable acceptance evidence: negative API tests.
