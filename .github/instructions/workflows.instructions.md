---
applyTo: '.github/workflows/**'
---

# GitHub Actions workflows

Treat workflow changes as security-sensitive executable code.

- Pin third-party actions to immutable commit SHAs when policy requires it and document update ownership.
- Declare the minimum `permissions` required at workflow or job scope.
- Avoid `pull_request_target` with untrusted checkout or execution.
- Do not print secrets, contexts, tokens, environment files, or sensitive command output.
- Quote variables crossing shell boundaries and treat branch names, issue text, and PR data as untrusted input.
- Use concurrency controls for stateful jobs and explicit timeouts for every job.
- Separate read-only validation from release, deployment, and publication workflows.
- Require protected environments or human approval for privileged actions.
- Keep forks and public pull requests safe when secrets are unavailable.
- Test changed workflow syntax and review dependency provenance.

No workflow may grant write permissions merely for convenience.
