# HANDOFF.md — cold-start context for Defeyn

Read this before doing anything in this repo. It is the authoritative brief for
continuing work from a fresh clone — written so an agent (or human) on any
machine starts warm. **Keep it current**: when project state changes materially,
update this file and commit. A stale handoff is worse than none.

Last updated: 2026-10-04 (v2.0 build complete).

## What Defeyn is

An **AI tutor with a workspace**, born as a video2code replica of Heptabase's
AI-tutor *landing page* (58.8s recording, `recordings/heptabase-ai-tutor.mp4` —
the product UI was never in the source), then rebranded to Defeyn with the
"illoca drafting-sheet" design language (see `DESIGN.md`: cream/ink/cobalt,
Instrument Sans + Space Mono + Caveat, hard offset shadows, dark default).

Product loop: sign up → state a learning goal → the tutor drafts a course
(syllabus) → teaches topic-by-topic, generating lesson documents with a
progress checklist → answers carry citation chips that scroll-and-flash the
exact lesson block → condenses lessons into whiteboard note cards. Sessions
persist server-side.

## Repo map

- `app/` — React + TS + Vite + Tailwind frontend. Landing page (route `/`),
  login, workspace (`/app`, `/app/s/:id`), course pages (`/ai-tutor/:slug`).
  The seam that matters: `app/src/services/api/` — `getTutorApi()` returns
  `realTutorApi` when `VITE_API_BASE_URL` is set, else the in-memory mock
  (`mockTutorApi` + localStorage). `services/types.ts` is the domain contract.
- `server/` — Fastify + SQLite (Node 24 built-in `node:sqlite`) backend.
  Password auth + tokens, sessions CRUD, SSE streaming, pluggable LLM layer
  (`server/src/llm/`), tutor engine (`server/src/tutor/engine.ts`) with a
  deterministic local rule engine (`server/src/tutor/local.ts`) as fallback
  and behavioral spec. Endpoint map: `BACKEND.md`.
- `PRODUCT_PLAN.md` — v1 build plan (phases 1–4 are DONE; Phase 5 partial:
  pricing/download/wiki subpages + hosted demo video still open).
- `recordings/`, `out/` — video2code source recording and verification evidence.

## Running it

```bash
# backend — zero config works (local rule engine, no key needed)
cd server && npm install && npm run dev          # http://localhost:8787

# frontend pointed at the real backend
cd app && VITE_API_BASE_URL=http://localhost:8787 npm run dev
```

Without `VITE_API_BASE_URL` the app runs the same product on the in-memory
mock. Static hosting needs SPA rewrite of unknown paths to `/index.html`
(see BACKEND.md serving note).

**LLM provider**: `server/.env` (gitignored — never commit it; create from
`.env.example`). Currently wired to **Atria ASI**:
`OPENAI_BASE_URL=https://api.atria-asi.ai/v1`, `OPENAI_API_KEY=<owner's key>`,
`OPENAI_MODEL=Atria-Dawn-Preview`. Any OpenAI-compatible provider works the
same way; Ollama works with no key. No key → the local rule engine runs the
whole product deterministically.

## Verified state (2026-10-02)

- Backend verified end-to-end against Atria with a real key: auth (409/401
  paths), sessions CRUD, rename/delete, regenerate, SSE streaming, restart
  persistence, SQLite integrity. All four LLM pipelines proven with
  model-generated content: goal→course, continue→lesson+citations,
  question→tutor reply, notes→whiteboard.
- Hardening stack shipped (commit `17236b5`), all four fixes verified:
  1. **max_tokens caps raised**: tutor reply 4000, course/lesson 16000,
     notes 8000 (see provider quirks below for why).
  2. **SSE keepalive**: `: keepalive` comment lines every `KEEPALIVE_MS`
     (default 15000, 0 disables) during generation *and* queueing. The
     frontend SSE parser (`app/src/services/api/client.ts`) ignores comment
     lines — verified, no frontend change needed. A real 127s generation
     carried 126 pings; before this, proxies/idle-timeouts killed quiet
     connections while the turn completed server-side anyway.
  3. **Per-session FIFO turn lock** (`withSessionLock` in `routes.ts`)
     wrapping messages / messages/stream / regenerate, with session reads
     INSIDE the lock. Concurrent turns queue and see each other's persisted
     artifacts. This mitigates (not eliminates) `store.persistSession`'s
     whole-object last-writer-wins: v2 should move to per-object persistence.
     Note: on the stream endpoint, "session not found" arrives as a
     `{type:'error'}` event because headers are already sent.
  4. **`withLlmRetry`** (`engine.ts`): exactly one retry on validation
     failures (no HTTP status) and 429/5xx, honoring `Retry-After` (capped
     30s); immediate fallback on 401/403/404. `openai.ts` HTTP errors carry
     `status` / `retryAfterSeconds`.

## LLM provider facts (Atria-Dawn-Preview) — measured, not guessed

- It is a **reasoning model**: hidden thinking tokens are billed AND count
  toward `max_tokens`. Tight caps caused silent truncation → JSON parse
  failures → fallback (the reason the caps are now 16k). Atria allows caps
  up to 65,536; billing is on generated tokens, not the cap.
- Big JSON generations take **2–3 minutes**. Tiny calls are fast (~4s), so
  there is no queue/tier tax — it's thinking volume × output size.
- It occasionally returns a 2-part lesson; the schema demands ≥3
  (`LessonJson`), so validation fails → one retry now, then the local
  fallback lesson (template part titles "First principles / Core mechanics /
  A guided example / Review and practice" are the LOCAL engine's — if you
  see those in citations, a fallback happened).
- **Text-only** (no images/PDFs). Future PDF import must extract text
  server-side before the LLM sees it.
- 256K context. One model only (no faster in-house option). Per-account RPM
  shared across keys; 429 means rate exceeded OR quota exhausted; honor
  `Retry-After`.
- Streaming: the tutor engine calls `complete()` (non-streaming) for the
  structured JSON pipelines; only conversational text is paced to the client.
  The SSE keepalive covers the silent window. Streaming generation end-to-end
  is a v2 improvement.

## Gap list vs Heptabase (why v2 exists)

The AI-tutor loop is 100% of the demo recording but ~5% of Heptabase the
product. Six gaps, prioritized:

1. **The whiteboard is a read-only static grid** — no drag/canvas/connections
   (`WhiteboardPanel` renders generated cards; nothing is movable).
2. **No own-material import** — no PDFs, highlights, clippings; only
   AI-generated content exists.
3. **Nothing is editable** — lessons and cards are render-only.
   → Gaps 1–3 are what would make Defeyn *feel* like Heptabase.
4. No tags / backlinks / global search / journals / multiple boards.
5. Browser-only against one local server (no apps/sync/offline — though the
   server-authoritative design makes multi-device nearly free: just deploy).
6. No export.

## V2 — BUILD COMPLETE (2026-10-04)

All eight tickets of `.scratch/v2-workspace/` are implemented, each marked
`ready-for-human` with evidence in its file. What landed:

- **Per-object store** (ADR-0001): `server/defeyn-v2.db` (fresh schema, v1
  `defeyn.db` untouched archive). Sessions hold identity + UI state; docs
  (one stable row per course+topic, with a `version` column), boards (1:1
  with course, auto-created at draft), cards (snapshot content_json +
  optional citation + x/y), edges, whiteboards (v1 notes artifact, retired
  from the live flow). `persistSession` is gone — writes are per-object.
- **Stable block IDs** (ADR-0002): every Lesson block carries `blk_…` id
  (stampBlockIds, idempotent); Citations reference `blockId` only and the
  frontend resolves ID→position at display time (single choke point:
  `Workspace.resolveCitationView`); dead citations render unavailable and
  never navigate.
- **Board** (React Flow v12, `@xyflow/react`): the right pane's "Board" tab
  (pane VALUE stays `'whiteboard'` — label-only rename). Drag autosaves
  per-card; create (+ Card / double-click); in-place editing; delete behind
  explicit confirm (no canvas undo, no multi-select — scope frozen);
  connect via edge handles; edge removal confirms too.
- **Tutor append-mode** (ADR-0003 + housemate): new docs start at Part 1;
  each "Continue" APPENDS the next Part (LLM reads the current doc — learner
  edits included). Notes spawn snapshot Cards on the Board (one per Part +
  bullet summary card). Learner doc saves are version-checked (stale → 409
  with the current doc); the tutor's append re-reads the row at write time,
  so mid-turn learner saves survive byte-for-byte.
- **Editable Lessons**: TipTap (`@tiptap/react` + starter-kit + link) in
  `app/src/app/LessonEditor.tsx`; block ids ride as `data-block-id` attrs.
  Lists flatten to paragraphs (image blocks remain a v2.1 schema slot).
- **Markdown export** (.md menu in the pane rail): course syllabus / lesson
  / board (cards + connections as text). Pure reads, owner-scoped.
- **Cascade delete**: sidebar action → confirm names Course + Board + N
  Cards → single atomic DELETE (FK cascades; sessions keep chat).

Testing: committed HTTP-seam E2E suite — `cd server && npm test` (81 tests,
~9s; node:test; boots the real server on random ports with throwaway DBs,
`LLM_PROVIDER=local`, provider keys stripped). Browser seam verified by
scripted passes; evidence per ticket in `.scratch/v2-workspace/issues/`.

New endpoints (all owner-scoped; see BACKEND.md for the full map):
`GET /api/courses/:id/board` · `POST /api/boards/:id/cards` ·
`PATCH|DELETE /api/cards/:id` · `POST /api/boards/:id/edges` ·
`DELETE /api/edges/:id` · `PATCH /api/sessions/:id/doc` ·
`GET /api/courses/:id/export|lessons/:n/export|board/export|cascade-info` ·
`DELETE /api/courses/:id`.

Quick-model slot (hybrid-ready, UNPOPULATED): `QUICK_OPENAI_*` env populates
`quickLlm` (`server/src/llm/index.ts`); `engine.quickModel()` falls back to
the main provider. Populating it later is config-only.

Mock mode (no server) implements the whole v2 seam too (boards via a derived
adapter over note groups; saveLessonDoc; exports) — one divergence: mock
lesson "Continue" still writes v1-style whole docs instead of appending.

## Gotchas that will bite a fresh session

- **Stamp block IDs exactly once.** The engine stamps appended blocks and
  hands the SAME stamped array to both the in-memory doc (for citations
  emitted during the turn) and the persistence channel; stamping twice
  (two independent stampBlockIds calls) desyncs citations from the stored
  row — this exact bug was caught by the E2E suite.
- **The test port band is a TOCTOU zone**: parallel test files can steal a
  port between the free-port probe and the server bind; helpers.mjs retries
  on EADDRINUSE. Orphaned test servers from killed runs hold 8790–8980 —
  kill by PID from `ss -tlnp` (never pkill by pattern).
- **Local-engine turns are near-instant** (no artificial pacing in the
  continue path): tests that assume "mid-turn" timing must tolerate both
  interleavings.

- **Never edit `app/src` without budgeting a video2code contract re-shoot.**
  The landing page is verified against the source recording (25 replication
  ids); a stop-hook enforces `python3 $(cat .v2c/plugin_root)/skills/
  video2code/scripts/contract_audit.py` staying green after any app/src edit.
  Requires the video2code plugin state (`.v2c/`, gitignored, machine-local).
- `server/.env` holds the API key — gitignored. If AI responses look
  template-dumb, the key is missing and the local rule engine is answering.
- Local-engine fingerprints (so you can tell fallback from real AI): course
  title = goal echoed verbatim, lesson parts = the four PART_TITLES above.
- `pkill -f` patterns matching your own command line will kill your own
  script; `fuser -k 8787/tcp` is the safe way to stop the dev server.
- Commit style: sentence-case, descriptive one-liner + body. Remote:
  `git@github.com:ifreakingampsv/Defeyn.git` (SSH works; `gh` CLI is NOT
  authenticated on the original machine).

## Doc map

`BACKEND.md` — endpoints + seam · `PRODUCT_PLAN.md` — v1 plan/history ·
`DESIGN.md` — brand/design language · `server/README.md` — server runbook ·
`HANDOFF.md` — this file.
