# 05: The Tutor spawns Cards on the Board

**What to build:** when the learner asks for notes, the Tutor condenses the current Lesson into Cards that appear on the Course's Board — per ADR-0003 these are snapshots of the Lesson text at creation time carrying a source Citation, never live mirrors; summaries are simply Cards whose content is bullets (one Card type). The chat's notes card links straight to the Board, completing the generation-to-canvas handoff that anchors the v2.0 "done" moment: *ask → learn → "give me notes" → drag them around.*

**Blocked by:** 02 (stable block IDs — Cards cite block IDs), 03 (the Board).

**Status:** ready-for-human

- [ ] "Give me notes" produces Cards on the Course's Board, each with content and a source Citation to the Lesson block it came from
- [ ] Card text survives later Lesson regeneration unchanged (snapshot semantics)
- [ ] Clicking the notes card in the chat opens the Board
- [ ] Repeating notes generation leaves existing Cards intact (new Cards may append; nothing is corrupted or silently replaced)
- [ ] HTTP seam: generated Cards carry the owner's `userId` and the source Citation's block ID

## Comments

## Comments

- Implemented 2026-10-04 (commit 9c4aa34). The notes turn condenses the open
  Lesson into snapshot Cards on the Course's Board — one per Part (citation =
  that Part's stable block ID, quote = the part's opening text) plus a bullet
  summary Card (one Card type, ADR-0003). Cards are laid out after existing
  ones; repeated notes turns append without corrupting. The chat reply carries
  a page-created block whose target opens the Board. Card text is a stored
  snapshot: later appends/topic changes never rewrite it. HTTP seam verified
  in `server/test/appendmode.test.mjs` + tutor.test (citations resolve against
  the persisted doc; repeat turn appends; existing content byte-identical).
- Known deviation (deliberate): the localStorage MOCK still drives its Board
  from derived note groups (citation-less) instead of spawning true Cards —
  the real HTTP flow is the contract; noted for a fast-follow if mock parity
  matters.

