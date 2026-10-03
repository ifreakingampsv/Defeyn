# Fresh start over data migration for v2

V2 replaces the session-blob data model (one session = one course/lesson/
whiteboard saved whole) with a per-object model (boards, cards, docs, edges).
Rather than write a converter for existing v1 sessions, v2 starts with an
empty v2 schema and leaves the v1 SQLite file (`server/defeyn.db`) in place
as a readable archive. At the time of the decision the data was two test
sessions and nothing the owner needed preserved, so converter work bought
nothing and would have forced legacy compromises into the new schema.

**Consequence:** v2 opens with no historical sessions; the old DB file is the
only record of v1 material.
