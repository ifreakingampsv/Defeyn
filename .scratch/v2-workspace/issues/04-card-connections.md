# 04: Connect Cards with arrows

**What to build:** the learner connects any two Cards on a Board with an arrow and can remove connections; Edges persist like everything else and are stored as queryable data, so a connection is a first-class fact about the learner's thinking (not pixel decoration). This completes the learner's concept-map ability over their own material.

**Blocked by:** 03 (the Board).

**Status:** ready-for-agent

- [ ] Browser seam: connect two Cards; the arrow renders; reload → the Edge persists
- [ ] Removing an Edge persists after restart
- [ ] A Card can hold multiple Edges; a Card cannot connect to itself
- [ ] HTTP seam: Edge CRUD scoped to the owning user; an Edge between Cards on different Boards (or different users) is impossible

## Comments
