# 08: Course deletion cascade

**What to build:** deleting a Course removes everything that belonged to it — its Board, the Cards on that Board, and their Edges — through one explicit confirmation that names exactly what goes ("this Course, its Board, and N Cards"), per the grill decision. Cancel leaves everything intact. There is no standalone "delete Board" action in v2.0 (Boards are 1:1 with Courses). Sessions keep their existing, separate delete behavior.

**Blocked by:** 03 (the Board), 06 (editable Lessons — the confirm surface shows the full picture only after both exist).

**Status:** ready-for-human

- [ ] The confirmation dialog names the Course, its Board, and the Card count before anything is deleted
- [ ] Cancel deletes nothing
- [ ] After confirmation: Course, Board, Cards, and Edges are all gone; nothing orphaned remains (no Cards pointing at a dead Board)
- [ ] HTTP seam: the cascade is a single atomic operation scoped to the owning user
- [ ] No standalone Board-delete action exists anywhere in v2.0

## Comments

## Comments

- Implemented 2026-10-04 (server cascade in 2eae5ba; UI in 9c4aa34). The
  sidebar's active-session actions include "Delete course"; clicking fetches
  the cascade info and the confirm dialog names the Course, its Board and the
  Card count; Cancel deletes nothing; confirm runs the single atomic DELETE
  (FK cascades; sessions keep chat history with the course link nulled). No
  standalone Board-delete exists anywhere. E2E in
  `server/test/cascade.test.mjs` covers the info, the foreign-user 404s, the
  cascade completeness (nothing orphaned), and restart persistence.

