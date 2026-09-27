# Report — Defeyn AI Tutor landing page

**Shipped:** A frontend replica of the reference AI-tutor landing page, evolved through three owner-directed passes: (1) rebranded to **Defeyn** (new logo, rewritten copy, zero source traces), (2) restyled to the **illoca drafting-sheet language**, and (3) the **pinned scroll-story depth**: an original cobalt/cream duotone desk illustration (`DefeynDesk`, full-bleed framed block with caption), the three features converted to illoca-style **chapters** (sticky text column with handwritten annotations, alternating sides, demo window as full-height scaled media with drafting frames), scroll-reveal animations, and an isometric "course building" model drawn into the illustration. Both light and dark themes fully working. React 19 + TS + Vite + Tailwind v4, fonts self-hosted, zero external requests. **Frontend only, by design** — everything server-side sits behind the `app/src/services/` seam. Read `BACKEND.md` and `DESIGN.md`.

**Deployed at:** http://localhost:45623/ (static build from `app/dist`; session-bound preview — redeploy or `npm run dev` if it sleeps)

**Verification state:** all 25 ids closed in `out/verify.jsonl` against fresh post-redesign captures (`out/cmp/*_rb.png`).
- **Pass (13):** S1, S4, S9, S13, S15, S18 (structure/typography), D1–D7 (all mechanisms re-verified on the shipped build: autoplay reveals, typing with caret, doc auto-scroll, card pop-in, sticky nav at 8 offsets, dropdown via hover + keyboard Enter + click, reset/replay).
- **Defer (12):** S2, S3, S5, S6, S7, S8, S10, S11, S12, S14, S16, S17 — ids certifying copy/brand/palette fidelity to the source, **intentionally superseded** by the owner's rebrand + redesign directions; layout/structure re-verified matching on fresh evidence in each cited composite.

**Known gaps:** the reference site's pinned WebGL canvas story was rebuilt as a DOM/scroll composition (chapter split layout, reveals, drawn illustration) rather than canvas-rendered; the illustrations are original flat duotone SVGs, not the reference's grainy rendered scenes. A true interactive WebGL 3D model was deliberately not added — if wanted, drop a .glb into `app/public/assets/models/` and wire three.js. Cursor coordinates are page-relative (reference tracks viewport-relative).

## Addendum (2026-09-28) — Phase 1 + contract re-certification
Phase 1 of PRODUCT_PLAN.md shipped: mock-auth login, interactive workspace
(3-pane shell, live chat, syllabus/lesson/whiteboard panes), rule-based fake
tutor over a localStorage store, /ai-tutor/:slug course pages, wired CTAs.
Browser-tested end to end (out/gui-test/). After the last app/src edit, all 13
pass ids (S1, S4, S9, S13, S15, S18, D1–D7) were re-shot from the deployed build
(fresh captures out/shots/*_p1.png, fresh recordings recordings/p1_*.mp4,
matched-beat composites out/cmp/*_p1.png) and re-judged with new verify.jsonl
rows; contract_audit.py reports 闭环 ✓ (all checks green).

## Addendum 2 (2026-09-28) — product front end complete (Phase 1.5)
Finished the mock product front end: **citations** (chat chips + doc-header
citations drawer -> click -> scroll to anchored block with highlight flash),
**cross-artifact navigation** (course chip -> syllabus, progress items and
whiteboard cards -> lesson part), **streaming replies** (block-by-block via the
new `sendMessageStream` contract, mock-streamed; real backend maps it to SSE),
**regenerate**, **session rename/delete**, and a ready-to-flip
`realTutorApi.ts` (endpoint map in BACKEND.md). Browser-tested end to end
(out/gui-test/p15_*.png); one real UI bug found and fixed during testing
(rename submit was killed by input blur). Contract re-certified after the
edits: fresh captures/recordings (out/shots/*_p2.png, recordings/p2_*.mp4,
out/cmp/*_p2.png), 13 ids re-judged, contract_audit.py 闭环 ✓.
