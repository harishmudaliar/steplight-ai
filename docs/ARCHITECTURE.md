# Steplight AI — System Architecture Document
**Team:** OLYMPUS  
**Tagline:** "One Tiny Step. Zero Shame."  
**Core Mission:** Compassionate, anti-overwhelm task initiation designed for ADHD, anxiety, burnout, and executive dysfunction.

---

## 1. Architectural Overview

### Goal planning extension (2026-10-27)

The goal feature is implemented in `backend/app/api/goals.py`, `backend/app/core/goal_scheduler.py`, and the `Goal` / `GoalScheduleRevision` models. A goal owns its roadmap through nullable `tasks.goal_id`; each roadmap item remains a regular task so the existing task lifecycle, saved steps, and Focus Timer continue to use the same records. Task schedule metadata is nullable so legacy tasks remain valid and untouched.

`POST /api/goals/{id}/questions` and `POST /api/goals/{id}/roadmap` call backend Gemini with structured response schemas. The roadmap prompt includes saved goal details/answers plus up to three relevant records from the existing reviewed strategy retrieval index. AI content is validated before insertion, including durations, priority, completion criteria, and earlier-task-only dependency indexes. The backend then assigns stable task UUIDs and translates dependency indexes into task IDs.

`goal_scheduler.propose_schedule` is deterministic and independent of Gemini. It places remaining work on configured weekdays under the daily minute limit, respects prerequisite ordering, leaves completed/blocked/archived tasks untouched, and reports infeasibility. Preview and confirmation are separate endpoints; confirmation recomputes the proposal before saving. Accepted changes are recorded in `goal_schedule_revisions`. Migrations add fields and tables without dropping task data.

The shared renderer exposes `/goals`, `/goals/:id`, and `/planner` in both BrowserRouter and Electron HashRouter. The goal-aware conversational assistant and automatic availability-change detector remain future work; schedule revisions are user-initiated through the current review flow.

Steplight AI is architected as a production-grade monorepo containing:
- **`apps/web`**: Single shared responsive React SPA (React 18/19, TypeScript, Vite, React Router, Tailwind CSS).
- **`apps/desktop`**: Windows Electron desktop wrapper with context isolation, secure preload bridge, and responsive window scaling.
- **`backend`**: FastAPI application managing task data, local capacity-filtered strategy retrieval, consent-gated Gemini sequencing, deterministic fallback, activity, and secure authentication.
- **`packages/shared`**: Shared TypeScript types, data contracts, and typed API client (`ApiClient`).
- **`docs/`**: Architecture diagrams, phase reports, and design documentation.

```
+-------------------------------------------------------------------------+
|                              USER DEVICES                                |
|   +---------------------------------+  +----------------------------+   |
|   |         Web Browser             |  |      Windows Desktop       |   |
|   |   (Chrome / Edge / Firefox)     |  |       (Electron App)       |   |
|   +---------------------------------+  +----------------------------+   |
|                   \                                  /                   |
|                    \                                /                    |
|                     v                              v                     |
|           +--------------------------------------------------+          |
|           |             Shared React 18 Application          |          |
|           |     Tailwind CSS / Stitch Material 3 Tokens      |          |
|           |     React Router (Browser & Hash Router support) |          |
|           |     Light / Dark Theme Support (ThemeContext)    |          |
|           |     Keyboard Accessible Navigation (Alt+D/T/S/P) |          |
|           +--------------------------------------------------+          |
+-----------------------------------|-------------------------------------+
                                    |
                    REST JSON APIs  | (CORS Whitelisted)
                                    v
+-------------------------------------------------------------------------+
|                         FASTAPI BACKEND SERVICE                         |
|   - Explicit Root .env Configuration (Settings)                         |
|   - GET /api/health & GET /api/version                                  |
|   - Security Layer (Argon2id, HS256 JWT, Secrets Shield)                |
|   - Owner-scoped task lifecycle, activity, local RAG, and Gemini guard    |
|   - Gemini key and provider requests remain backend-only                  |
+-----------------------------------|-------------------------------------+
                                    |
                    SQLAlchemy      | Local SQLite (dev) / PostgreSQL (prod)
                                    v
+-------------------------------------------------------------------------+
|                             DATA STORAGE                                 |
|   - Task & Micro-Step Entities                                          |
|   - Non-Punitive Progress & Pauses                                      |
|   - Task, step, and activity records                                    |
+-------------------------------------------------------------------------+
```

---

## 2. Complete Application Route Inventory (Phase 2 Verified)

| Category | Route | Component | Purpose |
|----------|-------|-----------|---------|
| **Core Workflow** | `/` | `DashboardPage` | Main dashboard, greeting, capacity selector, resume/rest |
| **Core Workflow** | `/tasks` | `CreateTaskPage` | Single-task focus formulation with capacity cards |
| **Core Workflow** | `/step-sequencer` | `StepSequencerPage` | Atomic motion, why this step accordion, done action |
| **Core Workflow** | `/adaptive-step` | `AdaptiveStepPage` | Recursive step shrinking to 15s nano-actions |
| **Task Management**| `/tasks/all` | `TaskListPage` | Live, filterable task sanctuary |
| **Task Management**| `/tasks/:id` | `TaskDetailPage` | Task breadcrumbs, notes, and step outline |
| **Task Management**| `/tasks/:id/edit` | `TaskEditPage` | Edit wording, change capacity, or archive |
| **Public Marketing**| `/welcome` | `LandingPage` | Public homepage with gentle value propositions |
| **Public Marketing**| `/features` | `FeaturesPage` | Deep dive into capabilities & Smart Focus disclaimer |
| **Public Marketing**| `/how-it-works` | `HowItWorksPage` | 3-step walkthrough of compassionate pacing |
| **Public Marketing**| `/about` | `AboutPage` | Team OLYMPUS manifesto & neurodivergent empathy |
| **Public Marketing**| `/faq` | `FaqPage` | Interactive FAQ on streaks, capacity, and privacy |
| **Legal & Trust** | `/privacy` | `PrivacyPage` | Zero ad tracking and ephemeral AI data handling |
| **Legal & Trust** | `/terms` | `TermsPage` | Terms of care & non-diagnostic disclaimer |
| **Authentication** | `/login` | `LoginPage` | Mock authentication entry with guest demo mode |
| **Authentication** | `/signup` | `SignupPage` | Gentle registration with baseline energy preference |
| **Authentication** | `/forgot-password`| `ForgotPasswordPage`| Password reset form with local dev sink notice |
| **Authentication** | `/reset-password` | `ResetPasswordPage` | Single-use password update view |
| **Authentication** | `/confirmation` | `ConfirmationPage` | Account confirmation card with onboarding entry |
| **Onboarding** | `/onboarding` | `OnboardingPage` | 4-step wizard: energy baseline, tasks, duration, review |
| **Execution/Rest** | `/completed` | `CompletionPage` | Micro-celebration with full permission to stop |
| **Execution/Rest** | `/rest` | `RestResumePage` | Pacing mode with 8-second calm breathing bubble |
| **Transparency** | `/progress` | `ProgressPage` | Persisted owner-scoped event counts and backend health |
| **Transparency** | `/history` | `TaskHistoryPage` | Filtered, paginated activity events and stored source attribution |
| **Transparency** | `/explainability` | `ExplainabilityPage` | Actual retrieval, fallback, and rationale behavior |
| **Transparency** | `/ai-transparency`| `AiTransparencyPage`| Exact conditional Gemini prompt fields and data-flow limitations |
| **System/User** | `/profile` | `ProfilePage` | Display name, energy tendency, mock signout |
| **System/User** | `/settings` | `SettingsPage` | Light/Dark theme, secret isolation audit, data export |
| **System/User** | `/help` | `HelpPage` | 24/7 crisis lifelines, keyboard shortcuts, feedback |
| **System/User** | `/notifications`| `NotificationsPage`| Gentle reminder center with zero guilt alerts |
| **System/User** | `/offline` | `OfflinePage` | Connection check and privacy-limited cached task status index |
| **Error Handling** | `*` | `NotFoundPage` | Compassionate 404 page ("Zero shame, let's head home") |

---

## 3. Data Architecture & Database Persistence (Phase 3 Verified)

Steplight AI uses SQLAlchemy 2.0 declarative models and Alembic migrations. SQLite (`DATABASE_URL=sqlite:///./steplight.db`) remains available for local development and tests. Production startup fails closed unless `DATABASE_URL` is PostgreSQL; `postgres://` and `postgresql://` host URLs are normalized to the installed psycopg 3 driver. The provider-neutral `Dockerfile` does not include credentials or automatically run migrations; deployment runs Alembic once as a release/pre-deploy step before API replicas start.

```
+---------------------------------------------------------------------------------+
|                                 DATABASE SCHEMA                                 |
+---------------------------------------------------------------------------------+
|                                                                                 |
|   +-----------------------+              +----------------------------------+   |
|   |         users         |<----+        |             sessions             |   |
|   |-----------------------|     |        |----------------------------------|   |
|   | id (UUID String PK)   |     |        | id (UUID String PK)              |   |
|   | email (Unique Index)  |     +--------| user_id (FK -> users.id CASCADE) |   |
|   | hashed_password       |     |        | token_hash (SHA-256 Unique Index)|   |
|   | display_name          |     |        | expires_at (DateTime)            |   |
|   | baseline_capacity     |     |        | revoked_at (DateTime, Nullable)  |   |
|   | is_active (Boolean)   |     |        | user_agent, ip_address           |   |
|   | created_at, updated_at|     |        +----------------------------------+   |
|   +-----------------------+     |                                               |
|               |                 |        +----------------------------------+   |
|               |                 |        |      password_reset_tokens       |   |
|               |                 |        |----------------------------------|   |
|               |                 +--------| id (UUID String PK)              |   |
|               |                 |        | user_id (FK -> users.id CASCADE) |   |
|               |                 |        | token_hash (SHA-256 Unique Index)|   |
|               |                 |        | expires_at (DateTime)            |   |
|               |                 |        | used_at (Single-use Nullable)    |   |
|               |                 |        +----------------------------------+   |
|               |                 |                                               |
|               |                 |        +----------------------------------+   |
|               |                 +--------|         user_preferences         |   |
|               |                 |        |----------------------------------|   |
|               |                 |        | user_id (Unique FK CASCADE)      |   |
|               |                 |        | theme, duration, sound, consent  |   |
|               |                 |        +----------------------------------+   |
|               |                 |                                               |
|               |                 |        +----------------------------------+   |
|               |                 +--------|         activity_events          |   |
|               v                          |----------------------------------|   |
|   +-----------------------+              | id (PK), user_id (FK), event_type|   |
|   |         tasks         |              +----------------------------------+   |
|   |-----------------------|                                                     |
|   | id (UUID String PK)   |              +----------------------------------+   |
|   | user_id (FK -> users) |<-------------|             feedback             |   |
|   | title, notes          |              |----------------------------------|   |
|   | capacity, status      |              | id (PK), user_id, task_id, rating|   |
|   | version (optimistic)  |              +----------------------------------+   |
|   | created_at, updated_at|                                                     |
|   +-----------------------+                                                     |
|               | 1                                                               |
|               |                                                                 |
|               v *                                                               |
|   +-----------------------+                                                     |
|   |         steps         |                                                     |
|   |-----------------------|                                                     |
|   | id (UUID String PK)   |                                                     |
|   | task_id (FK -> tasks) |                                                     |
|   | order, title, reason  |                                                     |
|   | estimated_duration    |                                                     |
|   | strategy, status      |                                                     |
|   | version (optimistic)  |                                                     |
|   | completed_at          |                                                     |
|   +-----------------------+                                                     |
|               | 1                                                               |
|               |                                                                 |
|               v *                                                               |
|   +-----------------------+                                                     |
|   |   step_generations    |                                                     |
|   |-----------------------|                                                     |
|   | source, model         |                                                     |
|   | strategy_id, guard    |                                                     |
|   | token/cost metadata   |                                                     |
|   | no prompt or key      |                                                     |
|   +-----------------------+                                                     |
+---------------------------------------------------------------------------------+
```

### Table Definitions & Foreign Key Strategy
1. **`users`**: Root tenant identity with Argon2id-hashed credentials, baseline energy capacity, and account state.
2. **`sessions`**: Server-tracked refresh token sessions. Stores cryptographic SHA-256 hashes of opaque refresh tokens, allowing instant device revocation (`revoked_at`).
3. **`password_reset_tokens`**: Epiring single-use reset tokens with strict invalidation (`used_at IS NULL` and `expires_at > now`).
4. **`tasks`**: User-scoped tasks with canonical status (`active`, `paused`, `completed`, `archived`), capacity (`low`, `medium`, `high`), and an integer optimistic version. Titles are limited to 255 characters; optional context is limited to 2,000 characters. The Phase 4 migration converts persisted `in_progress` values to `active`.
5. **`steps`**: Atomic micro-steps bound to parent tasks with cascading delete, sequencing order, behavioral strategy tags, and their own integer optimistic version.
6. **`user_preferences`**: 1-to-1 user settings (theme, duration, sound, gentle reminders, and default-off `gemini_personalization_enabled` consent).
7. **`activity_events`**: Non-punitive event log recording movement without streak or shame pressure.
8. **`feedback`**: Compassionate user feedback on steps and tasks.
9. **`step_generations`**: Per-task source/model/strategy, guard version/outcome, token/cost estimates, provider request ID, and non-sensitive fallback metadata. Prompt text, task title/context, and credentials are excluded.
10. **`step_feedback_events`**: Per-user idempotency key, task/step reference, action, request fingerprint, and serialized response. A unique `(user_id, idempotency_key)` constraint makes retries replay the same state transition without recording it twice.

---

## 4. Task Lifecycle, Strategy Retrieval & API Contracts (Phases 4–9)

- `POST /api/tasks`, `GET /api/tasks/{id}`, `PATCH /api/tasks/{id}`, and `DELETE /api/tasks/{id}` require authentication and filter by the current user ID.
- `GET /api/tasks` supports `status`, `capacity`, title `search`, `page` (1-indexed), and `page_size` (1–100); rows use stable created-time and ID ordering.
- `GET /api/tasks/counts` returns user-scoped active, paused, completed, archived, and total counts.
- `GET /api/activity/summary` aggregates stored activity-event counts after filtering by the authenticated owner.
- `GET /api/activity` preserves the legacy recent-event list if no page/filter is supplied. Explicit `page`, `page_size`, and `category` parameters return a page object; supported categories are `all`, `steps`, `pauses`, and `tasks`.
- `GET /api/privacy/export` returns the current account's profile, preferences, tasks/steps, activity, feedback, step-feedback actions, and safe generation fields. Password hashes, reset/refresh tokens, token hashes, idempotency keys, and request fingerprints are omitted.
- `DELETE /api/auth/me` verifies the current password before deletion. ORM and foreign-key cascades remove account sessions, preferences, tasks, steps, activity, feedback, step-feedback actions, and generation metadata.
- `POST /api/tasks/{task_id}/feedback` is the authenticated adaptive feedback transition endpoint. It requires `Idempotency-Key` (8–128 characters), scopes the task and step to the current user, persists the action and response in one transaction, and rejects key reuse with a different request fingerprint.
- `in_progress` remains accepted as a legacy status input/filter; responses and storage use `active`.
- Status transitions and task/step changes are recorded as activity events in the same database transaction as the associated mutation. An activity write failure fails the mutation rather than silently dropping the event.
- Task and step responses include integer `version` values initialized at `1`. The shared client sends the version it read using `If-Match` on edits. The API performs conditional `UPDATE ... WHERE version = expected` and increments the version atomically; a stale value returns HTTP 409 with a reload instruction. The task edit page offers a reload-latest action. No automatic field merge is attempted.
- A task with no saved steps receives one capacity-filtered `LOCAL_RAG` strategy when the reviewed corpus index exists and its cosine score meets the configured minimum. Gemini is requested only when the owner's account opt-in is true; otherwise the endpoint returns the local match. Missing/low-confidence retrieval or Gemini/provider/guard errors return one deterministic `LOCAL_FALLBACK`.
- The global FAISS index is built only from reviewed strategy text. Task title and optional context are encoded transiently for retrieval and are not persisted in the index, manifest, or retrieval logs.
- Index artifacts use FAISS `IndexIDMap2` over normalized inner-product vectors, stable SHA-256-derived positive IDs, an immutable MiniLM revision, a versioned JSON manifest, and checksums. No pickle serialization is used.
- The index loader validates corpus schema, capacity values, source/review metadata, record/ID set, corpus checksum, model revision, dimension, file size, and FAISS checksum/type before searching.
- Corpus source: `backend/knowledge_base/strategies.v1.json` (43 reviewed entries, corpus version `1.0.0`). The embedding model is `sentence-transformers/all-MiniLM-L6-v2`, pinned to revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41` (384 dimensions).
- `STRATEGY_RETRIEVAL_TOP_K` defaults to `3`, and `STRATEGY_MIN_RELEVANCE_SCORE` defaults to `0.28`. Capacity filtering is applied before selecting the single response shown by the shared UI. Retrieval ties use the stable numeric ID as a deterministic secondary sort.
- `backend/app/core/strategy_index.py` rebuilds `strategies.faiss` and `manifest.json` under `backend/data/strategy-index-v1`. The runtime loads the model from its local Hugging Face cache only; rebuilding can download the pinned model weights (about 86.6 MiB) if absent.
- `backend/requirements-rag.txt` pins FAISS, sentence-transformers, PyTorch, Transformers, and Python-version-specific NumPy wheels. The selected Windows Python 3.14 environment was used to build and query the index.
- The web app and Electron use the same React frontend and shared typed `ApiClient`; credentials and task data are sent to the FastAPI backend, never to a second renderer-specific implementation.

### Adaptive Feedback State Machine (Phase 7)

The backend is authoritative for step/task transitions. A step must be `pending` for Done, Can't, or Change. Conditional SQL updates (`WHERE status = 'pending'`) ensure only one concurrent request can resolve it. A repeated request with the same user's idempotency key and fingerprint returns the saved response; a different request using that key returns `409`. A separate request trying to resolve an already-resolved step also returns `409`. The UI's in-flight guard improves feedback but is not relied on for correctness.

| Action | Preconditions | Persisted transition | Next user-visible state |
|---|---|---|---|
| Done | Active task, pending step | Current step becomes `completed`; task remains `active` | Task detail requests one next suggestion; the task itself is not marked complete |
| Can't | Active task, pending step | Rejected step becomes `skipped`; one pending 15-second local smaller action is added | Adaptive screen offers that action; a further Can't creates a fresh candidate |
| Rest | Non-terminal task | Task becomes `paused`; pending step remains pending | Paused task appears in the persisted resume list and can be resumed after reload/restart |
| Change | Non-terminal task, pending step | Current step becomes `skipped`; task remains active/paused | Task/capacity edit opens; detail requests a suggestion using saved, updated capacity/task data |
| Dismiss | Existing owned task | Feedback event only; task and step statuses do not change | Return to dashboard without completion or penalty |

The bounded adaptation context reads at most five latest `Can't` events for that user and task and excludes their recent suggested titles. It contains only feedback action/step metadata, not task notes or Gemini prompt content. If a candidate is unavailable or repeats recent feedback, the endpoint uses a deterministic local alternative and explains that no AI request was needed. This context is intentionally bounded; it is not a model-training record.

The shared sequencer, adaptive step page, and rest/resume list announce status/error changes using `role="status"`/`aria-live="polite"` and `role="alert"`. Browser uses `BrowserRouter`; Electron uses `HashRouter`; both mount the same React components and API client. Automated tests exercise the feedback flow under both router modes. The Electron binary/window was not interactively launched for this phase.

### Progress, Explainability & Privacy (Phase 8)

- `/api/activity/summary` counts persisted `ActivityEvent` rows for the authenticated user. The web progress cards show exact stored counts for step completions, task pauses, resumes, and task creation; they are descriptive totals, not goals, scores, or streaks.
- The activity timeline supports server-side `steps`, `pauses`, and `tasks` categories plus page/page-size controls. Every summary and timeline query filters by owner before aggregation or pagination.
- Accepted generated suggestions can carry a `StepGeneration` ID into `Step`. The API verifies the generation belongs to the selected task and fills source/strategy from that server record, then persists those fields with the step and `step_added` activity metadata. Manually added/older steps may have no source attribution.
- The explanation screen describes implemented local retrieval, conditional Gemini use, the quality guard, and deterministic fallback. A step's `reason` is its stored model/strategy explanation, not an independent trace of every internal computation or a clinical explanation.
- Gemini is account-scoped and default-off. If enabled and local retrieval returns candidates, the prompt contains task title (at most 255 chars), notes/context (at most 1,200 chars), capacity, preferred duration, and up to five candidate strategy IDs/names/use cases/sample actions/capacity fit/relevance scores, plus generation instructions. Email, password, authentication tokens, and database credentials are not prompt fields. Local retrieval itself processes task title/notes/capacity on the backend without sending them to Google.
- The account JSON export is owner-scoped and includes profile fields, preferences, task/step content, activity, feedback, step-feedback actions, and safe generation metadata. Credential and replay-only fields are omitted.
- Account deletion requires password re-entry and removes associated data via ORM relationships and database foreign-key actions. A wrong password leaves the account intact. The guarantee is limited to the configured application database, not provider retention or deployment backups.
- Current retention policy: account data and activity remain while the account exists; automatic age-based purge is not implemented. Password reset tokens expire after 15 minutes and refresh sessions after 7 days. This is a documented policy, not an automated purge job.

### Cross-Platform Sync & Offline Policy (Phase 9)

- Web and Electron share the same Vite-built React renderer, `AuthContext`, and shared `ApiClient`; a production renderer requires the same explicit HTTPS `VITE_API_BASE_URL`. Electron does not load a separate API URL from its main process.
- Production backend startup fails closed if `DATABASE_URL` is SQLite. PostgreSQL `postgres://` and `postgresql://` connection strings are normalized to psycopg 3; `pool_pre_ping` is enabled. SQLite remains for local development/tests.
- The Docker image contains backend code/dependencies only, excludes `.env`, and does not start Alembic automatically. Operators run `python -m alembic -c backend/alembic.ini upgrade head` once as a release/pre-deploy command before API replicas. No cloud provider or managed database is provisioned by the repository.
- After a protected request returns 401, the shared client makes one refresh-token request and retries the original request once. A refresh 400/401 clears the session; a network failure leaves credentials available for re-verification when the browser reports reconnection. Transient GET network errors and HTTP 502/503/504 get one bounded retry. Writes are never retried or queued offline; the feedback API continues to use its existing per-user idempotency key for deliberate retries.
- The UI reports browser connection state through a polite live region. The production web service worker is designed to cache only the static HTML/JS/CSS app shell; it does not cache API responses. Cache matching ignores response `Vary` headers so cached assets can be reused for script/style requests. Offline renderer storage is limited to at most 50 per-account task identifiers, status, version, and last update timestamp. Titles, notes, and step content are not persisted in this index; it is cleared on explicit logout or account deletion. Offline app-shell reload remains inconclusive in the browser harness; no offline task edits or automatic sync queue are claimed.
- On reconnect the user reloads before editing. A stale task or step version receives 409 rather than silently overwriting another client's update. The current tests simulate two authenticated API clients against one test service; they are not a separate-device or hosted PostgreSQL test.
- See [the Phase 9 report](./PHASE_09_REPORT.md) for test counts, exact commands, deployment blockers, and acceptance gaps.

### Windows Desktop Integration & Packaging (Phase 10)

- The Windows wrapper continues to load the shared React renderer. Its BrowserWindow sets `contextIsolation`, `sandbox`, and `webSecurity` to true, with `nodeIntegration`, `webviewTag`, and insecure content disabled. Production HTML receives a CSP: scripts are same-origin; styles/fonts allow only the renderer and the configured Google Fonts origins; connections are HTTPS; objects and frames are disabled.
- Main-frame navigation stays on the dev-server origin or the packaged renderer file. New windows are denied; only credential-free HTTPS links are handed to the system browser. Redirects outside the allowed app URL are blocked.
- Preload exposes a frozen, narrow API for runtime identity, reading/updating one local notification preference, and signaling a completed step. IPC rejects requests not from the main app frame. No generic IPC channel, filesystem API, or Node object is exposed.
- Native step-completion notifications are disabled by default and require explicit consent in desktop Settings. A notification is emitted only after Done when the desktop window is unfocused; the fixed message includes no task text. `Notification.isSupported()` is checked and Windows notification preferences remain authoritative. The OS-level toast itself was not independently verified in this run.
- Native View-menu compact mode (`Ctrl+Shift+C`) uses a 520×720 default size; the window remains resizable. Window bounds, maximize/compact state, and notification preference are stored as non-sensitive JSON in Electron `userData`. The app loads root `.env` only when unpackaged; the installer excludes `.env`. Existing renderer logout clears stored session tokens and the offline status index.
- `npm run package:win` builds an x64 per-user NSIS installer, copies the shared web `dist` into installer resources, and configures uninstall to remove application data. Auto-update has no provider/feed configuration. The tested build was unsigned, used Electron's default icon, and pointed at a placeholder API URL; it is not distributable as a production release. See [the Phase 10 report](./PHASE_10_REPORT.md).

### Gemini Sequencing, Consent & Quality Guard (Phase 6)

- `GET /api/tasks/{task_id}/suggest-step` uses only the authenticated user's task and preferences. `gemini_personalization_enabled` defaults to false; enabling it in Settings discloses that title, optional context, capacity, and preferred duration are sent to Google. Email, account credentials, and unrelated preferences are not included.
- The backend calls the configured model at `GEMINI_MODEL` using `GEMINI_API_KEY` from the root development `.env` / production backend secret store. Browser and Electron code receive neither key nor provider endpoint credentials.
- The prompt contains the task fields, capacity, the opted-in duration preference, and up to five retrieved reviewed strategies. Task text is transient and is never written to the global strategy index or generation metadata.
- Gemini requests ask for schema-constrained JSON; strict Pydantic models reject unknown fields and invalid types. A deterministic guard checks action length/imperative form/single-action shape, task relevance, retrieved strategy/capacity match, nonjudgmental language, non-diagnostic safety flags, and unsafe medical wording.
- Requests use bounded timeout/retry settings. Quota, credentials, provider, blocked content, malformed response, invalid output, and quality-guard failures are classified without logging response bodies or prompt text. Each failure falls back to a deterministic local step; the API response and logs label the fallback.
- `step_generations` stores source, model, strategy ID, guard version/outcome, token counts, optional cost estimate, provider request ID, and safe reason metadata only. Cost rates are optional; cost estimates remain unset unless both rates are configured.
- `backend.scripts.validate_gemini_model` checks model visibility and `generateContent` support. `backend.scripts.smoke_gemini` sends a fixed synthetic example, not user content. The configured `gemini-2.5-flash` was retired for new users, so local development configuration was updated to `gemini-3.8-flash`; model visibility passed, but synthetic `generateContent` calls timed out at the configured 30-second timeout. Real generation is not verified.
- The Settings page, task detail, step sequencer, and AI transparency page identify the source and explain opt-in/data flow. A generation is still limited to one current suggested action; this phase does not add background blocking or Smart Focus.

## 5. Authentication, Session & Authorization Boundaries

1. **Argon2id Hashing**:
   - Implemented via `argon2-cffi` following RFC 9106 recommended profile (`time_cost=2`, `memory_cost=65536` [64 MiB], `parallelism=1`).
2. **Bounded JWT Access & Refresh Sessions**:
   - Access tokens: 30-minute expiration, HS256 signed with `JWT_SECRET_KEY`, payload containing `sub` (user_id), `email`, and `type="access"`.
   - Refresh tokens: 48-byte URL-safe high-entropy strings, 7-day expiration, stored only as SHA-256 hashes in DB.
3. **Single-Use Password Reset & Dev Email Sink**:
   - 32-byte URL-safe token with 15-minute expiration.
   - Development email sink logs reset instructions to `backend/dev_email_sink.log` and console; never falsely claims external email dispatch.
   - Used tokens are immediately invalidated and cannot be replayed.
4. **Per-User Authorization Isolation**:
   - Strict query scoping: `Task.user_id == current_user.id`, `Step.task.user_id == current_user.id`, `UserPreference.user_id == current_user.id`.
   - Cross-user access returns HTTP 404 Not Found to prevent resource enumeration.
5. **Sliding-Window Rate Limiting**:
   - In-memory sliding-window limiter on `/auth/register`, `/auth/login`, and `/auth/forgot-password` returning gentle 429 responses.
6. **Generic Error Posture**:
   - Generic authentication errors ("Invalid email or password") prevent user enumeration.

---

## 6. Universal Security & Environment Separation Rules

1. **Strict Secrets Isolation**:
   - Backend secrets (`GEMINI_API_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`) are loaded exclusively into FastAPI server memory using `dotenv` pointing to root `.env`.
   - Browser and Electron renderer run in isolated sandboxes.
   - Vite is configured with `envPrefix: 'VITE_'`. No non-`VITE_` variables are ever bundled into client-side JavaScript.
2. **Fail-Closed Security Posture**:
   - In non-development mode (`APP_ENV != "development"`), the backend fails startup immediately if `JWT_SECRET_KEY` is missing, default, or less than 32 characters, and production fails startup when `DATABASE_URL` is SQLite.
3. **Electron Hardening**:
   - `contextIsolation: true`
   - `nodeIntegration: false`
   - `sandbox: true`
   - `webSecurity: true`, insecure content and webviews disabled, production CSP, strict app-origin/file navigation, HTTPS-only external links, and validated narrow preload IPC.
   - NSIS desktop packaging is per-user; local app data is removed on uninstall. No auto-update client/feed is enabled.
4. **CORS Governance**:
   - `CORSMiddleware` whitelists the comma-separated server-side `CORS_ORIGINS`; development defaults include `http://localhost:5173` and `http://127.0.0.1:5173`. Production deployments must set deployed web origins explicitly.

---

## 7. Stitch Design System & Emotional Safety Tokens

Steplight AI implements the visual and emotional tokens from `stitch_steplight_ai_ui_ux_system/steplight_ai/DESIGN.md`:

- **Primary Electric Indigo (`#5265E8` / `#374ACE`)**: Drives momentum without visual aggression.
- **Deep Navy (`#17213D`)**: Anchors high-contrast typography and grounding states.
- **Soft Lavender (`#F0EDFF`) & Lavender Accent (`#A99CF5`)**: Calming contextual tags and protective halos.
- **Mint / Low Capacity (`#DDF5E9`, text `#1B4D3E`)**: Safe initiation, micro-celebrations.
- **Sky Blue / Medium Capacity (`#EAF0FF`, text `#2E42B0`)**: Moderate single-track focus.
- **Typography**: Plus Jakarta Sans for structural headers; Inter for sustained reading.
- **Anti-Shame Guarantees**:
  - Zero red warning streaks for overdue tasks.
  - Pausing is treated as a healthy self-care achievement.
  - "Can't • Make Smaller" sets the rejected action aside and suggests an optional, locally generated 15-second action; it does not claim the action is effortless or completed.

---

## 8. Phase Roadmap

- **Phase 1 (Completed & Verified)**: Monorepo foundation, Stitch screen integration (4 core screens), shared package, typed client, FastAPI health endpoints, Electron dev/prod loader.
- **Phase 2 (Completed & Verified)**: Complete UI and Navigation across all 30+ screens, light/dark theme toggling, global keyboard navigation, responsive mobile/tablet/desktop layouts, and comprehensive smoke test suite.
- **Phase 3 (Completed & Verified)**: Persistent PostgreSQL-ready database models, migrations, Argon2id/JWT authentication, reset tokens, development email sink, and per-user isolation.
- **Phase 4 (PARTIAL)**: Owner-scoped task CRUD, lifecycle statuses, capacity and context validation, pagination/search/filtering, dashboard counts, activity history, and local fallback suggestions are implemented and covered by automated tests. Interactive browser/Electron CRUD parity and a separate process-restart acceptance test remain outstanding; see [the Phase 4 report](./PHASE_04_REPORT.md).
- **Phase 5 (PASS)**: Curated local strategy corpus, versioned MiniLM/FAISS retrieval, capacity filters, confidence fallback, and private query handling. Retrieval itself makes no external request.
- **Phase 6 (PARTIAL)**: Consent-gated backend Gemini orchestration, metadata-only persistence, output guard, and local fallback are implemented and mock-tested. The configured model metadata check passes, but real synthetic `generateContent` calls timed out; live generation remains unverified.
- **Phase 7 (PASS)**: Owner-scoped idempotent feedback transitions, conditional step completion, recent-feedback-aware local smaller actions, saved rest/resume, task/capacity edits, accessible status announcements, and shared Browser/HashRouter UI. See [the Phase 7 report](./PHASE_07_REPORT.md) for verification evidence and limitations.
- **Phase 8 (PASS)**: Persisted activity summaries and paginated history, source attribution, exact AI data-flow disclosure, account-scoped export and password-confirmed deletion, and documented retention behavior. See [the Phase 8 report](./PHASE_08_REPORT.md).
- **Phase 9 (see measured report verdict)**: PostgreSQL production guard, provider-neutral Docker image, migration release command, versioned task/step conflict handling, shared production API URL validation, refresh/retry behavior, and an offline metadata index without queued writes. Hosted PostgreSQL and physically separate-device synchronization are not certified. See [the Phase 9 report](./PHASE_09_REPORT.md).
- **Phase 10 (see measured report verdict)**: Hardened Electron renderer/main boundaries, desktop-only opt-in native notifications, compact mode and window persistence, plus unsigned x64 NSIS packaging. Production endpoint, signing, OS toast policy, and distribution are not certified. See [the Phase 10 report](./PHASE_10_REPORT.md).
- **Phase 11 (PARTIAL)**: Current regression suites, typecheck, production build, local website/API smoke checks, keyboard skip-link, reduced-motion preference, mobile-width layout, secret-value scan, and dependency audit were exercised. A full browser/Electron E2E matrix, automated WCAG scan, and load/performance test were not run. See [the Phase 11 report](./PHASE_11_REPORT.md).
- **Phase 12 (PARTIAL)**: Release configuration and PowerShell deployment guidance are documented; an unsigned x64 NSIS build was created, launched in an isolated smoke install, and uninstalled. There is no hosted PostgreSQL/API deployment, production credentials, signed installer, tested backup restore, or rollback execution. See [the Phase 12 report](./PHASE_12_REPORT.md).

## 9. Release and Verification Boundaries

- Browser and Electron use the same React renderer and typed API client. Production renderer builds embed only the public `VITE_API_BASE_URL`; backend secrets remain server-side. Local development reads the root `.env`; `.env` is ignored by Git.
- Production builds require an HTTPS, non-localhost API URL. `https://api.example.test/api` is a reserved test/packaging placeholder, not a deployed service.
- Backend production configuration requires PostgreSQL, and migrations are a separate release step (`python -m alembic -c backend\alembic.ini upgrade head`). Backend tests use isolated SQLite databases and do not certify PostgreSQL.
- Vite and Vitest were updated to patched Vite 7.3.7 / Vitest 4.1.12 releases after dependency audit findings. The full npm audit now reports zero high/critical advisories and five moderate advisories remain; the React Router 6 advisory is among them. No major router or Tailwind migration was performed.
- Windows packaging is not a public release: the installer uses the placeholder API URL, is unsigned, and uses the default Electron icon. Automatic update is disabled.
- Cross-device synchronization requires a shared deployed API and hosted PostgreSQL. Automated two-client SQLite tests validate ownership and conflict behavior only; no separate physical device scenario was run.
- Gemini is consent-gated and backend-only. Mocked tests validate fallback behavior; the earlier synthetic provider call timed out, so live Gemini generation is not certified.

See [Phase 11](./PHASE_11_REPORT.md), [Phase 12](./PHASE_12_REPORT.md), [final verification](./FINAL_SYSTEM_VERIFICATION.md), [security audit](./SECURITY_AUDIT.md), [accessibility audit](./ACCESSIBILITY_AUDIT.md), and [deployment guidance](./DEPLOYMENT.md).
