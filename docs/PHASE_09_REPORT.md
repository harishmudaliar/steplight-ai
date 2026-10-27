# Phase 9 Report — Cross-Platform Sync and Offline Behavior

**Date:** 2026-10-25  
**Verdict:** **PARTIAL**

## Summary

The backend now supports PostgreSQL-only production configuration, migrated task/step version fields, and optimistic conflict detection. Web and Electron share one React renderer and API client, use the same explicit production API URL, refresh expired access tokens once, and retry safe GET requests once. Offline writes are rejected rather than queued. The browser service worker and bounded per-account status index are implemented without caching API responses or task text.

Automated tests, workspace typechecking, and the production build passed. This phase is not a PASS: there was no hosted PostgreSQL deployment or physical separate-device run, and offline app-shell reload did not produce a consistent bounded result in the browser harness.

## Design decisions

- **Shared production API:** Both renderer targets use `VITE_API_BASE_URL`; production requires HTTPS and rejects localhost or a missing URL. This value is public client configuration, not a secret.
- **Production persistence:** Production refuses SQLite and requires PostgreSQL. PostgreSQL URLs are normalized to psycopg 3. Alembic runs as a release/pre-deploy step, not independently in each replica. No cloud provider, hosted database, or credentials were supplied.
- **Conflict handling:** Tasks and steps begin at version 1. The client sends `If-Match`; conditional updates increment versions atomically. Stale versions return HTTP 409 with reload guidance. The header remains optional for compatibility with older clients. There is no automatic field merge.
- **Retry and authentication:** A protected request that receives 401 can refresh once and retry once. Safe GETs receive one bounded retry after a network failure or 502/503/504. Mutations are never retried automatically or queued; feedback retains its idempotency key for deliberate retries.
- **Offline privacy and behavior:** The service worker targets only same-origin app-shell navigation and static assets, never API data. Asset cache lookup ignores `Vary` to permit reuse for script/style requests. The local index is bounded to 50 task IDs, status, version, and update timestamps per account; it excludes titles, notes, steps, and credentials. Explicit logout/account deletion clears it. Offline edits are unavailable.

## Files changed

- Backend configuration and persistence: `backend/app/config.py`, `backend/app/database.py`, `backend/alembic/env.py`, `backend/app/models/task.py`, `backend/app/schemas/task.py`, `backend/app/api/tasks.py`, `backend/requirements.txt`, and new `backend/alembic/versions/c39f16a02bd7_add_record_versions.py`.
- Backend tests: `backend/tests/test_phase9_sync.py`, `backend/tests/test_fail_closed.py`, and `backend/tests/test_migrations.py`.
- Shared client and types: `packages/shared/src/api/client.ts`, `packages/shared/src/api/config.ts`, `packages/shared/src/api/client.test.ts`, `packages/shared/src/types/index.ts`, and `packages/shared/src/index.ts`.
- Web behavior: `apps/web/src/context/AuthContext.tsx`, `apps/web/src/context/TaskContext.tsx`, `apps/web/src/components/Layout.tsx`, `apps/web/src/main.tsx`, `apps/web/src/pages/OfflinePage.tsx`, `apps/web/src/pages/TaskEditPage.tsx`, `apps/web/src/pages/PrivacyPage.tsx`, `apps/web/src/pages/SettingsPage.tsx`, `apps/web/src/hooks/useOnlineStatus.ts`, `apps/web/src/hooks/useOnlineStatus.test.tsx`, `apps/web/src/utils/offlineTaskIndex.ts`, `apps/web/src/utils/offlineTaskIndex.test.ts`, `apps/web/src/test/App.test.tsx`, and `apps/web/public/service-worker.js`.
- Deployment and documentation: `.env.example`, `.dockerignore`, `Dockerfile`, `README.md`, `docs/ARCHITECTURE.md`, and `progress.md`.

## Verification evidence

Commands run from the repository root in PowerShell:

```powershell
$env:PATH = "$PWD\.venv\Scripts;$env:PATH"
npm test
npm run typecheck
$env:VITE_API_BASE_URL = 'https://api.example.test/api'
npm run build
node --check apps/web/public/service-worker.js
node --check apps/web/dist/service-worker.js
```

- `npm test` — **PASS**: Shared 13, Web 58, Backend 72; 143 total, with 5 warnings.
- `npm run typecheck` — **PASS** across shared, web, and desktop workspaces.
- Production build with `VITE_API_BASE_URL=https://api.example.test/api` — **PASS**, Vite transformed 79 modules.
- Both service-worker syntax checks — **PASS**.
- Focused backend run — **PASS**, 23 tests across Phase 9 sync, task, migration, and fail-closed coverage:

```powershell
$env:PATH = "$PWD\.venv\Scripts;$env:PATH"
python -m pytest backend\tests\test_phase9_sync.py backend\tests\test_tasks.py backend\tests\test_migrations.py backend\tests\test_fail_closed.py -q
```

- Automated API tests exercise two authenticated clients against one test service, version conflicts, ownership isolation, and duplicate feedback replay. Shared/web tests cover client retry/refresh, API URL handling, offline status/index behavior, and router parity.
- Browser preview showed service worker registration and the cached app index, JavaScript, and CSS. A cached JavaScript request succeeded while offline. Offline navigation initially showed failed CSS/JS loads; `ignoreVary` cache matching was added and rebuilt. A later attempt displayed the offline UI, but the browser harness reload did not provide a consistent completion/result. Offline reload is therefore **not accepted as verified**.
- A renderer inspection found the configured public API URL and no configured backend-only secret values. This does not replace a production deployment test.

## Startup and deployment commands

Local development, in separate PowerShell terminals:

```powershell
& .\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
npm run dev:web
```

For the shared UI in Electron, keep `npm run dev:web` running and start:

```powershell
npm run dev:desktop
```

Production release migration:

```powershell
python -m alembic -c backend\alembic.ini upgrade head
```

The backend deployment must receive `APP_ENV=production`, `DEBUG=false`, a PostgreSQL `DATABASE_URL`, a strong server-side `JWT_SECRET_KEY`, and appropriate `CORS_ORIGINS`. Build both renderers with the same public HTTPS API base URL. Never place backend credentials in `VITE_*` variables.

## Limitations and unresolved risks

- No hosted PostgreSQL service or production backend was provisioned or tested.
- The two-client scenario is an automated test against one test service/database, not a physically separate web/Electron or separate-device test.
- Docker image build could not be verified because the Docker Desktop daemon was unavailable.
- Offline reload remained inconsistent in the browser harness despite cached assets and the `ignoreVary` adjustment. Do not claim reliable offline app-shell reopening yet.
- GET retry behavior is covered by automated tests; end-to-end service latency was not measured.
- Electron native launch and production API connectivity were not manually verified.
- No real deployment/credentials were available for simultaneous live editing or production PostgreSQL migration testing.

## Next-phase prerequisites

1. Provision a hosted PostgreSQL database and deployment secrets, apply Alembic migrations, then run authenticated sync and conflict checks against the deployed service.
2. Verify the web-create → Electron-resume → Electron-Done → web-refresh flow on separate devices.
3. Make offline shell reload deterministic in a supported browser, then verify reconnect behavior and visible rejection of offline writes.
4. Re-run the latency/retry checks against the deployed backend and retain screenshots/logs without secrets or user data.
