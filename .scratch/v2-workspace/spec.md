# Spec: V2 — The Defeyn Workspace (user-owned Artifacts on a Board)

Status: ready-for-agent
Created: 2026-10-04 (synthesized from the grill-with-docs session of 2026-10-03/04)
Governing docs: `CONTEXT.md` (vocabulary), `docs/adr/0001` (fresh start), `docs/adr/0002` (stable-ID Citations), `docs/adr/0003` (Cards are snapshots), `HANDOFF.md` (project state)

## Problem Statement

The learner uses Defeyn to learn: they state a Goal, the Tutor drafts a
Course, teaches it Lesson by Lesson, and condenses material into notes. But
everything the Tutor writes is a *display*, not *material the learner owns*:

- Lessons are locked documents — the learner cannot fix a clumsy sentence,
  add their own insight, or record their own example where it belongs.
- The "whiteboard" is a fixed grid of generated cards — the learner cannot
  move anything, add their own thoughts, or record how two ideas relate.
- Review is passive re-reading. The acts that turn material into
  understanding — rearranging, connecting, annotating, self-organizing —
  are impossible.
- The learner's work is locked inside the app; there is no way to take it
  out.

The result: Defeyn teaches, but the learner cannot *think with* what it
teaches.

## Solution

The learner's Course gets a **Board**: a real canvas where the Tutor's
generated note Cards appear as draggable, editable, connectable objects —
right alongside Cards the learner writes themselves. Lessons become editable
documents the Tutor appends to (never overwrites), so Tutor output and
learner edits coexist. Citations survive any amount of editing because they
point at stable block identities, not positions. Every Course can be
exported to Markdown, so nothing is locked in. The Tutor remains the front
door ("bring a Goal"); the workspace is where the learner lives afterward.

The v2.0 "done" moment: *ask for a Course, then drag its generated notes
around a real canvas and connect them* — live, with autosave.

## User Stories

1. As a learner, I want a Board created automatically when my Course is drafted, so that generated notes have a home without any setup step.
2. As a learner, I want each Tutor-generated note to appear as a Card on that Board, so that the material becomes mine to arrange.
3. As a learner, I want to drag any Card anywhere on the Board, so that I can arrange ideas in the way that makes sense to me.
4. As a learner, I want to create my own Cards on the Board, so that my own thoughts sit alongside the Tutor's.
5. As a learner, I want to delete a Card with an explicit confirmation, so that I can clean up without fear (there is no canvas undo).
6. As a learner, I want to zoom and pan the Board, so that I can see the whole map or focus on one cluster.
7. As a learner, I want to connect two Cards with an arrow, so that I can record how ideas relate.
8. As a learner, I want my arrangement saved automatically as I work, so that closing the browser loses nothing.
9. As a learner returning after days, I want the Board exactly as I left it — positions, arrows, Card text — so that my thinking accumulates instead of resetting.
10. As a learner, I want to edit my Course's Lesson documents in place, so that I can fix, trim, or extend the Tutor's text with my own understanding.
11. As a learner, I want the Tutor to append the next Part to my edited Lesson without overwriting anything I wrote, so that Tutor output and my edits coexist.
12. As a learner, I want Citations on tutor answers and generated Cards to land on the correct passage even after I have heavily edited the Lesson, so that references never rot.
13. As a learner, I want a Citation to show as unavailable rather than point somewhere wrong when I deleted the passage it cited, so that I am never misled.
14. As a learner, I want generated Cards to keep the text they were created with even if the Tutor later rewrites the Lesson, so that my notes are what I captured at the time.
15. As a learner, I want every generated Card to remember which Lesson passage it came from, so that I can go back to the source.
16. As a learner, I want my own Cards to carry no Citation, so that I can tell at a glance what came from the Tutor and what came from me.
17. As a learner, I want a lesson summary to be a Card with bullet content (like any other Card), so that review is a glance and there is only one thing to learn.
18. As a learner, I want the Board to live in the existing right-hand pane (where the "whiteboard" tab was), so that the chat-driven flow of the product is unchanged.
19. As a learner, I want to open the Board straight from the chat (course and notes cards in the conversation), so that the Tutor-to-canvas loop is one click.
20. As a learner, I want to export a Course, a Lesson, or a Board to Markdown, so that my work is never locked inside the app.
21. As a learner, I want deleting my Course to be one explicit confirmation that names exactly what goes (the Board and how many Cards), so that cleanup is safe and honest.
22. As a learner, I want everything I create stored under my account, so that my material is mine (and a future multi-user version stays possible).
23. As a learner, I want Tutor answers to keep streaming with the same reliability as before (keepalive, queued turns), so that the new workspace never makes the Tutor feel less dependable.
24. As the Tutor, I want the Board's structure (positions, connections, groupings) stored as queryable data from day one, so that v2.1 can teach me to read the learner's arrangement — even though I do not use it yet.

## Implementation Decisions

**Data model (fresh start — ADR-0001).** A new per-object schema replaces
the v1 session-blob store: **Board** (1:1 with a Course, auto-created at
Course creation), **Card** (Board member; snapshot body; optional Citation;
creator — Tutor or learner), **Edge** (arrow between two Cards), **Lesson**
documents whose blocks carry **stable block IDs** assigned at creation
(ADR-0002), plus the existing Course/Session/Message concepts. Every object
carries a `userId`. The v1 SQLite file remains on disk as a readable
archive; no converter is written. Session persistence moves from
whole-object saves to per-object persistence (the v2 model structurally
retires the last-writer-wins overwrite hazard the per-session turn lock
currently mitigates).

**Citations (ADR-0002).** Tutor answers and generated Cards cite block IDs;
rendering resolves ID → current position at display time; a cited block
that no longer exists renders as explicitly unavailable.

**Cards (ADR-0003).** Generated Cards are snapshots of the Lesson text at
creation time plus a source Citation — never live mirrors. Exactly one Card
type exists; a summary note is a Card whose content is bullets. Learner
Cards carry no Citation.

**Canvas.** Built on React Flow (do not hand-roll drag/zoom/edges), themed
to the existing design language. Interactions in v2.0: drag, create, delete,
zoom/pan, simple arrows. Deletion always confirms. **No canvas undo/redo and
no multi-select in v2.0.** Autosave is debounced and per-object. Positions,
edges, and grouping data are stored queryable (not baked pixels) so v2.1's
"tutor reads the Board" feature needs no migration.

**Editor.** TipTap for Lesson documents and Card bodies; the editor's
built-in undo is included. v2.0 is plain rich text (bold/italic, headings,
lists, links); the block schema is designed so image blocks (v2.1) and
math/code (later) slot in without migration.

**Tutor write-mode.** The Tutor becomes a housemate, not an author: to teach
the next Part it reads the Lesson as it currently exists (learner edits
included), appends the new Part, and persists — never regenerating or
overwriting existing content.

**LLM.** Ship single-provider (the existing Atria configuration and its
hardening stack — keepalive, per-session turn lock, one retry with
Retry-After — unchanged). The engine gains a second, empty "quick model"
slot so enabling a fast model later is a configuration addition, not a
rewrite.

**Shell.** The 3-pane layout is unchanged; the Whiteboard tab becomes the
Board. Chat cross-links (course chip → syllabus, notes cards → Board) keep
working against the new objects.

**Deletion.** Deleting a Course cascades to its Board, Cards, and Edges via
a single explicit confirmation that names what goes. No standalone
"delete Board" action exists in v2.0 (Boards are 1:1 with Courses).

**Export.** A naive Markdown serializer for Course (syllabus), Lesson, and
Board (Cards + connections as text) ships last in v2.0, once the object
model exists.

**API.** New server endpoints for Boards, Cards, Edges, document editing,
and export, following the existing route/auth patterns and extending the
existing frontend API contract. The generation pipelines keep emitting the
same structured blocks; notes generation additionally spawns Cards on the
Course's Board.

## Testing Decisions

A good test checks **external behavior at a seam, never internals** — no
test asserts on component state, store shapes, or provider specifics.

Two seams (owner-approved), and only two:

1. **The HTTP API (primary).** All server behavior is tested through real
   requests against a running server on a throwaway database: object CRUD,
   autosave persistence and restart survival, Citation resolution after
   heavy Lesson edits (including the deleted-block case), Tutor append-mode
   preserving learner edits, cascade delete naming what goes, export output
   shape, per-user scoping, and the guarantee that Lesson regeneration does
   not mutate existing Cards.
   *Prior art:* the backend verification suites (auth/session E2E, the
   429-stub retry test, the lock-serialization test) — same harness, same
   style.
2. **The browser (secondary, only where feel matters).** Canvas drag/
   connect/zoom, confirmation dialogs, the generation-to-Board handoff, and
   editor interactions are verified at the browser level.
   *Prior art:* the landing-page GUI test rounds (evidence in `out/gui-test/`).

Not tested: React Flow internals, TipTap internals, or the LLM provider
itself (stubbed, as in the 429-stub tests).

## Out of Scope

- Canvas undo/redo and multi-select (fast-follow once real usage shows the need; undo ≈ doubles canvas work)
- Image blocks (v2.1) and math/code blocks (later) — schema-ready only
- The Tutor reading or using Board structure (v2.1 promise; data stored now)
- Tags, backlinks, global search, card library, multiple Boards (organization phase)
- PDF import → highlights → Cards (phase 6)
- Hybrid LLM activation (the slot exists; populating it is a config change)
- Hosted multi-user, offline mode, native apps, web clipper, collaboration
- Landing-page changes (any edit there requires a video2code contract re-shoot)
- Pricing/download/wiki subpages, hosted demo video (v1 Phase 5 leftovers)
- Migrating v1 session data (ADR-0001)

## Further Notes

- Vocabulary is governed by `CONTEXT.md`: say **Board** (not "whiteboard"),
  **Card** (not "note"), **Citation** (not "link"), **Artifact** (not
  "content"). The UI's "Whiteboard" tab label is renamed to "Board" as part
  of v2.
- The three ADRs are binding; if implementation hits a wall that argues for
  breaking one, surface the contradiction explicitly instead of silently
  deviating.
- Effort context from planning: roughly 6–10 focused weekends across the
  whole v2 arc, with canvas and editing carrying most of it. Implementation
  is expected to fan out across parallel sub-agents where files don't
  collide (owner directive) — keep verification gates (typecheck, contract
  audit where app/ is touched, the two testing seams) in the main thread.
- The v1→v2 frontend seam rule stands: the shared demo panels in the
  landing page stay scripted replays; live workspace views fork from them
  rather than bending one component to both masters.
