# 03: The Board — a real canvas with draggable Cards

**What to build:** every Course now has a Board, auto-created when the Course is drafted. In the workspace's right pane, the tab formerly labeled Whiteboard becomes **Board**: a canvas built on React Flow (per the spec — never hand-rolled drag/zoom/edges) themed to the existing design language. The learner creates their own Cards, types into them, drags them anywhere, deletes them behind an explicit confirmation, zooms and pans, and everything autosaves per-object and survives restart. Positions and grouping are stored as queryable data, ready for v2.1's tutor-reads-board promise. The landing page's scripted demo panels are forked from, not bent — zero landing-page edits.

**Blocked by:** 01 (v2 store foundation).

**Status:** ready-for-human

- [ ] Drafting a Course produces a Board with no learner action; the empty Board has a clear state
- [ ] Browser seam: create a Card, give it text, drag it, reload → position and text persisted
- [ ] Card deletion requires an explicit confirmation (no canvas undo exists) and is permanent after restart
- [ ] Zoom and pan work; the Board stays usable with 50+ Cards
- [ ] HTTP seam: Board/Card CRUD scoped to the owning user; autosave writes are per-object
- [ ] The tab reads "Board"; landing page untouched (contract audit stays green)

## Comments

## Comments

- Implemented 2026-10-04 (commit 66911b5). `@xyflow/react` v12 canvas in the
  workspace's right pane; tab relabeled **Board** (internal pane value
  unchanged). Drag stop autosaves the card row per object; create via header
  button or canvas double-click; in-place editing; delete behind an explicit
  AlertDialog (no canvas undo — the dialog says so); zoom/pan + dotted
  background; positions stay queryable server data. Empty board has a clear
  state. Landing demo panels untouched (forked, not bent). Mock mode gets the
  same Board through a derived adapter.
- HTTP-seam board/card CRUD + scoping + restart persistence covered by the
  ticket-01 suite; browser-seam interaction pass runs in the main thread.

