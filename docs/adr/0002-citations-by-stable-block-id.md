# Citations reference stable block IDs, never positions

Every block of a Lesson document gets a stable identifier at creation, and
Citations (from tutor answers and from generated Cards) point at that ID.
V1 pointed citations at array indices (`blockIndex`), which silently rots the
moment users can edit documents: any insert or delete shifts every later
index. Since v2 makes lessons editable, index-based citations were untenable.

Decided before the editor exists so the ID column is in the schema from day
one — retrofitting IDs onto an existing editable corpus would be a migration.
The cost is one extra field per block, forever.

**Consequence:** all citation rendering resolves IDs to current positions at
display time; a citation whose block was deleted by the user renders as
unavailable rather than pointing somewhere wrong.
