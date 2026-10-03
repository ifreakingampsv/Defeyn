# 02: Lessons get stable block IDs; Citations resolve by ID

**What to build:** Lesson generation — both the LLM pipelines and the local rule engine — stamps every block with a stable ID at creation, and every Citation (on tutor answers and generated Artifacts) references that ID instead of an array position (ADR-0002). Rendering resolves ID → current position at display time. No visible product change: this is the load-bearing prefactor that makes editable Lessons safe, and it must land before the editor exists so IDs are in the schema from day one.

**Blocked by:** 01 (v2 store foundation).

**Status:** ready-for-agent

- [ ] Every newly generated Lesson block carries a persistent ID; IDs survive server restart (persisted with the block)
- [ ] Citation chips open the Lesson pane and flash the correct block, resolved via ID rather than position
- [ ] Removing a block from a Lesson document at the store level makes its Citation render as explicitly unavailable — never as a wrong passage
- [ ] Existing streaming, generation, and E2E behavior unchanged (regression suite green)

## Comments
