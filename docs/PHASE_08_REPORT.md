# Phase 8 — Progress, History, Explainability & Privacy

**Team:** OLYMPUS  
**Started:** 2026-10-25 09:14 UTC+05:30  
**Verified:** 2026-10-25 09:29 UTC+05:30  
**Verdict:** **PASS**

## Delivered behavior

- Progress cards now use authenticated counts queried from persisted activity events. They display event totals, not goals, streaks, or competitive scores.
- Activity history supports server-side category filters (`all`, `steps`, `pauses`, `tasks`) and pagination. The old recent-list response remains when callers omit pagination/filter parameters.
- Accepted suggestions preserve a server-verified generation reference, source, and strategy with the step. The generation must belong to the task; clients cannot set a false source/strategy by themselves. Activity history displays attribution when the event contains it.
- Explainability screens describe the implemented local strategy retrieval, conditional Gemini path, quality check, and fallback. “Why This Step?” is represented as the stored step rationale, not a clinical conclusion or a complete trace of hidden model reasoning.
- The What the AI Sees page now lists the actual prompt fields and gating behavior: task title, notes/context, capacity, preferred duration, and up to five retrieved strategy candidates. Gemini requests only occur when the user's default-off preference is enabled and a local candidate exists. Local retrieval can use task details without sending them to Google.
- `GET /api/privacy/export` returns the current account's profile, preferences, tasks/steps, activity events, user feedback, step-feedback actions, and safe generation metadata. Password hashes, reset/access/refresh tokens, token hashes, idempotency keys, and request fingerprints are excluded.
- `DELETE /api/auth/me` requires the current password. A wrong password is rejected without deleting the account; successful deletion removes the user's associated application data. Settings exposes the export and a password-confirmed, explicit account deletion flow.
- Privacy copy now reflects the actual Gemini payload and local-vs-external flow. The documented retention policy is that account data remains while the account exists; there is no automatic age-based purge.

## Design decisions

1. Activity summary and timeline queries filter on the authenticated user before aggregation or pagination. Counts are directly sourced from `ActivityEvent` rows.
2. The established unpaginated activity-list contract remains available. The shared web UI uses the new page object API.
3. Suggestion attribution uses the existing metadata-only `StepGeneration` record. The backend validates generation ownership against the task and populates source/strategy from the record before storing the accepted step.
4. Export excludes authentication credentials and idempotency internals. Account deletion requires both password re-entry and a separate confirmation in Settings.
5. No unimplemented retention scheduler is implied. App-side retention, provider retention, and deployment backups are described separately.

## Changed files

- Backend: `backend/app/api/activity.py`, `backend/app/api/auth.py`, `backend/app/api/privacy.py`, `backend/app/api/routes.py`; `backend/app/models/activity.py`, `backend/app/models/task.py`, `backend/app/models/user.py`; `backend/app/schemas/activity.py`, `backend/app/schemas/auth.py`, `backend/app/schemas/task.py`.
- Migration: `backend/alembic/versions/b92c5e6f1074_step_suggestion_attribution.py`.
- Backend tests: `backend/tests/test_phase8.py`, with related migration, task, and Gemini prompt assertions updated in `backend/tests/test_migrations.py`, `backend/tests/test_tasks.py`, and `backend/tests/test_gemini_sequencer.py`.
- Shared contract/client: `packages/shared/src/types/index.ts`, `packages/shared/src/api/client.ts`, `packages/shared/src/api/client.test.ts`.
- Shared UI: `apps/web/src/pages/ProgressPage.tsx`, `TaskHistoryPage.tsx`, `ExplainabilityPage.tsx`, `AiTransparencyPage.tsx`, `PrivacyPage.tsx`, `SettingsPage.tsx`; `apps/web/src/context/TaskContext.tsx`; route expectations and filter interaction in `apps/web/src/test/App.test.tsx`.
- Documentation: `README.md`, `progress.md`, `docs/ARCHITECTURE.md`, and this report.

## Verification evidence

Executed from the repository root on 2026-10-25:

| Command | Result |
|---|---|
| `$env:PATH = "$PWD\.venv\Scripts;$env:PATH"; npm test` | PASS — 130 tests total: Shared 8, Web 56, Backend 66 |
| `npm run typecheck` | PASS — shared, desktop, and web |
| `npm run build` | PASS — shared and desktop TypeScript builds; Vite production build transformed 76 modules |
| `& .\.venv\Scripts\python.exe -m pytest backend\tests\test_phase8.py backend\tests\test_migrations.py backend\tests\test_tasks.py backend\tests\test_auth.py -q` | PASS — 27 focused tests at the focused-check run |
| `& .\.venv\Scripts\python.exe -m pytest backend\tests\test_gemini_sequencer.py -q` | PASS — 10 tests, including exact prompt field disclosure and default-off/local behavior |
| `npm run test:web` | PASS — 56 web tests |
| Browser visual check via `npm run dev:web` at `/ai-transparency` | PASS — page loaded and screenshot captured in the session (guest view) |

Backend acceptance tests verify summary counts against database-stored events; category filtering, pagination, account separation, and rejected client attempts to forge system completion events; export record integrity and omission of credentials; default-off preference behavior; cross-user task/step rejection; and wrong-password plus successful account deletion cascades. Migration tests exercise upgrade/downgrade with the new attribution fields.

## Startup commands

From the repository root in PowerShell:

```powershell
npm run dev:web
& .\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Run the Windows Electron app against the same shared frontend:

```powershell
# Terminal 1
npm run dev:web

# Terminal 2
npm run dev:desktop
```

## Limitations and risks

- No automatic age-based purge is implemented. Account data remains until account deletion. Deletion was exercised in the SQLite test fixture; a production PostgreSQL deletion run was not performed.
- Provider-side Google retention and deployment backup retention are outside this application's deletion guarantee.
- Live Gemini generation remains unverified. The previously executed synthetic provider generation call timed out; tests verify mocked generation and local fallback, not live provider behavior.
- The native Electron window was not launched. The same shared UI remains the renderer, but this phase's screenshot was a guest browser view; authenticated export/deletion screens were not screenshot-tested.
- Older manually created steps can have no source attribution. A rationale string is not a full audit trail of model internals.

## Next-phase prerequisites

- Do not describe the documented retention policy as an automatic purge.
- Continue to scope all export, activity, preference, and deletion operations to the authenticated account.
- Keep external Gemini payload conditions aligned with the prompt builder and Settings consent copy.
- If production account deletion is required, validate database FK/cascade behavior and backup retention in the target deployment environment.
