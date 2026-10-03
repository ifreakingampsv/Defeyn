# 06: Editable Lessons + the Tutor's append-mode

**What to build:** the Lesson pane becomes a plain rich-text editor (TipTap; the editor's built-in undo comes free and is included) for plain rich text only — bold/italic, headings, lists, links (image/math blocks are v2.1/later; the block schema must already accommodate them). Learner edits persist per-object. When the Tutor teaches the next Part it acts as a housemate, not an author: it reads the Lesson exactly as the learner has it, appends the new Part, and persists — never regenerating or overwriting. Citations resolve against the edited document: still correct after any edit, and explicitly "unavailable" when the learner deleted the cited block.

**Blocked by:** 02 (stable block IDs).

**Status:** ready-for-human

- [ ] Learner edits a Lesson, restarts the server → edits persisted
- [ ] Tutor "Continue" appends the next Part to the edited document; the learner's text is byte-identical before and after
- [ ] Citation chips land on the correct block after heavy edits; a deleted cited block renders as unavailable, never wrong
- [ ] Editor-level undo works within a document
- [ ] HTTP seam: document saves are per-object; a concurrent Tutor turn and learner save cannot clobber each other (turn lock + per-object writes)

## Comments

## Comments

- Implemented 2026-10-04 (commit 9c4aa34). Lesson pane is a TipTap editor
  (bold/italic/H2/H3/lists/links; StarterKit history = editor undo; block ids
  preserved as data-block-id anchors so citation flash targets survive any
  editing). New docs start at Part 1; each "Continue" APPENDS the next Part at
  the tail — the LLM prompt receives the current document (learner edits
  included) and is instructed never to rewrite; the local engine mirrors this.
- Persistence is per-object and conflict-checked: docs rows carry a version;
  the learner save sends baseVersion and a stale save is refused 409 with the
  server's current doc (the editor reconciles instead of clobbering). The
  tutor's append re-reads the row at write time, so a learner save that lands
  mid-turn survives byte-for-byte — both interleavings proven in
  `server/test/appendmode.test.mjs`.
- Citation behavior after heavy edits: chips resolve by block ID at display
  time (ticket 02 choke point); deleting the cited block makes the chip render
  explicitly unavailable (verified at the mechanism level in the suite —
  blockId no longer in the doc — and in the browser pass visually).
- Editor-level undo is TipTap history (free, included). Lists serialize to
  DocBlock paragraphs carrying markers (no list kind in the schema yet —
  deliberate; image blocks remain a v2.1 schema slot).

