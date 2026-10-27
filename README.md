# Steplight AI — One Tiny Step. Zero Shame.

## Responsive application navigation

The shared React renderer uses an in-flow sticky header, a desktop navigation rail at wide widths, and a compact five-action mobile bar with an accessible More menu. Page content now follows the actual header height, including safe-area insets, so content does not depend on a guessed fixed-header offset. Task cards use a full-width action row below the `sm` breakpoint and a side action cluster on wider screens; long titles and descriptions are constrained to the card. Header branding can shrink and truncate without displacing its controls. History, Goals, Today, Dashboard, and the Step Sequencer retain their existing persisted task and timer behavior. Electron uses the same renderer and navigation components through its existing HashRouter.

## Visual QA status — 2026-10-27

The local web URL was established from Vite startup output as `http://127.0.0.1:5173/`; the local backend health endpoint returned HTTP 200. The native Electron renderer was visually inspected in wide and compact windows. History rendered below the header and displayed persisted task progress; long task titles wrapped in the compact view. No app or database data was changed. Browser automation was unavailable, so the ten requested exact viewport sizes, browser network/console inspection, and interactive timer checks were not completed. Native screenshots were inspected during the session but were not saved as workspace image files. The QA run results and viewport coverage are listed in [progress.md](./progress.md).

> **Team:** OLYMPUS  
> **Tagline:** One Tiny Step. Zero Shame.  
> **Platform:** Responsive Web Application + Windows Electron Desktop App + FastAPI Backend

## User interface and error privacy

The ordinary Settings and Progress screens show user preferences and account activity. They do not display secret-isolation checks, environment-variable names, client/API URLs, service health, or backend version details. Web and Electron share these screens through the same renderer. Public client configuration is limited to the intentionally public `VITE_` variables; Gemini, JWT, and database credentials remain backend-only.

Unexpected API/server failures and validation payloads are normalized to brief user-facing messages by the shared API client. Safe, intentional application messages (including retryable plan-generation messages) remain available. Diagnostic exceptions and credentials are not copied into those messages. Health/version endpoints remain available for local/deployment monitoring and do not return credentials; they are not requested or rendered by the user-facing Progress page.

Verification for this audit is recorded in [progress.md](./progress.md), including the exact test results and known test-runner constraints.

Steplight AI is an empathetic, anti-overwhelm task sequencer designed specifically for individuals experiencing ADHD, executive dysfunction, burnout, and situational anxiety. Instead of pressuring users with punitive red badges, streak counters, and multi-hour to-do lists, Steplight AI delivers **one manageable next action** tailored to the user's immediate energy capacity (Low, Medium, or High).

## Personalized goals and adaptive planning

Authenticated users can create a goal with an outcome, deadline, experience level, working days, daily time limit, capacity, and constraints. The backend asks Gemini for goal-specific clarification questions, saves optional answers, retrieves relevant reviewed guidance from the existing RAG knowledge base, and asks Gemini for a structured, personalized roadmap. Roadmap items reuse the existing task records and therefore open in the existing task detail and Step Sequencer flows.

The new Goals and Today screens show roadmap progress, scheduled tasks, estimated effort, completed work, and overdue tasks. Goal tasks support milestone labels, priorities, dependencies, completion criteria, estimates, scheduled dates, and a deadline. Scheduling is deterministic on the backend: it checks working days, daily minutes, dependencies, and the goal deadline. A schedule preview must be confirmed before changed dates are persisted; accepted changes are retained in schedule revision history. An infeasible deadline is returned as such instead of silently extending the date or dropping tasks.

New authenticated API routes: `GET/POST /api/goals`, `GET/PATCH /api/goals/{goal_id}`, `PUT /api/goals/{goal_id}/answers`, `POST /api/goals/{goal_id}/questions`, `POST /api/goals/{goal_id}/roadmap`, `POST /api/goals/{goal_id}/schedule/preview`, and `POST /api/goals/{goal_id}/schedule/confirm`. Gemini credentials stay backend-only. Goal generation and schedule endpoints preserve the goal when generation/validation fails. The existing `BACKEND_PORT=18765` configuration remains unchanged.

Migration `f82a4b19c6d1` adds owner-scoped `goals` and `goal_schedule_revisions` tables and nullable goal/scheduling metadata columns and indexes on existing `tasks`. It preserves legacy task rows and has an Alembic downgrade. The database was at `d48e2b10a901` before migration and is now at `f82a4b19c6d1`.

Current scope note: the goal-aware conversational assistant and automatic availability-change detector are not yet implemented. Users can revise saved goal availability/deadline through the API and request a schedule preview; the current Goals UI provides the review/confirmation flow. Goal discovery/roadmap calls require a configured backend Gemini key, and live provider generation was not part of local verification.

---

## Task History and Resume

The shared History screen lists saved tasks with persisted status, completed and remaining step counts, progress, creation and latest activity dates, and related goal, milestone, scheduled date, and deadline when present. Search covers task titles, notes, and goal names; filters include All, In Progress, Pending, Completed, and Paused; sorting supports recent activity, upcoming deadlines, and status. The existing activity event log remains available below the task list.

Start/Resume reloads the task from the authenticated API, checks goal task prerequisites, selects the earliest saved pending step, and opens the existing Step Sequencer. Paused tasks are reactivated only after a resumable step is found. Tasks without an actionable saved plan open task detail with an explicit repair option; generation is never triggered by History itself. Completed tasks open their summary. The same Resume Task action is available on goal roadmap and Today planner cards. Focus Timer state remains stored by task and step ID; timer expiry still does not complete work. No additional tables or migrations were needed.

## Architecture & Monorepo Structure

```
Steplight/
├── .env                  # Single local development environment source
├── .env.example          # Template environment file
├── package.json          # Root npm workspaces configuration & scripts
├── progress.md           # Phase tracking, verification records, and verdicts
├── apps/
│   ├── web/              # Shared React 18 SPA (TypeScript, Vite, Tailwind CSS, React Router)
│   └── desktop/          # Hardened Electron shell and Windows NSIS packaging
├── backend/              # FastAPI Python backend (Auth, ORM, Alembic, Security)
│   ├── alembic/          # Database migrations (upgrade head / downgrade base)
│   ├── app/
│   │   ├── api/          # Routers: /auth, /tasks, /preferences, /activity, /health, /version
│   │   ├── core/         # Security, strategy retrieval, Gemini sequencing and safety guard
│   │   ├── models/       # SQLAlchemy 2.0 models, including step-generation metadata
│   │   ├── schemas/      # Pydantic v2 schemas
│   │   ├── config.py     # Root .env loader & fail-closed validator
│   │   ├── database.py   # SQLAlchemy engine & session factory
│   │   ├── seed.py       # Development & test fixtures
│   │   └── main.py       # FastAPI application, CORS, fail-closed startup check
│   ├── scripts/          # Backend-only Gemini model check and synthetic smoke command
│   ├── tests/            # Pytest suite for auth, tasks, retrieval, Gemini, and migrations
│   ├── knowledge_base/   # Reviewed versioned strategy source JSON
│   └── requirements-rag.txt # Pinned local embedding and FAISS dependencies
├── packages/
│   └── shared/           # Data contracts, capacity types, and typed ApiClient
└── docs/
    ├── ARCHITECTURE.md   # Architectural specifications, persistence schema, security
    ├── PHASE_01_REPORT.md# Phase 1 verification evidence, commands, and decisions
    ├── PHASE_02_REPORT.md# Phase 2 UI, navigation, themes, and test evidence
    ├── PHASE_03_REPORT.md# Phase 3 authentication, persistence, and isolation evidence
    ├── PHASE_04_REPORT.md# Phase 4 task lifecycle, capacity, and verification
    ├── PHASE_05_REPORT.md# Phase 5 local strategy retrieval and verification
    ├── PHASE_06_REPORT.md# Phase 6 Gemini sequencing and verification
    ├── PHASE_07_REPORT.md# Phase 7 adaptive feedback engine and verification
    ├── PHASE_08_REPORT.md# Phase 8 progress, history, explainability, privacy
    ├── PHASE_09_REPORT.md# Phase 9 cross-platform sync and offline behavior
    ├── PHASE_10_REPORT.md# Phase 10 Windows desktop integration and packaging
    ├── PHASE_11_REPORT.md# Phase 11 regression, accessibility, security, runtime checks
    ├── PHASE_12_REPORT.md# Phase 12 release and deployment readiness
    ├── FINAL_SYSTEM_VERIFICATION.md# Consolidated phase status and connection-chain evidence
    ├── MASTER_VERIFICATION_REPORT.md# Link to the canonical consolidated verification
    ├── TEST_MATRIX.md# Test scope, commands, and current results
    ├── SECURITY_AUDIT.md# Security and dependency audit evidence
    ├── ACCESSIBILITY_AUDIT.md# Keyboard, reduced motion, and accessibility evidence
    ├── DEPLOYMENT.md# Production deployment, backup, restore, and rollback guidance
    ├── DEPLOYMENT_GUIDE.md# Link to provider-neutral deployment guide
    ├── RELEASE_CHECKLIST.md# Distribution and release gates
    ├── USER_GUIDE.md# End-user task and feedback workflow
    ├── DEMO_SCRIPT.md# Evidence-bounded product demonstration
    └── KNOWN_ISSUES.md# Verified limitations and release blockers
```

## Verified Capabilities

- **Task Lifecycle & Capacity (Phase 4; partial verification)**:
  - Owner-scoped task create/read/update/delete at `/api/tasks`; statuses are `active`, `paused`, `completed`, and `archived`.
  - Low/Medium/High capacity, optional context, 255-character titles, and 2,000-character notes, with server-side validation.
  - Filtered and searchable task lists with page/page-size metadata; dashboard counts are live and user-scoped.
  - Status and step activity is persisted and displayed in the activity history.
  - One capacity-matched `LOCAL_RAG` strategy is returned by default; otherwise a deterministic `LOCAL_FALLBACK` is returned. Gemini is called only after per-account opt-in.
- **Local Strategy Retrieval (Phase 5)**:
  - 43 reviewed, non-diagnostic entries with capacity fit, sample action, caution, and source metadata.
  - CPU `sentence-transformers/all-MiniLM-L6-v2` embeddings pinned to an immutable revision and FAISS cosine-similarity index with stable IDs and a checksum/version manifest.
  - Task title and optional context are transient query input only; raw query text is never persisted to the shared strategy index or retrieval logs.
  - Explicit deterministic fallback if the index/model is unavailable or no result meets the relevance threshold.
- **Gemini Micro-Step Suggestions (Phase 6, backend implementation)**:
  - Settings has a default-off, account-scoped opt-in. Only opted-in requests send task title, optional context, capacity, and preferred duration to Google Gemini.
  - FastAPI uses the configured backend-only Flash model, strict JSON/Pydantic parsing, bounded retries/timeouts, token/cost metadata, and a local quality guard. Provider or quality failures return a labeled deterministic fallback.
  - Generation records retain source/model/strategy/guard/token/cost/request metadata, never prompt text or API credentials. The shared browser/Electron UI distinguishes Gemini, local-library, and fallback suggestions.
  - `gemini-2.5-flash` was retired for new users, so the local model setting was updated to `gemini-3.8-flash`. Model availability passed; synthetic `generateContent` calls then timed out at the configured 30-second request timeout. Live generation is not verified. See [Phase 6 report](./docs/PHASE_06_REPORT.md).
- **Adaptive Feedback Engine (Phase 7)**:
  - Authenticated `POST /api/tasks/{task_id}/feedback` supports `done`, `cant`, `rest`, `change`, and `dismiss`, with a required `Idempotency-Key`; replayed requests return the stored result and key reuse for a different request is rejected.
  - Done completes only the pending step and requests the next suggestion; Can't sets the rejected step aside and offers a different, locally generated 15-second action. Rest pauses the task while preserving its pending step; Change sets the current step aside for task/capacity edits; Dismiss leaves task and step state unchanged.
  - Step transitions use conditional database updates and unique per-user idempotency keys to prevent duplicate completion under concurrent submissions. Up to five recent Can't suggestions are used to avoid repeating recently rejected smaller actions.
  - Rest/resume state is persisted in the task and step records and is available from the paused-task list after reloading. The same React screen and typed client run in web and Electron; live runtime parity is not inferred from builds alone.
  - Feedback and error changes are announced through polite status or alert regions. A step-focused timer remains optional and never completes work automatically; no streak counter or completion-on-dismiss behavior is added. See [Phase 7 report](./docs/PHASE_07_REPORT.md).
- **Adaptive Focus Timer**:
  - The shared Step Sequencer loads the selected pending step from the saved task and initializes the optional timer from its `estimatedDuration` seconds; missing or invalid estimates use an editable capacity-based safe default.
  - Users can adjust the duration before starting, pause/resume, reset to the step estimate, extend by two minutes, mark the step complete explicitly, or take a rest. Expiration never changes step/task completion by itself.
  - A wall-clock deadline drives the countdown, so background throttling does not add time. Per-task/per-step timer state is stored in browser local storage and restored from its deadline after refresh; web and Electron use the same renderer and behavior. No database table or timer data is added to account records.
- **Progress, History, Explainability & Privacy (Phase 8)**:
  - Progress summaries and activity timeline are derived from persisted, owner-scoped events; activity can be filtered by steps, pauses, or tasks and paginated. Summaries count stored completion, pause, resume, and task-creation events, not streaks or scores.
  - Accepted suggestions retain their source and generation reference, and activity records include available source/strategy attribution. “Why This Step?” explains recorded rationale without claiming a clinical or complete model explanation.
  - Gemini remains default-off. If opted in and local retrieval returns candidates, the backend may send the task title, notes/context, capacity, preferred duration, and up to five retrieved strategy candidates to Google. Email, password, tokens, and database credentials are not included. See the What the AI Sees screen for exact fields and conditions.
  - Authenticated `GET /api/privacy/export` returns an account-scoped JSON export of profile, preferences, tasks/steps, activity, feedback, and safe generation metadata; it excludes password hashes and token material. `DELETE /api/auth/me` requires password confirmation and removes associated database records.
  - Account data is retained while the account exists; there is no automatic age-based purge. Password reset tokens expire after 15 minutes and refresh sessions after 7 days. Provider-side and deployment-backup retention are outside the app's control. See [Phase 8 report](./docs/PHASE_08_REPORT.md).
- **Windows Desktop Integration & Packaging (Phase 10)**:
  - Electron uses context isolation, disabled Node integration, sandboxing, web security, a production CSP, same-app navigation restrictions, HTTPS-only external links, and a narrow preload bridge. Electron is pinned to `45.0.0`.
  - The shared Settings screen exposes Windows native step-completion notifications only in the desktop renderer. They are off by default, require explicit opt-in, appear only when a step is marked done while the app is not focused, and omit task/personal details. Windows notification settings can still suppress delivery.
  - A native View menu and `Ctrl+Shift+C` toggle compact sizing. Window geometry, compact mode, maximize state, and notification opt-in persist locally; logout clears renderer auth state. NSIS per-user uninstall removes the application's local data directory.
  - `npm run package:win` produces an x64 NSIS installer under `apps\desktop\release`. Auto-update is not configured. Unsigned builds use Electron's default icon; a real deployed API URL and signed release certificate are required before distribution. See [Phase 10 report](./docs/PHASE_10_REPORT.md).
- **Phases 11–12 quality/release status**:
  - The current regression suite, TypeScript checks, production build, local browser/backend smoke checks, and x64 NSIS package build pass. The installer was exercised in an isolated temporary install/user-data location and then uninstalled.
  - No production deployment or hosted PostgreSQL verification occurred. Live Gemini generation, a physical cross-device scenario, deterministic offline reload, full WCAG audit, signed distribution, and OS notification delivery remain unverified. The overall project verdict is **PARTIAL**, not production-ready.
  - See [Phase 11](./docs/PHASE_11_REPORT.md), [Phase 12](./docs/PHASE_12_REPORT.md), [the final verification report](./docs/FINAL_SYSTEM_VERIFICATION.md), [the test matrix](./docs/TEST_MATRIX.md), [security audit](./docs/SECURITY_AUDIT.md), [accessibility audit](./docs/ACCESSIBILITY_AUDIT.md), [deployment guide](./docs/DEPLOYMENT.md), [release checklist](./docs/RELEASE_CHECKLIST.md), [user guide](./docs/USER_GUIDE.md), [demo script](./docs/DEMO_SCRIPT.md), and [known issues](./docs/KNOWN_ISSUES.md).
- **Cross-Platform Sync & Offline Behavior (Phase 9)**:
  - Web and Electron use the same shared React API client and an explicit production `VITE_API_BASE_URL`; production builds reject missing, HTTP, or localhost API URLs.
  - Production backend startup requires PostgreSQL; `DATABASE_URL` supports hosted `postgres://` and `postgresql://` URLs through psycopg 3. SQLite remains available for local development and tests. Alembic migrations are a deployment release step, not an automatic per-replica startup action.
  - Task and step records carry integer versions. Task/step edits send `If-Match`; concurrent stale edits return HTTP 409 and the task edit screen offers a reload-latest action instead of silently overwriting newer data.
  - Access tokens are refreshed once after an expired-token 401; transient GET failures receive one bounded retry. Writes are never automatically retried or queued offline. Feedback remains idempotent through its request key.
  - The production web service worker is designed to cache only the static app shell/assets, never API responses. The offline page stores at most 50 per-account task IDs/status/version/update timestamps in renderer localStorage; titles, notes, step text, and credentials are excluded from that status index. Writes need a connection and must be refreshed after reconnect. Offline app-shell reload was inconclusive in the browser harness; a production deployment or separate-device run is not claimed. See [Phase 9 report](./docs/PHASE_09_REPORT.md).
- **PostgreSQL-Ready Persistence & Alembic Migrations**:
  - SQLAlchemy 2.0 models with versioned Alembic migrations; local development/test can use SQLite, while production configuration fails closed unless the backend uses PostgreSQL.
  - Models: `User`, `SessionModel` (refresh tokens), `PasswordResetToken`, `Task`, `Step`, `UserPreference`, `ActivityEvent`, `Feedback`, `StepGeneration`, and `StepFeedbackEvent`.
- **Argon2id Password Security & Bounded JWT**:
  - Argon2id password hashing (RFC 9106 profile).
  - Short-lived signed JWT access tokens (30 minutes) + high-entropy SHA-256 hashed refresh tokens (7 days).
  - Fail-closed security: outside development mode, server strictly refuses to start if `JWT_SECRET_KEY` is missing or insecure.
- **Single-Use Password Reset & Dev Email Sink**:
  - High-entropy single-use password reset tokens with 15-minute expiration.
  - Development email sink logs tokens to `backend/dev_email_sink.log` and console; never claims external emails were sent without an active provider.
  - Used tokens are immediately invalidated and cannot be replayed.
- **Strict Per-User Authorization Isolation**:
  - Every database query and mutation enforces user ownership.
  - Multi-tenant isolation verified: User B receives 404 Not Found when attempting to read or mutate User A's tasks, steps, preferences, or profile.
- **Sliding-Window Rate Limiting & Generic Auth Errors**:
  - Sliding-window rate limiting on authentication routes returning gentle 429 responses.
  - Generic authentication errors ("Invalid email or password") prevent user enumeration attacks.
- **Full React & Electron Frontend Authentication**:
  - Integrated `AuthContext` with automatic token refresh, silent re-authentication, and session storage.
  - Live login (`/login`), registration (`/signup`), password reset flow (`/forgot-password` & `/reset-password`), and profile management (`/profile`).
  - Pre-seeded instant demo login: `demo@steplight.ai` / `gentlestep123`.
- **Zero Secret Exposure**:
  - Verified bundle audit: zero backend secrets in compiled client artifacts.

---

## Prerequisites

- **Node.js**: v20+ (tested on v24.14.0)
- **npm**: v10+ (tested on v11.9.0)
- **Python**: 3.10+ (tested on Python 3.14.0) with:
  - `fastapi`, `uvicorn`, `sqlalchemy>=2.0.0`, `alembic>=1.13.0`, `psycopg[binary]>=3.1.18`, `argon2-cffi>=23.1.0`, `pyjwt>=2.8.0`, `httpx`, `pytest`, `python-dotenv`

---

## Getting Started

### 1. Install Node Dependencies
```powershell
npm install
```

### 2. Configure Environment
A root `.env` file controls local development. A sanitized `.env.example` is provided:
```powershell
Copy-Item .env.example .env
```
Key development settings in `.env`:
- `DATABASE_URL=sqlite:///./steplight.db`
- `JWT_SECRET_KEY`: use the local development value from your root `.env`; never place it in browser or Electron renderer configuration.
- `ACCESS_TOKEN_EXPIRE_MINUTES=30`
- `BACKEND_PORT=18765`
- `FRONTEND_PORT=5173`
- `VITE_API_BASE_URL=http://127.0.0.1:18765/api`
- `GEMINI_API_KEY`: backend-only key required for AI plans. Creating/retrying an AI plan explicitly sends the goal and notes to Google; the form explains this before submission. Never copy this value into any `VITE_*` variable.
- `GEMINI_MODEL=gemini-3.5-flash-lite`, `GEMINI_TIMEOUT_SECONDS=60`, `GEMINI_MAX_RETRIES=1`: backend model and request bounds.
- `DATABASE_URL` is backend-only: keep SQLite for local development; production uses a managed PostgreSQL connection string configured in the host's secret store.
- `VITE_API_BASE_URL` is public client configuration, not a credential. Local development uses `http://127.0.0.1:18765/api`; production web and Electron builds must set the same deployed HTTPS API URL before the Vite build.
- `GEMINI_INPUT_COST_PER_MILLION` / `GEMINI_OUTPUT_COST_PER_MILLION` (optional): set both to enable estimated USD cost reporting; unset values disable estimates.

### 3. Build the local strategy index (supporting Gemini context)

AI plan generation can run without an index; available matches guide Gemini, and raw matches are never presented as AI plans. To enable local retrieval, install the pinned RAG stack and build the corpus-only FAISS index from the repository root:

```powershell
py -3.14 -m venv .venv
& .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
& .\.venv\Scripts\python.exe -m pip install -r backend\requirements-rag.txt
& .\.venv\Scripts\python.exe -m backend.app.core.strategy_index
```

The build downloads the pinned model revision from Hugging Face on first use (model weights are about 86.6 MiB; local cache footprint may be larger). It writes `backend\data\strategy-index-v1\strategies.faiss` and `manifest.json`. Re-run the final command after changing the corpus. Generated index artifacts are ignored by Git; the reviewed source JSON is tracked. The root `.env` may override `STRATEGY_KB_PATH`, `STRATEGY_INDEX_DIR`, `STRATEGY_RETRIEVAL_TOP_K` (default `3`), and `STRATEGY_MIN_RELEVANCE_SCORE` (default `0.28`). These settings are backend-only and are not exposed by Vite.

### 4. Check Gemini Configuration

With a backend API key configured, these commands check model visibility and make one synthetic request (not a real task):

```powershell
& .\.venv\Scripts\python.exe -m backend.scripts.validate_gemini_model
& .\.venv\Scripts\python.exe -m backend.scripts.smoke_task_plans --matrix --adaptive
```

The live smoke command requires the backend to be running, creates a separate verification account and synthetic tasks, and makes billable Gemini requests. It tests four goals at all three capacities plus adaptive actions and persistence. It saves credential-free results to `docs/verification/gemini-plan-smoke.json`. A model visibility check alone does not prove content generation works.

### 5. Run Database Migrations & Seed
```powershell
# Run Alembic migrations to latest schema
& .\.venv\Scripts\python.exe -m alembic -c backend\alembic.ini upgrade head

# Seed demo user (demo@steplight.ai / gentlestep123) and sample tasks
& .\.venv\Scripts\python.exe -m backend.app.seed
```

---

## Running Applications Locally

### Run Web Client (Dev Mode)
```powershell
npm run dev:web
# Serves at http://localhost:5173
```

### Run FastAPI Backend (Dev Mode)
```powershell
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 18765
# Serves at http://127.0.0.1:18765 (API prefix: /api)
# Interactive Docs available at http://127.0.0.1:18765/docs
```

### Task API

All task routes require a valid bearer access token and scope every read/write to its owner:

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/tasks?status=active&capacity=low&search=...&page=1&page_size=20` | Filter/search and paginate tasks |
| `GET` | `/api/tasks/counts` | Dashboard counts |
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks/{task_id}` | Read task and its steps |
| `PATCH` | `/api/tasks/{task_id}` | Edit fields or transition status |
| `DELETE` | `/api/tasks/{task_id}` | Delete after UI confirmation |
| `POST` | `/api/tasks/{task_id}/plan` | Generate/review or adapt a saved Gemini plan; requires `If-Match` and `{"consent":true}`; optional title, notes, capacity |
| `GET` | `/api/tasks/{task_id}/suggest-step` | For saved AI plans: next pending step or 409 when exhausted; legacy non-plan suggestions retain explicit local attribution |
| `POST` | `/api/tasks/{task_id}/feedback` | Idempotent Done/Can't/Try Another/Rest/Change/Dismiss step transition (`Idempotency-Key` header required) |
| `GET` / `PUT` | `/api/preferences` | Read/update account preferences, including default-off Gemini opt-in |
| `GET` | `/api/activity?page=1&page_size=20&category=all` | Filter and paginate the authenticated user's activity (`steps`, `pauses`, or `tasks` categories) |
| `GET` | `/api/activity/summary` | Owner-scoped counts from stored activity events |
| `GET` | `/api/privacy/export` | Download/export profile, preferences, tasks/steps, activity, feedback, and safe generation metadata |
| `DELETE` | `/api/auth/me` | Permanently delete the current account and associated records; requires `{"password":"..."}` |
| `POST` | `/api/activity/feedback` | Submit owner-validated rating/comment feedback for an owned task/step |

The canonical active status is `active`; `in_progress` is accepted as a backward-compatible API input/filter and normalized to `active`. Invalid status/capacity, title and context length, page, and page-size values are rejected with validation errors.

The current create flow saves the original goal, then requests `/plan` with per-task consent. Gemini receives that goal, the saved notes and selected capacity, and authors the title, description, ordered instructions, time estimates, effort, reasons and research suggestions. Curated RAG matches are optional context; successful output is labeled **AI Generated** or **AI + Strategy Guidance**. Structured output constrains effort and duration to the selected capacity; low-capacity steps are one action each, estimated at one minute, and rejected if instructions combine actions. The response parser accepts plain JSON, Markdown fences or surrounding prose, then Pydantic and plan-quality checks validate required fields, order, duplicates, relevance and history. Invalid output gets one repair attempt; configured network retries are separately bounded. Provider/validation failures return **503** with a retry message and retain all saved work. They never substitute local steps in the AI-plan flow. Semantic completeness still needs human review; lexical validation cannot prove every plan is correct.

The low-capacity constraints address a reproduced provider response that returned a valid JSON plan but used 15–25 minute durations and medium effort for a low-capacity request. If both the original and one repair attempt fail validation, the saved task remains unchanged and the UI keeps the retry action available. Safe backend diagnostics report only the generation stage and validation reason code; they omit task content, generated text and credentials.

Plan requests use `GEMINI_API_KEY` and `GEMINI_MODEL` solely on the backend, with direct HTTP connections (`trust_env=False`) to avoid inherited editor proxy settings. Gemini 3/4 plan requests use LOW thinking and omit temperature. On 2026-10-25, inherited-proxy content requests timed out and direct `gemini-3.8-flash` returned 503; the configured responsive model was changed to `gemini-3.5-flash-lite`. Operators whose networks require an outbound proxy must configure the backend transport deliberately. See Google's [structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output) and [thinking](https://ai.google.dev/gemini-api/docs/thinking) documentation.

`/feedback` accepts `done`, `cant`, `another`, `rest`, `change` and `dismiss` with a stable `Idempotency-Key`. Done records completion; the task stays active. For AI plans, Can't asks Gemini for smaller actions and Try Another asks for a different action; both retain rejected steps as skipped history. Rest preserves progress; Dismiss closes without completing anything; Change opens editing, then regenerates only remaining work. Editing an AI plan explains that it sends changes to Gemini. Completed records and timestamps are preserved. The current progress denominator excludes superseded/skipped steps. When pending steps are exhausted, the next-step button disappears and the user can explicitly mark the overall task complete. Legacy non-plan clients retain their existing explicitly labeled local suggestion behavior.

Migration `d48e2b10a901` adds original input/current planning goal, generated description/model/guidance to tasks and instruction/effort/research suggestions to steps. It backfills original goals without deleting any accounts, tasks or steps. Generated plans and completion records live in the database; web and Electron use the same shared client. Task plan review survives refresh and login, and sequencer task query parameters allow reloading the first incomplete step. Native desktop reopen and browser click-through tests remain subject to the UI verification limitations in `progress.md`.

Task and step read/create responses include an integer `version` starting at `1`. `PATCH /api/tasks/{task_id}` and `PATCH /api/tasks/{task_id}/steps/{step_id}` accept `If-Match: <version>`; a stale version returns 409 and asks the client to reload. Omitting `If-Match` remains compatible with older clients, but the current shared client always sends the version it read.

Activity requests without pagination/filter parameters retain the legacy recent-event list response. The web history view uses paginated requests. Both summary and timeline data are scoped by the authenticated user. The export intentionally omits password hashes, reset tokens, access/refresh tokens, token hashes, idempotency keys, and request fingerprints.

### Production deployment and sync configuration

The repository provides a provider-neutral `Dockerfile`; no cloud account or database is provisioned by this project. Create a managed PostgreSQL database and deploy the backend container with these server-side environment settings in the hosting provider's secret/configuration store:

- `APP_ENV=production`, `DEBUG=false`
- `DATABASE_URL=<managed PostgreSQL connection URL>` (never a `VITE_` variable)
- `JWT_SECRET_KEY=<random secret of at least 32 characters>`
- `CORS_ORIGINS=<comma-separated deployed web origins>`

Run migrations once as the deployment's release/pre-deploy command, before starting API replicas:

```powershell
python -m alembic -c backend\alembic.ini upgrade head
```

Build both renderer targets with the same public API URL; Electron packages the shared web renderer and does not use a separate backend URL:

```powershell
$env:VITE_API_BASE_URL = "https://api.example.com/api"
npm run build:web
npm run build:desktop
```

`VITE_API_BASE_URL` is safe to embed in the renderer; do not put database URLs, JWT secrets, or Gemini keys in any `VITE_*` variable. Backend production refuses SQLite, and the client refuses a missing, non-HTTPS, or localhost API URL in production mode. The hosted database, TLS termination, secret rotation, backup policy, and deployment are operator responsibilities; automated integration tests use temporary SQLite and do not certify a live PostgreSQL service.

When offline, a previously loaded screen may remain in memory and a separate small task status index is available at `/offline`. It contains no task text or step content. Writes fail visibly and are not placed in a queue. On reconnect, reload before editing. If another client has saved a newer record, the server rejects a stale version with HTTP 409; there is no automatic field merge.

### Run Electron Desktop App (Dev Mode)
```powershell
# Terminal 1:
npm run dev:web

# Terminal 2:
npm run dev:desktop
```

### Package Windows Desktop Installer

Use a deployed HTTPS FastAPI URL for the release build. The API URL is public renderer configuration; never place database credentials, `JWT_SECRET_KEY`, or `GEMINI_API_KEY` in `VITE_*` variables.

```powershell
$env:VITE_API_BASE_URL = "https://api.example.com/api"
npm run package:win
```

The x64 per-user NSIS installer is written to `apps\desktop\release\Steplight AI-Setup-1.0.0.exe`. The installer is unsigned unless a release signing certificate is configured. This repository does not configure an update feed or auto-update client. A local package smoke test with a placeholder API URL is not a release build.

---

## Testing & Verification

Execute the comprehensive monorepo test suite:
```powershell
# Run all tests across shared, web, and backend
$env:PATH = "$PWD\.venv\Scripts;$env:PATH"
npm test

# Run individual test suites
npm run test:backend   # backend pytest suite, including privacy export, ownership, and deletion cascades
npm run test:web       # web vitest suite, including five feedback actions, announcements, and router parity
npm run test:shared    # shared vitest suite, including feedback API contract and idempotency header

# TypeScript verification across all workspaces
npm run typecheck

# Production build verification
$env:VITE_API_BASE_URL = "https://api.example.com/api"
npm run build
```

Production builds validate that `VITE_API_BASE_URL` is configured with HTTPS and is not localhost. Set an actual deployed API URL rather than the placeholder used by local packaging smoke tests.

Phase 9 focused verification:

```powershell
$env:PATH = "$PWD\.venv\Scripts;$env:PATH"
python -m pytest backend\tests\test_phase9_sync.py backend\tests\test_tasks.py backend\tests\test_migrations.py backend\tests\test_fail_closed.py -q
npm run test:shared
npm run test:web
```

Focused Phase 5 checks:

```powershell
& .\.venv\Scripts\python.exe -m pytest backend\tests\test_strategy_retrieval.py backend\tests\test_tasks.py -q
& .\.venv\Scripts\python.exe -m backend.app.core.strategy_index
```

Focused Phase 6 checks:

```powershell
& .\.venv\Scripts\python.exe -m pytest backend\tests\test_gemini_sequencer.py backend\tests\test_migrations.py backend\tests\test_tasks.py -q
& .\.venv\Scripts\python.exe -m backend.scripts.validate_gemini_model
& .\.venv\Scripts\python.exe -m backend.scripts.smoke_gemini
```

---

## Troubleshooting

### Windows backend bind errors (10013 / 10048)

Local API default is `127.0.0.1:18765`. From the project root, start with `python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 18765` (or `npm run dev:backend`). Match `BACKEND_PORT`, `BACKEND_URL`, `API_BASE_URL` and `VITE_API_BASE_URL` when changing ports. Restart the renderer after changes. Electron shares the React API URL, with no separate API port; rebuild its web fallback when needed. Its launcher clears inherited `ELECTRON_RUN_AS_NODE` so editor-host environments launch the app normally.

Inspect listeners with `netstat -ano` and exclusions with `netsh interface ipv4 show excludedportrange protocol=tcp` and the equivalent `ipv6` command. On 2026-10-25, 8010 was occupied by the previous Steplight process (exclusive bind returned 10048); it was not excluded. The reported 10013 was not reproduced. Port 18765 was outside both exclusion lists and passed an exclusive bind/listen check. No Windows exclusions, firewall settings or other projects were changed. The old verified Steplight process was stopped after the new backend started.


### Signup / login displays "Not Found" (HTTP 404)

On 2026-10-25, `POST http://127.0.0.1:8000/api/auth/register` returned `404 {"detail":"Not Found"}`. Port 8000 belonged to "Real-Time Traffic & Transit Platform API", whose OpenAPI schema has no auth endpoints. Steplight's routes were correctly mounted at `/api/auth/*`; its database was already at migration `c39f16a02bd7`.

Local Steplight now uses port **18765** in client/backend defaults, `.env.example` and the settings used by `npm run dev:backend`. Existing checkouts must update root `.env` to `BACKEND_PORT=18765` and `VITE_API_BASE_URL=http://127.0.0.1:18765/api`, then restart Vite/Electron. Start the backend using the project-root command shown above. Development CSP permits the configured API origin. Existing records and UI styling are preserved.

Check `http://127.0.0.1:18765/` identifies **Steplight AI** and `/openapi.json` contains `/api/auth/register`. A health 200 alone is insufficient: the other project also serves `/api/health`. Keep the `/api` suffix in `VITE_API_BASE_URL`; do not add `/auth` to the base URL. The startup command reads `BACKEND_HOST` and `BACKEND_PORT` from root `.env`; custom ports also require a matching `VITE_API_BASE_URL`.

Task list/detail/edit and profile routes use the existing `ProtectedRoute` to wait for saved-session verification. The public guest dashboard remains available. See the latest `progress.md` auth entry for actual test results and native UI limitations.


### Login / Signup returning HTTP 500

**Symptom:** `POST /api/auth/register` returns `500 Internal Server Error`.  
**Cause:** Database schema is behind the latest Alembic migrations (specifically migration `c4a91e7d2b60` which adds `gemini_personalization_enabled` to `user_preferences`).  
**Fix:**
```powershell
# From repository root — run pending migrations then re-seed
& .\.venv\Scripts\python.exe -m alembic -c backend\alembic.ini upgrade head
```

> **Historical schema issue:** This explains HTTP 500 only. The HTTP 404 incident above was a different service listening on the API port. Run migrations when pending; seeding is optional and is not an auth routing fix.

### Demo account not found (login returns 401)

If `demo@steplight.ai / gentlestep123` returns 401, run the seed script:
```powershell
& .\.venv\Scripts\python.exe -m backend.app.seed
```
