# Phase 10 Report — Windows Desktop Integration and Packaging

**Date:** 2026-10-25  
**Verdict:** **PARTIAL**

## Summary

The Windows Electron shell now applies stricter navigation and renderer security, packages the shared React renderer into a per-user x64 NSIS installer, persists non-sensitive window state, and offers a desktop-only, default-off native step-completion notification preference. The compact-window command and installation/uninstallation paths were exercised on Windows.

The phase is **PARTIAL**, not PASS: no deployed HTTPS API URL or signing certificate was supplied, and Windows notification-center delivery was not independently verified. The installer used for packaging validation embeds `https://api.example.test/api`; it is not suitable for distribution.

## Design decisions

- **Preserve one UI:** Electron continues to load the same Vite-built React renderer as the browser. Desktop-only settings are conditionally rendered through a typed preload interface.
- **Renderer boundary:** `contextIsolation`, `sandbox`, and `webSecurity` are enabled; Node integration, webviews, and insecure content are disabled. CSP is added to generated HTML; production scripts are same-origin and API connections are HTTPS. The dev policy allows only the local Vite and local FastAPI endpoints required by development.
- **Navigation:** Main-frame navigation is limited to the configured loopback dev origin or the packaged local renderer file. Popups are denied. Only credential-free HTTPS URLs are opened in the system browser; external redirects are blocked.
- **IPC:** Preload freezes a small API with identity, desktop notification settings, and a fixed step-completed event. Main-process IPC verifies the sending frame and validates preference values. No general-purpose IPC, filesystem, or Node access is exposed.
- **Notifications:** Native notifications are off by default. The signed-in-independent desktop setting requires explicit user opt-in; after Done, a fixed message is emitted only while the app is unfocused. No task title or personal content is included. `Notification.isSupported()` is checked; Windows notification-center settings remain authoritative.
- **Persistence:** Window dimensions/position, maximize/compact flags, and notification preference are written to `app.getPath('userData')`. Only bounded geometry and a boolean preference are persisted. Auth tokens remain in renderer localStorage as before; logout clears renderer session state and offline status cache.
- **Packaging:** Electron is pinned to `45.0.0`; Electron Builder produces a Windows x64, per-user NSIS installer. Uninstall removes program files and app data. Auto-update is not configured. Signing is skipped without a certificate; the default Electron icon is used because no product icon was supplied.
- **Production API:** The Vite production configuration now requires a valid HTTPS non-localhost `VITE_API_BASE_URL` at build time. The public URL is renderer configuration, never a secret.

## Files changed

- Electron main/preload/package configuration: `apps/desktop/src/main.ts`, `apps/desktop/src/preload.ts`, `apps/desktop/package.json`.
- Shared UI and API boundaries: `apps/web/src/pages/SettingsPage.tsx`, `apps/web/src/context/TaskContext.tsx`, `apps/web/src/types/electron.d.ts`, `apps/web/src/test/App.test.tsx`, and `apps/web/vite.config.ts`.
- Workspace and artifact configuration: root `package.json`, `package-lock.json`, and `.gitignore`.
- Documentation: `README.md`, `docs/ARCHITECTURE.md`, `progress.md`, and this report.

## Commands and verification evidence

Commands run from the repository root in PowerShell:

```powershell
$env:PATH = "$PWD\.venv\Scripts;$env:PATH"
npm test
npm run typecheck
npm run test:web
```

- `npm test` — **PASS**: Shared 13, Web 59, Backend 72 (**144 total**); 5 backend warnings.
- `npm run typecheck` — **PASS** across shared, desktop, and web.
- `npm run test:web` — **PASS**, 59 tests, including desktop-only notification preference UI behavior.

Development smoke:

```powershell
# Terminal 1
npm run dev:web

# Terminal 2
npm run dev:desktop
```

- `curl.exe -sS -I --max-time 15 http://localhost:5173/` returned HTTP 200.
- `npm run dev:desktop` opened a responsive Electron window with the expected Steplight title; the dev server remained available.

Production package smoke:

```powershell
$env:VITE_API_BASE_URL = "https://api.example.test/api"
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run package:win
```

- **PASS:** Electron Builder 26.18.0 produced `apps\desktop\release\Steplight AI-Setup-1.0.0.exe` for Windows x64; final file size 121,361,381 bytes. The build was unsigned and used the test-only API URL above.
- An invalid localhost URL was tested with `$env:VITE_API_BASE_URL = 'http://localhost:8000/api'; npm run build:web`; Vite rejected it with the expected production HTTPS/non-localhost error.
- Silent NSIS install returned exit code 0. The installed executable opened a responsive window, and `resources\web\index.html` was present.
- Silent uninstall returned exit code 0 and removed both the test installation directory and `%APPDATA%\@steplight\desktop`.
- Native window checks: the compact hotkey resized the installed window to 520 px wide; compact state and a user-resized 1100×820 native window bound were restored after app restart (measured outer bounds after restart were 1103×816).
- Desktop settings UI read native-notification support and successfully enabled then disabled the app preference. Windows OS toast visibility and notification-center policy were not tested.
- Packaged renderer DevTools evaluation returned `process: "undefined"` and `require: "undefined"`. Its bridge exposed only `isDesktop`, `platform`, `getDesktopSettings`, `setNativeNotificationsEnabled`, and `notifyStepCompleted`.
- ASAR inspection found no `.env` file and no packaged `dotenv` dependency. The main process only loads root `.env` when the application is not packaged. Generated renderer HTML contains a CSP.
- No screenshot of the native app was retained.

Dependency audit:

```powershell
npm audit --omit=dev
```

The production dependency audit reports two moderate React Router advisories. The suggested fix requires moving to React Router 7; this potentially behavior-changing upgrade was not included in Phase 10. `npm install` reports 10 advisories across the full development dependency tree.

## Remaining limitations and risks

- No actual deployed API endpoint was supplied. The generated installer is a packaging smoke build pointing to `api.example.test`; do not distribute or present it as production-connected.
- No Windows code-signing certificate or product icon was supplied. The installer and executable are unsigned and use the default Electron icon.
- Electron has no app-level Windows permission prompt equivalent for native notifications. The app preference and Electron support check were exercised, but actual notification-center delivery and OS policy were not independently verified.
- Two moderate production React Router audit findings remain; assess a major-version upgrade separately with route regression testing.
- Auto-update is intentionally absent until a signed release and real update service/metadata endpoint exist.
- No native app screenshot was captured. No tray behavior was added; standard minimize/close and a native Window menu remain available.

## Next-phase prerequisites

1. Supply the deployed HTTPS FastAPI URL and build a release installer against it.
2. Obtain a Windows code-signing certificate and a product icon before public distribution.
3. Validate toast display with the target Windows notification settings and user consent.
4. Evaluate the React Router advisories and test a compatible remediation without changing existing routes or browser/Electron parity.
5. Decide whether a tray/minimize-to-tray workflow or auto-update is desired; neither is enabled here.
