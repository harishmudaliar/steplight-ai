# Phase 12 — Release and Deployment Readiness

**Verification date:** 2026-10-25  
**Verdict:** **PARTIAL**

## Delivered and verified

- Updated README, architecture, progress, deployment, user, demo, release, known-issue, test-matrix, accessibility, and security documentation with current evidence and limitations.
- Rebuilt all workspaces using Vite 7.3.7 and the shared production renderer.
- Built a Windows x64, per-user NSIS installer with Electron Builder 26.18.0 and Electron 45.0.0.
- Installed the generated package into a unique temporary directory with an isolated `%APPDATA%` root. The installed executable opened a Steplight window titled “Steplight AI — One Tiny Step. Zero Shame.” after an eight-second launch check, and the packaged shared renderer was present.
- Ran the package uninstaller silently. It returned exit code 0 and removed both the temporary install directory and the isolated `@steplight\desktop` user-data path.
- Confirmed the generated installer is unsigned. It uses `https://api.example.test/api`, an example-only placeholder, and must not be distributed.

## Exact commands

```powershell
$env:VITE_API_BASE_URL = "https://api.example.test/api"
npm run build

$env:VITE_API_BASE_URL = "https://api.example.test/api"
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run package:win
```

The package command completed successfully. The generated artifact is:

`apps\desktop\release\Steplight AI-Setup-1.0.0.exe`

The final file measured **121,361,706 bytes** with SHA-256 `E5A4922F1918F3B75ADA9CDEB542926CFA9544A3CFF1BA25A997C16808D3641D`. `Get-AuthenticodeSignature` returned `NotSigned`.

The package build output recorded the absence of a signing certificate and use of Electron's default icon. The installer uses the test-only API URL.

For the final isolated smoke, PowerShell created a fresh GUID-named directory under `%TEMP%`, installed silently with `/S /D=<temporary path>`, verified the executable and `resources\web\index.html`, launched the executable, and observed the native window title “Steplight AI — One Tiny Step. Zero Shame.” after eight seconds and at a follow-up process check. The installer exited 0. The silent `Uninstall Steplight AI.exe /S` returned 0; install and isolated app-data paths were absent afterward. The temporary smoke directory was removed after confirming it was empty.

## Production configuration and deployment status

No deployment was attempted: no hosting account, managed PostgreSQL instance, production secrets, DNS/TLS endpoint, or public web origin was supplied. Production must use backend secret storage for `DATABASE_URL`, `JWT_SECRET_KEY`, and `GEMINI_API_KEY`; only the public deployed HTTPS API base URL may be embedded as `VITE_API_BASE_URL`.

The deployment guide documents migration-before-rollout, environment configuration, backup/restore, and rollback precautions. These procedures are guidance, not evidence of a real deployment, PostgreSQL migration, backup restore, or rollback run. The backend Docker image was not built in this phase.
The packaged Electron ASAR listing contained no `.env` entry or `dotenv` package match.

## Blockers and release decision

- No real HTTPS API endpoint or hosted PostgreSQL was provisioned.
- No code-signing identity or product icon was available.
- Live Gemini generation remains unverified; a prior synthetic provider request timed out.
- A production backup/restore and database rollback have not been exercised.
- Native Windows notification-center delivery and physical web-to-Electron sync remain unverified.
- Auto-update is intentionally disabled until a signed release and trusted update endpoint exist.

**Release decision:** do not distribute this installer. A signed build against a real deployed API, plus production database and release smoke evidence, is required.
