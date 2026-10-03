# 01: V2 store foundation — per-object schema swapped in, product still green

**What to build:** the Tutor product keeps working exactly as a learner knows it — signup/login, Sessions, streamed chat, Course drafting, Lessons with Citations, notes — but everything now persists in a new per-object store: a fresh schema (per ADR-0001, no migration) holding Board, Card, Edge, and Lesson-document concepts alongside Course/Session/Message, every object owned by its user, and whole-blob saves replaced by per-object persistence. The Tutor engine gains an empty second "quick model" slot (hybrid-ready, unpopulated — single-provider behavior unchanged). The v1 database file is never written again and stays as a readable archive. This is the prefactor ticket: make the change easy, then make the easy change.

**Blocked by:** None (can start immediately).

**Status:** ready-for-human

- [x] Full HTTP-seam E2E suite passes against a running server on a fresh database: auth (409/401 paths), Session CRUD + rename/delete, regenerate, SSE streaming with keepalive, restart persistence
- [x] Every persisted object carries a `userId`; a different account's token cannot read or mutate it
- [x] Mutating one Artifact no longer rewrites unrelated Artifacts of the same Session (per-object persistence closes the concurrent-turn overwrite race structurally)
- [x] First run creates the new schema empty; the v1 database file is never touched
- [x] Tutor engine exposes the unpopulated quick-model slot; existing Atria single-provider flow unchanged
- [x] Typecheck green; zero landing-page changes (no contract re-shoot needed)

## Comments

- Implemented 2026-10-04. Committed E2E harness at `server/test/` (61 tests,
  ~9s, `cd server && npm test`): boot/restart helpers, throwaway temp DBs,
  `LLM_PROVIDER=local` only. Scenarios S1–S10 map to the acceptance criteria.
- Store rewrite: sessions hold identity + UI state only; docs (one row per
  course+topic, stable id), boards (1:1 with course, auto-created at draft),
  cards, edges, and the v1 notes artifact as its own `whiteboards` row (until
  tickets 03/05) each save to their own row. `persistSession` is gone.
- Default DB file is now `defeyn-v2.db`; `server/defeyn.db` is never opened
  for writing and stays as the v1 archive (ADR-0001). Suite asserts the
  default filename and hash-verified the archive untouched.
- New owner-scoped endpoints (schema+API now, UI in 03+): `GET
  /api/courses/:courseId/board`, card create/patch/delete, edge
  create/delete (self-edge 400, cross-board 400, duplicate 409).
- Quick-model slot: `QUICK_OPENAI_*` env populates `quickLlm` (`llm/index.ts`);
  `engine.quickModel()` accessor added; null by default — single-provider
  behavior unchanged.
- The suite caught two REAL pre-existing cross-user scoping bugs, both fixed:
  cross-user session DELETE wiped the victim's messages (204), and
  cross-user session PATCH returned 204 instead of 404.
- Final: `tsc --noEmit` clean (server + app), `npm test` 61/61, landing page
  untouched (no app/src edits in this ticket).
