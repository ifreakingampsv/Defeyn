# DESIGN.md — Defeyn

Design direction for the Defeyn marketing site. Owner-driven: the visual language is
modeled on illoca.unseen.co (Awwwards SOTD by Unseen Studio), explicitly requested by
the owner ("make it look like this") — R-30 satisfied by explicit ask. The language is
transferred and adapted to Defeyn's content, not pixel-copied.

## Identity

- **Product:** Defeyn, an AI tutor that drafts and teaches personal courses.
- **Concept:** a **drafting sheet**. Defeyn drafts courses the way an architect drafts
  plans: cream paper, graph grid, ink linework, cobalt accent, handwritten margin
  notes, live tool coordinates in the corner.
- **Logo:** DefeynMark — "D" stem + open particle bowl ending in an accent vertex dot
  (Feynman nod). Works at 16px.

## Palette (2 core + 1 accent; neutrals excluded per R-29)

Light ("drafting sheet"):
- **Cream paper** `#fdf2de` page with a subtle graph grid (`rgba(55,55,55,.05)` lines,
  28px cells). Grid purpose: the product drafts structured courses; the paper carries
  that identity (R-07, reason recorded).
- **Ink** `#262624`–`#45443f` text, `#373737`-family display.
- **Cobalt** `#3b60c5` accent (links, CTA, solid chips, user avatar). Reason: the
  reference brand color; passes AA on cream for text (5.2:1) and as a button fill
  with white text (5.7:1). Owner-selected, replaces the earlier chalk green.

Dark ("drafting table at night"):
- **Ink-navy** `#12172b` page, `#181f36` cards, `#1f2947` gradient depths.
- **Cream chalk** text `#f6f1e1`/`#d8d3c3`; bright cobalt accent `#8ca5f5` (≈8:1).
- Both themes ship fully working (R-34); toggle in the nav card, choice persisted
  (`defeyn-theme`), default dark, applied pre-paint.

## Typography

- **Instrument Sans** for display (kept from the build; a neo-grotesque very close in
  voice to the reference's F37 Analog). Hero runs huge: clamp(54px, 7.4vw, 96px),
  weight 500, leading 0.95, tracking -0.025em.
- **Space Mono** for micro-copy: nav links, corner coordinates, email, section
  kickers ("01 / SYLLABUS"), the WATCH IT TEACH link. Reason: the drafting-tool
  voice; every numeric/technical detail on a sheet is mono.
- **Caveat** for handwritten margin annotations ("PERSONALIZED", "not another
  chatbot") with hand-drawn arrows/underlines. Reason: the annotation layer is the
  reference site's signature gesture, adapted to Defeyn's voice.
- **Inter** stays for dense product-UI body text (readability at 13–15px).

## Motifs (identity layer)

1. **Cobalt duotone illustrations** (`DefeynDesk.tsx`, original drawings): framed
   full-bleed scenes in cobalt/cream/ink only — a learning desk with a city window,
   a student drafting a course map, floating course cards, an isometric
   "course building" rising from a blueprint sheet. Reason: the reference site's
   power comes from bold 2-color drawn scenes; Defeyn draws its own in the same
   language (owner-directed reference, R-30 satisfied).
2. **Graph-grid paper** on the body, visible between sections.
3. **Handwritten annotations** with arrows next to display headings; one per heading.
4. **Live corner coordinates** (X/Y cursor readout, mono, top-left) — responds to the
   pointer; purpose: drafting-tool identity (pointer-driven, not a loop).
5. **Hard offset shadows** (3px/3px ink) on the nav card, CTA, and demo window — the
   "printed element on paper" elevation language. Reason: paper world = printed
   cards, not floating glass.
6. Cobalt hand-underline under the key phrase of feature headings + mono section
   kickers ("01 / SYLLABUS") + chapter split layout (sticky text column, alternating
   sides, demo window as the chapter's full-height media).

## Dials

ENERGY 2 / RHYTHM 2 / MOTION 1

- ENERGY 2: big confident type, one accent, calm sections.
- RHYTHM 2: hero is typographic, demos are framed media blocks, cards vary; section
  kickers give the sheet its numbering.
- MOTION 1: hover states, pointer-following coordinates, and the product demos
  themselves. No scroll-jacking or choreography added (the reference site's heavy
  scroll/WebGL work was deliberately out of scope; noted as a known gap).
