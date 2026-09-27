# PRODUCT_PLAN.md — from landing page to working product

Status as of 2026-09-19: the repo ships the **marketing/landing page only** (single
route `/`, verified against the source recording). The actual product — the app
where a user logs in, states a goal, chats with the tutor, reads generated
lessons, and gets whiteboard notes — is **not built**. No backend, no AI: every
"AI moment" on the landing page is a scripted replay of fixtures
(`services/mock/demoData.ts` + `useLoopClock`), and `mockTutorApi` rejects all
real product calls. `BACKEND.md` remains the backend contract; this file is the
build plan for everything above and around it.

Important provenance note: the source recording (`recordings/heptabase-ai-tutor.mp4`,
58.8s) captured **only the landing page**. The real product workspace was never
recorded — so the operating UI cannot be "replicated"; it must be designed fresh
or captured in a second recording (Phase 0 decision).

## Phase 0 — Decide the operating-UI source (decision, no code)

- **Option A (recommended): design Defeyn's own workspace** by scaling up the
  demo panels that already exist (`ChatPanel`, `DocPanel`, `WhiteboardPanel` are
  miniature versions of the product's 3-pane layout). Consistent with the rebrand;
  no new recording needed.
- **Option B: record the real Heptabase AI Tutor product** and replicate it via
  the video2code pipeline again (drop the recording in `recordings/`).

## Phase 1 — Interactive product shell, mock-driven (frontend only) ✅ DONE (2026-09-19)

Make the product clickable with zero AI. Biggest frontend chunk.

**Shipped:**
- Router: `/login`, `/app`, `/app/s/:sessionId`, `/ai-tutor/:slug` (+ wildcard
  redirect, scroll restoration, `RequireAuth` guard that round-trips through
  /login and returns you to where you were headed).
- Workspace: 3-pane app shell — session sidebar (create/history/age labels),
  live chat pane with working input (Enter to send, choice chips clickable,
  "Defeyn is thinking…" state), right pane with Syllabus/Lesson/Whiteboard tabs.
- Mock auth: any name/email signs in (`services/auth.ts`); sign-out from the
  workspace header.
- `mockTutorApi` upgraded from reject-stubs to a full implementation over a
  localStorage store (`mock/store.ts`) with a rule-based fake tutor
  (`mock/fakeTutor.ts`): goal→8-topic course (authored previews kept verbatim
  for explore-course seeds), continue→lesson parts with 4-step progress
  checklist, notes→whiteboard groups, question answering, "Too hard"/"Not what
  I want" feedback handling. Everything survives reload.
- Explore cards → real course pages (persona, goal headline, full preview
  syllabus, "Start this course" → seeded live session).
- Landing CTAs wired: nav "Log in"/"Start learning", hero + CTA "Start learning
  today" → /app; cards → /ai-tutor/:slug (were dead anchors / 404s before).
- Fixes found in browser testing: vite `base` made absolute (relative './'
  broke asset loading on nested routes after refresh), section-description
  variety in generated courses, course-page headline derivation.
- Browser-tested end to end (8 test points, evidence in `out/gui-test/`).
- Hosting note: static hosts must SPA-rewrite unknown paths to /index.html
  (`npm run preview` does it; see BACKEND.md serving note).

Original scope notes:
- ~~Promote the demo components from `components/demo/` into interactive
  views~~ — done by reusing them: `ChatPanel`'s renderer (exported
  `MessageRow`/`BlockView`, choice chips now clickable), `DocPanel`,
  `SyllabusPanel`, `WhiteboardPanel` render live workspace artifacts.
- The seam (`getTutorApi()`) stayed the single switch point, as planned.

## Phase 2 — Backend foundation (no AI yet)

- Node service (Fastify or Express) + Postgres. Implement the endpoints implied
  by `TutorApi` (`services/types.ts`) and enumerated in `BACKEND.md`:
  auth, sessions CRUD, message history, courses/lessons/notes storage.
- Auth: email+password (bcrypt + JWT) or OAuth; `/login` page wired to it.
- SSE endpoint shape already sketched in `services/api/client.ts` (`streamChat`).
- Frontend: implement `realTutorApi.ts` behind `VITE_API_BASE_URL`; flip the
  factory. `Home.tsx` and the workspace need no refactor — that is the point of
  the seam.

## Phase 3 — AI tutor core (the chat agent)

- LLM provider integration (OpenAI/Anthropic/local; one adapter interface).
- Tutor agent: system prompts for Socratic tutoring; **streaming** replies over
  the SSE endpoint; structured output matching `MessageBlock`
  (`thought`, `step`, `lesson-progress`, `choices`, `page-created`…) so the
  existing renderers just work.
- Feedback chips become real: "Too hard" / "I have questions" / "Not what I
  want" feed the agent and change the next reply (adaptive pacing).
- Grounding: replies constrained to the user's course context.

## Phase 4 — Generation pipelines (one per marketing demo)

Each pipeline emits the types already defined in `services/types.ts`; the mock
fixtures in `demoData.ts` are the schemas.

1. **Goal → syllabus**: free-text goal in, structured `Course` (topics →
   sections) out; drives "course syllabus created" chip + syllabus panel.
2. **Syllabus → lesson**: long-form `LessonDoc` (h1/h2/h3/p blocks) per topic;
   drives the lesson reader; "Part 2 is ready" flow.
3. **Lesson → whiteboard notes**: `WhiteboardGroup[]` (cards + summary note);
   drives the whiteboard view.
- Lesson-progress tracking (0/4 → 1/4) persisted per user.

## Phase 5 — Product completeness & marketing wiring

- Explore cards → real `/ai-tutor/:slug` pages (API-backed).
- Pricing / Download / Wiki subpages (nav links are anchors today).
- Hosted demo video replacing the "Watch it teach" scroll link.
- Streaming polish: typing indicator, thought-trace expansion, error/retry.
- Analytics, rate limits, abuse guards, cost caps on LLM calls.

## Sizing (relative share of remaining effort)

Phase 1 ≈ 35% · Phase 2 ≈ 20% · Phase 3 ≈ 20% · Phase 4 ≈ 20% · Phase 5 ≈ 5%.
Phase 1 is pure frontend and unblocks everything else for demo purposes; Phases
2–4 are mostly backend/AI work on the existing contract.
