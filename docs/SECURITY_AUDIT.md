# Security Audit Evidence

**Date:** 2026-10-25  
**Verdict:** **PARTIAL — automated checks only**

This is a bounded repository and dependency review, not a penetration test, third-party assessment, or certification.

## Verified controls

- Root `.env` is ignored by Git (`git check-ignore -q .env` returned success); `.env.example` uses placeholders.
- Vite exposes only `VITE_*` variables. A value-only scan of the built renderer found no configured Gemini key, JWT secret, or database URL value. This scan did not print or persist secret values.
- FastAPI owns authentication, authorization, database access, strategy retrieval, and Gemini requests. Existing backend tests cover generic auth errors, ownership isolation, fail-closed production secret checks, and password/session handling.
- Electron enables context isolation, sandboxing, web security, and disabled renderer Node integration, with navigation restrictions and a fixed preload surface. Phase 10 records its packaged renderer inspection (`process`/`require` undefined).
- Production Vite builds reject missing, localhost, or non-HTTPS API URLs. `VITE_API_BASE_URL` is a public endpoint, not a secret.
- The production backend configuration requires PostgreSQL; deployment migrations are a separate release step.

## Dependency audit

Vite/Vitest tooling was updated after the initial audit found a high Vite advisory and critical Vitest/tinypool advisories:

- Vite `7.3.7`
- `@vitejs/plugin-react` `5.2.0`
- Vitest `4.1.12`

After the update:

- Full `npm audit --json`: **0 critical, 0 high, 5 moderate, 0 low**.
- `npm audit --omit=dev --audit-level=high`: exit code 0; **two moderate React Router advisories** remain in the production dependency graph. `npm audit` identifies the backslash/open-redirect and SSR hydration constructor-injection advisories in the React Router 6 range.
- The remaining full-tree findings include moderate Tailwind/PostCSS-related advisories. No Tailwind or React Router major migration was attempted because it could alter routes/styles and needs dedicated regression work.

The final audit is not “clean”: moderate advisories remain and should be reviewed before a public release.

## Unverified and residual risk

- No live production deployment, production database, or penetration test was available.
- No live Gemini request succeeded during the earlier synthetic provider smoke; the API key is backend-only and the preference is default-off, but provider integration is not certified.
- Database backups and provider-side retention/deletion behavior are operational responsibilities, not verified controls.
- The unsigned smoke installer points to `https://api.example.test/api`; it is not a release artifact.
- The app still uses React Router 6 and Tailwind CSS 3. Resolve moderate advisories through separately tested upgrades or document a security exception before release.

## Evidence commands

```powershell
git check-ignore -q .env
npm audit --json
npm audit --omit=dev --audit-level=high
$env:VITE_API_BASE_URL = "https://api.example.test/api"
npm run build
```

The exact-value renderer scan and Electron boundary evidence are recorded in [Phase 11](./PHASE_11_REPORT.md) and [Phase 10](./PHASE_10_REPORT.md).
