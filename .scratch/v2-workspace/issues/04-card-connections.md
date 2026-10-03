# 04: Connect Cards with arrows

**What to build:** the learner connects any two Cards on a Board with an arrow and can remove connections; Edges persist like everything else and are stored as queryable data, so a connection is a first-class fact about the learner's thinking (not pixel decoration). This completes the learner's concept-map ability over their own material.

**Blocked by:** 03 (the Board).

**Status:** ready-for-human

- [ ] Browser seam: connect two Cards; the arrow renders; reload → the Edge persists
- [ ] Removing an Edge persists after restart
- [ ] A Card can hold multiple Edges; a Card cannot connect to itself
- [ ] HTTP seam: Edge CRUD scoped to the owning user; an Edge between Cards on different Boards (or different users) is impossible

## Comments

## Comments

- Implemented 2026-10-04 (commit f756598). Handles appear at Card edges on
  hover/selection; drag-to-connect with self-connection blocked twice (drag
  validity + onConnect), exact ordered duplicates short-circuit locally,
  reverse pairs allowed, multiple edges per Card supported. Edge removal uses
  the same explicit-confirm pattern as Card deletion. Server rules (409
  duplicate, 400 self/cross-board, cascade on card delete) were already
  covered by the ticket-01 suite; failure surfacing is an inline auto-dismiss
  notice. Verified by app typecheck + production build; browser interaction
  pass runs in the main thread (edge persistence across reload included).

