# 01: V2 store foundation — per-object schema swapped in, product still green

**What to build:** the Tutor product keeps working exactly as a learner knows it — signup/login, Sessions, streamed chat, Course drafting, Lessons with Citations, notes — but everything now persists in a new per-object store: a fresh schema (per ADR-0001, no migration) holding Board, Card, Edge, and Lesson-document concepts alongside Course/Session/Message, every object owned by its user, and whole-blob saves replaced by per-object persistence. The Tutor engine gains an empty second "quick model" slot (hybrid-ready, unpopulated — single-provider behavior unchanged). The v1 database file is never written again and stays as a readable archive. This is the prefactor ticket: make the change easy, then make the easy change.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Full HTTP-seam E2E suite passes against a running server on a fresh database: auth (409/401 paths), Session CRUD + rename/delete, regenerate, SSE streaming with keepalive, restart persistence
- [ ] Every persisted object carries a `userId`; a different account's token cannot read or mutate it
- [ ] Mutating one Artifact no longer rewrites unrelated Artifacts of the same Session (per-object persistence closes the concurrent-turn overwrite race structurally)
- [ ] First run creates the new schema empty; the v1 database file is never touched
- [ ] Tutor engine exposes the unpopulated quick-model slot; existing Atria single-provider flow unchanged
- [ ] Typecheck green; zero landing-page changes (no contract re-shoot needed)

## Comments
