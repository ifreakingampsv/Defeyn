# 05: The Tutor spawns Cards on the Board

**What to build:** when the learner asks for notes, the Tutor condenses the current Lesson into Cards that appear on the Course's Board — per ADR-0003 these are snapshots of the Lesson text at creation time carrying a source Citation, never live mirrors; summaries are simply Cards whose content is bullets (one Card type). The chat's notes card links straight to the Board, completing the generation-to-canvas handoff that anchors the v2.0 "done" moment: *ask → learn → "give me notes" → drag them around.*

**Blocked by:** 02 (stable block IDs — Cards cite block IDs), 03 (the Board).

**Status:** ready-for-agent

- [ ] "Give me notes" produces Cards on the Course's Board, each with content and a source Citation to the Lesson block it came from
- [ ] Card text survives later Lesson regeneration unchanged (snapshot semantics)
- [ ] Clicking the notes card in the chat opens the Board
- [ ] Repeating notes generation leaves existing Cards intact (new Cards may append; nothing is corrupted or silently replaced)
- [ ] HTTP seam: generated Cards carry the owner's `userId` and the source Citation's block ID

## Comments
