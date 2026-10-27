# Phase 5 — Curated Strategy Retrieval

**Project:** Steplight AI — Team OLYMPUS  
**Date:** 2026-10-24  
**Last Verified:** 2026-10-24 22:14 UTC+05:30  
**Verdict:** **PASS**

## Scope Delivered

- Authored and validated 43 reviewed, non-diagnostic task-initiation strategies in versioned JSON. Each record has a stable string ID, use case, capacity fit, sample action, caution, source metadata, and editorial review metadata.
- Added local CPU embeddings using `sentence-transformers/all-MiniLM-L6-v2`, pinned to immutable revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41` (384 dimensions; model weights 90,868,376 bytes, approximately 86.6 MiB).
- Added a FAISS `IndexIDMap2` cosine-similarity index with stable SHA-256-derived IDs, a versioned/checksummed JSON manifest, and a rebuild command. No pickle serialization is used.
- Added deterministic capacity filtering, configurable top-k and minimum cosine score, deterministic tie-breaking, and a clearly labeled fallback when no match meets the confidence threshold or local retrieval is unavailable.
- Wired the existing owner-scoped task suggestion endpoint to the local retriever. The response returns one suggestion, labels its source (`LOCAL_RAG` or `LOCAL_FALLBACK`), and includes an optional retrieval score. Gemini remains disconnected.
- Kept task title/context query-only in memory. Raw query text is not written to the corpus, FAISS index, manifest, or retrieval logs.
- Updated the shared API types and the existing transparency page so Web and Electron continue to use one React UI and describe actual behavior.

## Design Decisions

1. The shared corpus contains only authored strategy entries; no user tasks are added to or used to update the global vector index.
2. Stable vector IDs derive from strategy IDs, independent of file ordering. Normalized vectors use inner-product scoring as cosine similarity.
3. Results are filtered by capacity and minimum relevance score, sorted by score then stable numeric ID, and bounded by the configured top-k. The API uses only the first match so there is one suggested step at a time.
4. A missing index/model or an empty low-confidence result uses the existing deterministic step bank, with explicit local-fallback wording. Invalid or corrupt corpus/index artifacts raise explicit errors instead of being silently accepted.
5. The pinned RAG dependencies include a NumPy marker: 2.2.6 below Python 3.14 and 2.4.3 on Python 3.14+. The full real model/index build and retrieval were verified on Windows Python 3.14.0.
6. Source references provide bibliographic/provenance context; entries use original wording and make no diagnostic or treatment claims. This implementation editorial review is not a substitute for an independent specialist review.

## Files Changed

- Corpus and pinned dependencies: `backend/knowledge_base/strategies.v1.json`, `backend/requirements-rag.txt`, `.gitignore`, `.env.example`.
- Retrieval/index core and configuration: `backend/app/core/strategy_retrieval.py`, `backend/app/core/strategy_index.py`, `backend/app/config.py`.
- Endpoint and typed shared UI contract: `backend/app/api/tasks.py`, `backend/app/schemas/task.py`, `packages/shared/src/types/index.ts`, `packages/shared/src/api/client.ts`, `apps/web/src/pages/TaskDetailPage.tsx`, `apps/web/src/pages/AiTransparencyPage.tsx`.
- Tests: `backend/tests/test_strategy_retrieval.py`, `backend/tests/test_tasks.py`, `apps/web/src/test/App.test.tsx`.
- Documentation: `README.md`, `progress.md`, `docs/ARCHITECTURE.md`, and this report.

## Commands and Verification Evidence

Commands were run from the repository root in PowerShell on 2026-10-24. Python executable: `C:\HARISH\Olympus\Steplight\.venv\Scripts\python.exe` (Python 3.14.0).

```powershell
& 'C:\HARISH\Olympus\Steplight\.venv\Scripts\python.exe' -m pytest backend\tests\test_strategy_retrieval.py backend\tests\test_tasks.py -q
$env:PATH = 'C:\HARISH\Olympus\Steplight\.venv\Scripts;' + $env:PATH; npm test
npm run typecheck
npm run build
& 'C:\HARISH\Olympus\Steplight\.venv\Scripts\python.exe' -m backend.app.core.strategy_index
& 'C:\HARISH\Olympus\Steplight\.venv\Scripts\python.exe' -m pip check
git diff --check
```

Results:

- Focused retrieval/task API tests: **19 passed** before the final no-match endpoint case was added. The final full backend suite below includes that additional case.
- `npm test`: **92 passed** — shared 6, web 39, backend 47. Five existing dependency deprecation warnings; no test failures.
- `npm run typecheck`: **PASS** across shared, desktop, and web.
- `npm run build`: **PASS** for shared, desktop, and web; Vite transformed 76 modules.
- Real model/index build: **PASS**, 43 strategy vectors, version `1.0.0`, dimension 384.
- Rebuilt with the same command: FAISS and manifest SHA-256 checksums were byte-identical across builds:
  - Index: `DB785641D1544390ECD7DB948CEDEFB3498DD6385A8D93A068EDB6E4B9FD12EA`
  - Manifest: `E081471A094E57A09510E307D2855AA8D96E9706F7998A72CDE120CB2638D7AC`
- Relevance examples measured with the pinned MiniLM model and configured threshold `0.28`:

| Query example | Capacity | Top strategy | Cosine score |
|---|---|---|---:|
| Write the first sentence of an essay | Low | `write_first_sentence` | 0.5795 |
| Run one software test | High | `run_one_test` | 0.3905 |
| Work through one small unit | High | `work_one_small_unit` | 0.4784 |
| Prepare a load of laundry | Low | `start_one_load` | 0.8112 |
| Reply to a message with a short acknowledgment | Medium | `reply_with_acknowledgment` | 0.7446 |
| Make a hotel booking | Medium | `make_one_booking_step` | 0.4637 |
| Quantum xylophone (no relevant result) | Low | No match; service returns empty results for API fallback | — |

- Automated retrieval tests cover varied task domains/capacities, ranking/top-k, capacity filtering, no-match, deterministic rebuilds with a test encoder, private-query non-persistence, malformed source/capacity/ID metadata, and index checksum rejection.
- API tests cover matched `LOCAL_RAG` output, no-match deterministic fallback, and ensuring private query text does not appear in logs.
- The corpus and generated index contain no private-query marker after retrieval. Index files are ignored by Git and can be rebuilt from the reviewed source JSON.

## Startup and Rebuild Commands

From the repository root in PowerShell:

```powershell
py -3.14 -m venv .venv
& .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
& .\.venv\Scripts\python.exe -m pip install -r backend\requirements-rag.txt
& .\.venv\Scripts\python.exe -m backend.app.core.strategy_index
& .\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
npm run dev:web
npm run dev:desktop
```

The first build downloads the pinned public model weights to the local Hugging Face cache. Runtime retrieval is configured to use that cache only. The FAISS index and manifest are generated at `backend\data\strategy-index-v1`; rebuild after updating the corpus.

## Limitations and Unresolved Risks

- Automated/real-model validation was performed on Windows Python 3.14.0; lower supported Python versions have dependency markers/pins but were not separately installed and exercised in this run.
- Source metadata and non-diagnostic wording received implementation editorial review, not independent clinical, behavioral-science, or citation review.
- The generated binary index is deliberately ignored by Git, so a clean checkout returns the deterministic fallback until the documented build command is run.
- No browser or Electron screenshots were captured. The browser was not opened; UI validation was via existing frontend tests, typecheck, and build.
- Hugging Face emitted an unauthenticated-download notice and a Windows symlink-cache warning. The build completed; developer mode/admin rights can improve cache deduplication, and a Hugging Face token is optional for higher download limits.

## Next-Phase Prerequisites

- Keep Gemini disconnected until its backend-only secret handling, prompt/data retention policy, quality guard, and explicit user-facing behavior are implemented and tested.
- Independently review strategy wording and cited source references before treating them as specialist-approved guidance.
- If lower Python versions remain part of the supported matrix, run the pinned index build/retrieval suite on those interpreter versions before claiming matrix certification.
