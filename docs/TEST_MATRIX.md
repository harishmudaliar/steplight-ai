# Test Matrix

**Last executed:** 2026-10-25

## Current automated suites

| Area | Command | Result | Not covered by this result |
|---|---|---|---|
| Shared typed API client | `npm run test:shared` | PASS — 13 tests | Live deployed API; real credentials |
| Web UI | `npm run test:web` | PASS — 59 tests | Full manual route audit; native Electron rendering |
| FastAPI backend | `npm run test:backend` | PASS — 72 tests, 5 warnings | Hosted PostgreSQL; external Gemini generation |
| Aggregate regression | `$env:PATH = "$PWD\.venv\Scripts;$env:PATH"; npm test` | PASS — 144 tests total | Separate physical devices |
| TypeScript | `npm run typecheck` | PASS — shared, desktop, web | Runtime Electron/Windows API behavior |
| Production build | `$env:VITE_API_BASE_URL='https://api.example.test/api'; npm run build` | PASS — Vite 7.3.7, 76 modules | Real API connectivity (placeholder URL) |
| Windows packaging | `$env:VITE_API_BASE_URL='https://api.example.test/api'; $env:CSC_IDENTITY_AUTO_DISCOVERY='false'; npm run package:win` | PASS — x64 NSIS | Signing and production deployment |
| Electron development runtime | `npm run dev:desktop` with web/backend dev servers running | PASS — native window title observed | Complete native feedback workflow |
| Dependency audit | `npm audit --json` | 0 critical, 0 high, 5 moderate | Security penetration testing |
| Production dependency audit | `npm audit --omit=dev --audit-level=high` | Exit 0; two moderate React Router advisories | Full dependency tree still has moderate findings |

## Feature acceptance coverage in existing tests

| Requirement | Evidence |
|---|---|
| Auth and account isolation | Backend auth/isolation tests; current full suite passes |
| Task capacity, validation, CRUD and filters | Backend task tests; UI workflow tests |
| Local retrieval and deterministic fallback | Retrieval/task backend tests |
| Gemini success/error/timeout fallback | Mocked backend tests; live provider timed out historically |
| Done/Can't/Rest/Change/Dismiss | Backend transition and web feedback tests |
| Idempotency, races, version conflicts | Backend feedback/version tests and shared client tests |
| History, privacy export and deletion | Backend Phase 8 tests |
| Offline and safe retries | Shared/API and offline hook tests; reload acceptance remains inconsistent |
| Screen-reader announcements | Web feedback tests assert polite status/error regions |
| Reduced motion | Browser emulation verified CSS values; no full route animation audit |
| Windows desktop boundary | Phase 10 report verifies renderer isolation and fixed preload API |
| Installer installation/removal | Phase 12 isolated NSIS install, launch, and uninstall smoke |

## Manual runtime checks in this verification

- FastAPI health: `curl.exe --noproxy "*" --silent --show-error --max-time 10 http://127.0.0.1:8000/api/health` — HTTP 200.
- Web route: `curl.exe --noproxy "*" --silent --show-error --max-time 10 -o NUL -w "HTTP %{http_code}\n" http://localhost:5173/signup` — HTTP 200.
- Browser at 390×844: `document.documentElement.scrollWidth` was 390 px; first Tab target was “Skip to main content”.
- With `prefers-reduced-motion: reduce`, `animation-duration` and `transition-duration` computed as `0.00001s` and `animation-iteration-count` as `1`.
- A browser screenshot of signup was captured during this session but not saved as a repository artifact.
- Windows package smoke used a GUID-scoped temporary install and app-data path. Window title was visible after an eight-second launch check; silent uninstaller exited 0 and removed both isolated paths.

## Warnings and non-passing gates

- The full backend test suite emitted five deprecation warnings; no tests failed.
- Vite/Vitest emit non-blocking config/deprecation notices.
- No hosted PostgreSQL, full offline/reconnect test, production latency/load test, browser-to-desktop real-device sync, live Gemini success, full WCAG audit, or signed installer test was run.
