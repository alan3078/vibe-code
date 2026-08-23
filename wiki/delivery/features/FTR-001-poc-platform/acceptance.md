# Vibe-Code Platform Local POC Acceptance

## Definition of Ready

- [x] Actors, scope, non-goals, risks, dependencies, and acceptance criteria are explicit.
- [x] Design and required ADR are recorded.
- [x] Tasks are vertical and testable.

## Release readiness

- [x] Clean Compose startup and seed bootstrap evidence exists.
- [x] Focused backend and frontend tests pass.
- [x] Ownership negative path passes.
- [x] Local generated-app source, SQLite preview data, Git initialization, and stop/start continuation pass.
- [x] Seeded local named-user JWT login, owner-scoped access, Coder workspace-build transitions, and latest Git snapshot recovery are covered by focused tests.
- [x] The portal exposes no SSO/OIDC login or AI usage surface in the local POC.
- [x] Kubernetes/K3s Coder template contract validates with one persistent workspace Deployment/PVC, resource limits, owner-only apps, and no host Docker socket.
- [x] Golden app backend round-trip tests run in the pinned workspace image, and the generated React/Vite frontend type/build check passes.
- [x] Whitespace-only project names and request titles are rejected by the control-plane validation contract.
- [x] Local preview access is denied while stopped, and missing persisted local source trees are repaired before continuation.
- [ ] Accessibility review is complete.
- [ ] Operational-readiness review is complete.
- [ ] Live Coder/Kubernetes workspace and Git-provider acceptance is complete.
- [ ] Quantified repeat-run acceptance and the required independent spec/quality/security reviews are complete.
- [ ] Human owner approves local POC residual risk and deferred external workspace integrations.
