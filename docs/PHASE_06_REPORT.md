# Phase 6 — Gemini AI Sequencer and Quality Guard

**Project:** Steplight AI — Team OLYMPUS  
**Started:** 2026-10-24 22:17 UTC+05:30  
**Verified:** 2026-10-24 22:43 UTC+05:30  
**Verdict:** **PARTIAL**

## Scope Delivered

- Added a backend-only Gemini REST client. It loads the API key and Flash model from backend settings/root `.env`, requests schema-constrained JSON, validates it with strict Pydantic models, applies bounded timeout/retries, classifies provider/quota errors, and records token/cost estimates without logging prompt text.
- Added a deterministic step quality guard for action length and imperative/single-action form, strategy ID and capacity fit, task relevance, nonjudgmental language, medical wording, and required safety metadata.
- Added an explicit, default-off account preference at `/api/preferences`. When enabled, only task title, optional context, capacity, preferred duration, and retrieved reviewed strategy candidates are sent to Google. The Settings, privacy, AI Transparency, task detail, and sequencer UIs disclose and label the behavior.
- Added persistent `step_generations` metadata and an Alembic migration. Records contain source/model/strategy/guard/token/cost/request/fallback metadata but not user task text, prompt text, or credentials.
- Added deterministic local fallback handling for provider outages/errors, malformed or unsafe output, invalid configuration, and guard rejections. Requests return at most one suggested action.
- Added `backend.scripts.validate_gemini_model` and `backend.scripts.smoke_gemini`; the latter sends only fixed synthetic sample content.
- Updated the local root `.env` model setting and `.env.example` to `gemini-3.8-flash` after the provider reported the former `gemini-2.5-flash` setting retired for new users. The local API key was not changed or displayed.

## Design Decisions

1. Consent is an explicit persisted account preference and defaults false for newly created and migrated users. Without consent, no Gemini request is attempted; the backend uses local reviewed retrieval or the deterministic local step bank.
2. Gemini remains exclusively in FastAPI. The Vite renderer receives only the typed suggestion response; it never receives an API key, database URL, or JWT secret.
3. The prompt is constructed from only the current task title, optional context, capacity, preferred duration, and up to five retrieved reviewed strategies. Raw task text remains transient and is excluded from the global corpus/index and generation metadata.
4. Output must match a strict JSON schema. A local guard is an additional deterministic check, not a guarantee that generated text is clinically or behaviorally correct; users are encouraged to keep only what feels useful.
5. Generation metadata is written with the response operation so an audit record can be associated with the task and generation source. It intentionally omits output/prompt text and secret-bearing provider response bodies.
6. `GEMINI_TIMEOUT_SECONDS` defaults to 30 seconds and retries are bounded to one by default. Token-cost estimates are emitted only when both per-million-token rates are explicitly configured.
7. The API model-info check confirms that the key can see `gemini-3.8-flash` and that `generateContent` is listed as a supported method. However, a real synthetic generation call timed out. This is not treated as a pass; the phase remains partial.

## Files Changed

- Backend service/config/API/schema/model: `backend/app/core/gemini_sequencer.py`, `backend/app/config.py`, `backend/app/api/tasks.py`, `backend/app/schemas/task.py`, `backend/app/models/task.py`, `backend/app/models/preference.py`, `backend/app/schemas/preference.py`, `backend/app/api/preferences.py`, `backend/app/models/__init__.py`, and `backend/app/models/generation.py`.
- Migration and commands: `backend/alembic/versions/c4a91e7d2b60_gemini_generation_metadata.py`, `backend/scripts/validate_gemini_model.py`, and `backend/scripts/smoke_gemini.py`.
- Tests: `backend/tests/test_gemini_sequencer.py`, `backend/tests/test_tasks.py`, `backend/tests/test_isolation.py`, and `backend/tests/test_migrations.py`.
- Shared UI contracts and pages: `packages/shared/src/types/index.ts`, `packages/shared/src/api/client.ts`, `apps/web/src/context/TaskContext.tsx`, `apps/web/src/pages/SettingsPage.tsx`, `apps/web/src/pages/TaskDetailPage.tsx`, `apps/web/src/pages/StepSequencerPage.tsx`, `apps/web/src/pages/AiTransparencyPage.tsx`, `apps/web/src/pages/PrivacyPage.tsx`, and `apps/web/src/test/App.test.tsx`.
- Configuration and documentation: `.env.example`, local root `.env` (model value only; API key unchanged), `README.md`, `progress.md`, `docs/ARCHITECTURE.md`, and this report.

## Verification Evidence

Commands were run in Windows PowerShell from the repository root. Python environment: `.venv` on Python 3.14.0.

```powershell
& .\.venv\Scripts\python.exe -m pytest backend\tests\test_gemini_sequencer.py backend\tests\test_migrations.py backend\tests\test_tasks.py backend\tests\test_isolation.py -q
$env:PATH = "$PWD\.venv\Scripts;$env:PATH"; npm test
npm run typecheck
npm run build
& .\.venv\Scripts\python.exe -m backend.scripts.validate_gemini_model
& .\.venv\Scripts\python.exe -m backend.scripts.smoke_gemini
git diff --check
```

Results:

- Focused backend checks: **19 passed**.
- Full `npm test`: **102 passed** — Shared 6, Web 39, Backend 57. Five pre-existing dependency/deprecation warnings were reported; no failures.
- `npm run typecheck`: **PASS** for shared, Electron desktop, and web.
- `npm run build`: **PASS** for shared, Electron desktop, and web; Vite transformed 76 modules.
- Migration tests verify the added metadata table and migrated default-off consent field; preferences tests verify consent remains user-scoped. Mock generation/API tests cover successful JSON, malformed JSON, timeout, quota, blocked content, quality-guard rejection, safe fallback, and metadata without private task text. The Settings UI test verifies the Gemini switch is off and disabled for an unauthenticated user.
- Model availability command: **PASS** — `models/gemini-3.8-flash` was visible and listed `generateContent` support.
- Real synthetic smoke command: **FAIL/TIMEOUT** — generation did not complete within the configured 30-second timeout. The prior `gemini-2.5-flash` model setting returned an HTTP 404 and the provider described it as retired for new users; the model setting was updated and checked again. No real successful generation has been observed.
- Exact-value secret scan of generated web assets: **PASS** — no configured `GEMINI_API_KEY`, `JWT_SECRET_KEY`, or `DATABASE_URL` value matched the built assets. No key value was printed.
- `git diff --check`: **PASS**.
- No screenshots were captured and no live web/Electron app was launched for interactive parity testing.

The exact-value scan command was:

```powershell
$secretNames = @('GEMINI_API_KEY', 'JWT_SECRET_KEY', 'DATABASE_URL'); $secrets = @(); foreach ($name in $secretNames) { $entry = Get-Content .env | Where-Object { $_ -match "^$name=" } | Select-Object -First 1; if ($entry) { $value = $entry.Substring($name.Length + 1).Trim('"', "'"); if ($value -and $value -notmatch '^(YOUR_|CHANGE_TO_|REPLACE_)') { $secrets += $value } } }; $assets = Get-ChildItem apps\web\dist -Recurse -File; $leaked = $false; foreach ($secret in $secrets) { if (Select-String -Path $assets.FullName -SimpleMatch -Pattern $secret -Quiet) { $leaked = $true } }; if ($leaked) { throw 'A configured backend secret value was found in the web bundle.' } else { 'No configured backend secret values found in generated web assets.' }
```

## Startup and Model-Check Commands

From the project root in PowerShell:

```powershell
& .\.venv\Scripts\python.exe -m alembic -c backend\alembic.ini upgrade head
& .\.venv\Scripts\python.exe -m backend.app.core.strategy_index
```

For the usual FastAPI development server, run:

```powershell
& .\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
npm run dev:web
npm run dev:desktop
```

The model checks are:

```powershell
& .\.venv\Scripts\python.exe -m backend.scripts.validate_gemini_model
& .\.venv\Scripts\python.exe -m backend.scripts.smoke_gemini
```

The smoke command sends only its fixed synthetic sample; do not substitute user task information. Keep `GEMINI_API_KEY` only in the backend environment. The model-info check passing is not evidence that generation calls are working.

## Limitations and Unresolved Risks

- Real provider generation is currently unverified because the synthetic request timed out, despite successful model visibility/capability validation. Keep the per-account toggle default-off and rely on local retrieval/fallback until a successful smoke call is observed.
- The quality guard is heuristic and cannot guarantee that generated text is always relevant or safe. It is not a substitute for human review or clinical advice.
- No browser/Electron screenshots or live CRUD parity session were run. Shared code builds for both clients, but interactive parity remains a manual check.
- Provider retention/processing is governed by Google's terms when consent is enabled; users are told this before opting in.

## Next-Phase Prerequisites

- Resolve and successfully verify the live synthetic Gemini generation request without exposing task text or credentials.
- Confirm the backend reaches a stable provider response at the documented timeout and validate generated output against the guard with the actual model.
- Complete interactive web/Electron task parity and screenshot acceptance.
- Keep all new AI features opt-in, backend-mediated, and fallback-capable.
