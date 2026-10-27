# Known Issues and Release Blockers

**Last reviewed:** 2026-10-25

| Issue | Impact | Evidence/status | Owner / next action |
|---|---|---|---|
| No hosted production API or PostgreSQL configured | No public account, deployment, production migration, or real cross-device sync can be verified | Phase 9/12 remain PARTIAL | Deployment operator: provision approved hosting/database |
| Gemini generation has not completed successfully | Live provider response and end-to-end AI UI behavior are unverified | Prior synthetic call timed out; mock fallback tests pass | AI/backend owner: rerun synthetic provider check with approved server key |
| Offline app-shell reload is inconsistent | Offline navigation/reload acceptance is not met; no writes are queued | Phase 9 browser harness evidence | Web owner: fix and repeat offline/reconnect matrix |
| No physical web-to-Electron sync scenario | Cross-client behavior is tested with two API clients only | No separate device/deployment available | QA: run after shared hosted backend exists |
| Installer is unsigned and contains placeholder API URL | Not safe to distribute as a production release | Local x64 NSIS build/install/uninstall smoke only | Release owner: real endpoint, signing cert, icon, signed smoke |
| Windows notification delivery is not verified | App preference/support checks do not prove Windows toast display | OS notification-center policy not exercised | Desktop owner: test supported Windows versions/settings |
| Five moderate npm audit findings remain | Dependencies have known moderate advisories | Full audit: 0 high/critical, 5 moderate; prod-only includes two React Router advisories | Frontend owner: evaluate router and Tailwind/PostCSS upgrades |
| No full WCAG/axe/screen-reader or load test | Accessibility and performance acceptance is incomplete | Phase 11 checks are focused, not comprehensive | QA: route-wide audit and target performance testing |
| No verified backup/restore/rollback | Production recoverability is unknown | Guidance exists; no hosted database/restore run | Operations: perform restore and rollback drill |
| No automatic retention purge | User data remains until account deletion; provider/backup retention is external | Phase 8 behavior is documented | Product/privacy owner: set and implement approved retention policy |
| No signed updater or auto-update | Desktop releases require manual distribution | Intentionally disabled | Release owner: decide only after signed endpoint exists |

See [final system verification](./FINAL_SYSTEM_VERIFICATION.md) for the phase matrix.
