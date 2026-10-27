# Deployment, Backup, Restore, and Rollback Guide

**Status:** Provider-neutral instructions only. No hosted environment has been provisioned or verified.

## Architecture and trust boundaries

Deploy the FastAPI backend and PostgreSQL database as server-side services. Deploy the React website as static assets or through an approved web host. Electron packages the same React renderer. Both clients must be built with the same public HTTPS `VITE_API_BASE_URL`.

Never place `DATABASE_URL`, `JWT_SECRET_KEY`, or `GEMINI_API_KEY` in a `VITE_*` variable, renderer configuration, source repository, or installer. Keep production secrets in the hosting provider's secret manager. Do not copy the local root `.env` into production.

## Backend release procedure

1. Create a PostgreSQL database and a restricted application role using the hosting provider's secure configuration interface.
2. Configure server-side values:
   - `APP_ENV=production`
   - `DEBUG=false`
   - `DATABASE_URL` for PostgreSQL/psycopg 3
   - `JWT_SECRET_KEY` with at least 32 cryptographically random characters
   - `CORS_ORIGINS` with only the deployed web origins
   - `GEMINI_API_KEY` only if the provider integration is approved; user preference remains default-off
3. Build the backend container from the repository root:

   ```powershell
   docker build -t steplight-backend:release .
   ```

   Docker Desktop was unavailable during the phase baseline, so this command is documented but not verified here.
4. Run Alembic once as a release/pre-deploy job, not in each API replica:

   ```powershell
   python -m alembic -c backend\alembic.ini upgrade head
   ```

5. Start the API with the container's configured `PORT`; check `GET /api/health` and review sanitized server logs. Do not expose `/api/docs` publicly unless explicitly required and access-controlled.
6. Deploy the web renderer using the same API URL:

   ```powershell
   $env:VITE_API_BASE_URL = "https://api.your-domain.example/api"
   npm run build:web
   ```

7. Package Electron only after confirming that same API endpoint is production-ready:

   ```powershell
   $env:VITE_API_BASE_URL = "https://api.your-domain.example/api"
   npm run package:win
   ```

The example host above is a placeholder. The currently tested installer uses `https://api.example.test/api` and must not be distributed.

## Database backup and restore

- Enable encrypted managed-database backups and point-in-time recovery in the chosen provider; set a retention period consistent with the privacy policy and business requirements.
- Record the backup time, database migration revision, encryption/key ownership, and restore test result. Restrict backup access to operators.
- Before a release, verify a recent backup using provider tooling. Perform restore exercises into a new, isolated, empty test database, never over production.
- If using PostgreSQL client utilities, use the provider's secret-safe credential mechanism and restore to a new test database. Do not paste connection strings/passwords into chat, logs, shell history, or command-line arguments.
- The application does not implement backup scheduling, age-based account-data purge, or provider-side backup erasure.
- No backup or restore was run for this report.

## Rollback guidance

- Preserve the previous application image and renderer/installer release artifact with its matching source revision and migration version.
- Roll back application code only when the previous release is compatible with the current schema. Review Alembic migration operations first; do not assume every schema change is reversible without data loss.
- For an incompatible schema/data release, use the provider's tested restore/PITR procedure to a separate recovery database, validate it, and plan a controlled cutover.
- `alembic downgrade -1` is a developer command, not a production rollback plan. Do not run it against production without a verified migration-specific recovery plan and approval.
- No production rollback was executed.

## Release prerequisites

Hosted PostgreSQL/API, real HTTPS origins, production secret rotation, observed migration success, a restore drill, monitoring/log retention policy, and a signed Windows installer remain required. See [the release checklist](./RELEASE_CHECKLIST.md) and [known issues](./KNOWN_ISSUES.md).
