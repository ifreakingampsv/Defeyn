# BACKEND.md — what the frontend clone leaves out, and where it plugs in

This repo ships the **Defeyn marketing page frontend** (React + TS + Vite + Tailwind)
plus a **working local backend** (`server/` — Fastify + SQLite + pluggable LLM;
see `server/README.md`) and a **mock product mode** for the no-server case.
Everything is committed; see git history for the milestones.

## Run locally

```bash
# terminal 1 — the backend (zero config works: local rule engine, SQLite file)
cd server && npm install && npm run dev          # http://localhost:8787

# terminal 2 — the frontend pointed at it (real auth + real persistence)
cd app && VITE_API_BASE_URL=http://localhost:8787 npm run dev
```

Without the server, the frontend runs the same product on the in-memory mock
(`VITE_API_BASE_URL` unset) — sign in with any details. With the server, the
login page asks for a password (login, auto-signup on unknown emails) and all
data lives in `server/defeyn.db`.

> **Serving note:** the app uses clean client-side routes (`/app/s/:id`,
> `/ai-tutor/:slug`). Whatever serves `app/dist` must rewrite unknown paths to
> `/index.html` (SPA fallback). `npm run dev` and `npm run preview` (vite) do
> this out of the box; a bare `python -m http.server` does **not** — deep links
> and refreshes will 404. One config line on Netlify/Vercel/nginx covers it.

## 1. Where the seam lives

All network access is funnelled through one interface:

```
app/src/services/
├── types.ts              # domain model (User, ChatMessage, Course, LessonDoc, WhiteboardGroup…)
├── api/
│   ├── TutorApi-shaped   # see types.ts → interface TutorApi
│   ├── client.ts         # fetch wrapper + SSE streamChat() helper (unused today)
│   ├── mockTutorApi.ts   # in-memory implementation that powers the page today
│   └── index.ts          # getTutorApi() factory — THE single switch point
└── mock/
    ├── demoData.ts       # scripted demo conversations (hero/goal/curriculum/whiteboard)
    └── exploreCourses.ts # the 9 "Explore what people are learning" cards
```

`getTutorApi()` (`app/src/services/api/index.ts`) currently returns
`mockTutorApi` unconditionally. When the backend exists: implement a
`realTutorApi` in a new file (e.g. `api/realTutorApi.ts`) using `client.ts`,
and make the factory return it when `import.meta.env.VITE_API_BASE_URL` is set
(the branch + console note are already there). `Home.tsx` needs no changes.

`.env.example` documents `VITE_API_BASE_URL` / `VITE_USE_MOCK_API`.

## 2. Services the real product needs (not built)

Since Phase 1, everything below has a **working mock** (localStorage store +
rule-based tutor in `src/services/mock/`) behind the same `TutorApi` contract —
the table describes what replaces it.

| Service | What it does | Frontend expectation |
|---|---|---|
| **Auth** | Real accounts. The mock (`src/services/auth.ts`) accepts any name/email, persists to localStorage; the workspace is gated by `RequireAuth`. | Replace `signIn/signOut/getCurrentUser` bodies; login page and guard need no changes |
| **Session/chat service** | Create sessions, persist messages, list/history, rename, delete | `TutorApi.createSession / listSessions / getSession / sendMessage / renameSession / deleteSession`; the mock store (`mock/store.ts`) mirrors the shape |
| **AI tutor service** | The actual LLM agent: lesson planning, tutoring replies, "Thought completed" traces, adaptive pacing, **citations**. The rule-based engine it replaces is `mock/fakeTutor.ts` — read it as the behavioral spec (goal→course, continue→lesson+progress, notes→whiteboard, feedback chips, citations). | `sendMessageStream(sessionId, text, onEvent)` emits `{type:'block', block}` events then `{type:'done', message}` — map these to the SSE shape in `client.ts streamChat()`. Blocks are the `MessageBlock` kinds (`text`, `thought`, `citations`, `lesson-progress`, `choices`…) |
| **Citations** | The agent cites the lesson parts it drew from: `{ kind: 'citations', items: [{ docId, blockIndex, label, quote? }] }`, `blockIndex` pointing into the `LessonDoc.blocks` array it generated. Validate indices server-side. | The workspace renders citation chips (chat) and a doc-header citations list; clicking scrolls to `data-block-index` and flashes the block — no further UI work needed |
| **Course/syllabus generation** | "Share your learning goal → personalized course" | Returns a `Course` (`topics[]` → `sections[]`). `fakeTutor.buildCourse()` shows the exact rendered shape |
| **Lesson generation** | Long-form lesson documents | `LessonDoc { blocks: DocBlock[] }` — see `fakeTutor.buildLesson()`; blocks get stable indices used by citations |
| **Whiteboard/notes generation** | "Turn each lesson into organized notes" | `WhiteboardGroup[]` → cards + summary notes — see `fakeTutor.buildNotes()` |
| **Regenerate** | Re-answer the last user turn | `TutorApi.regenerateLast(sessionId)` → `ChatMessage` (`POST /api/sessions/:id/regenerate`) |
| **Course pages** | The 9 cards link to `/ai-tutor/<slug>`; Phase 1 added real pages rendering the authored previews + "Start this course" (seeds a workspace session) | Content is `services/mock/exploreCourses.ts`; serve real per-slug data from the API |
| **Persistence** | Users, sessions, messages, courses, notes (Postgres or similar) | Replace `mock/store.ts` (localStorage blob) with the real store |
| **Watch-the-demo video** | The hero's "Watch it teach" link currently scrolls to the on-page demo; a hosted demo video can replace it | Swap the anchor href in `Hero.tsx` |
| **Analytics / cookie banner** | Optional | Not replicated |

## 3. Deliberate content simplifications (frontend-only)

- The **hero lesson document** and **curriculum article** carry the philosophy
  copy visible in the reference recording; sections further down the scroll use
  real headings with abbreviated body text. Swap in real content via the API.
- **Demo timelines are presentational**: the components in
  `app/src/components/demo/` decide *when* each message/scroll-step plays
  (`useLoopClock` + beat tables). The *content* already comes from the API
  layer; timing orchestration stays client-side. The workspace reuses the same
  panels live (no clock).
- Explore-card syllabus previews show Topic 0 + Topic 1 only (what is visible
  before the card's fade-out); the generated mock courses extend them to 7–8
  topics via `fakeTutor.buildCourse()`.
- Pricing / Download / Wiki sub-pages are not built; nav and footer links point
  at on-page anchors until those routes exist.
- The mock workspace stores everything in one localStorage blob
  (`defeyn-mock-db`): per-browser only, no cross-device sync, no multi-user.
- Design direction for the brand lives in `DESIGN.md` (logo concept, palette,
  typography, dials). The brand mark is `DefeynMark` in `app/src/components/icons.tsx`.

## 4. Running / building

```bash
cd app
npm run dev        # local dev
npm run build      # production build → app/dist
```

Deployment: static (`app/dist`) — any static host/CDN works. The backend, when
added, is a separate service; point `VITE_API_BASE_URL` at it.
