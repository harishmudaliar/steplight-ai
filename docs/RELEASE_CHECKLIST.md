# Release Checklist

## Current status

The release is **not approved for public distribution**. Current local builds use `https://api.example.test/api`, are unsigned, and use the default Electron icon.

## Pre-release gates

- [ ] Provision hosted PostgreSQL and verify TLS, role permissions, backups, and restore into an isolated database.
- [ ] Configure production secrets in the backend host's secret store; do not place secrets in `.env.example`, Vite, or Electron.
- [ ] Run `python -m alembic -c backend\alembic.ini upgrade head` once as a release step and retain the migration revision/result.
- [ ] Deploy FastAPI and verify health, CORS, auth, ownership, error handling, rate limits, and logging.
- [ ] Build the website and Windows renderer with the deployed HTTPS API URL; verify the URL is not a placeholder.
- [ ] Resolve or formally accept the five moderate npm audit findings; rerun `npm audit`.
- [ ] Run `npm test`, `npm run typecheck`, and production builds from a clean install.
- [ ] Perform browser and Electron authenticated workflow: create task, suggest step, all five feedback actions, refresh/logout/login, offline/reconnect, and cross-client refresh.
- [ ] Run route-wide accessibility checks including keyboard-only and screen reader; verify reduced motion and contrast at supported breakpoints.
- [ ] Run a latency/load test against the target service and document thresholds/results.
- [ ] Verify Gemini with a synthetic request only, if approved; verify opt-in, prompt fields, safe fallback, and no secret exposure.
- [ ] Obtain product icon and Windows signing certificate; verify signature on executable and NSIS installer.
- [ ] Confirm native Windows notification behavior and permission/settings on target Windows versions.
- [ ] Test clean install, application launch, restart persistence, upgrade, and uninstall using an isolated account/data path.
- [ ] Enable update service/metadata only after signed release and update endpoint are operational; auto-update is currently disabled.
- [ ] Publish release notes, support instructions, backup/restore procedure, and rollback plan.

## Verified locally for Phase 12

- [x] Shared/web/desktop regression tests: 144 passing (5 backend warnings).
- [x] Typecheck and production build.
- [x] x64 NSIS packaging.
- [x] Isolated temporary install, bundled renderer check, window launch check, and silent uninstall.
- [x] Root `.env` ignore and exact configured secret-value bundle scan.

See [Phase 12 report](./PHASE_12_REPORT.md) and [deployment guidance](./DEPLOYMENT.md).
