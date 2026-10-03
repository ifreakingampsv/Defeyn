# 06: Editable Lessons + the Tutor's append-mode

**What to build:** the Lesson pane becomes a plain rich-text editor (TipTap; the editor's built-in undo comes free and is included) for plain rich text only — bold/italic, headings, lists, links (image/math blocks are v2.1/later; the block schema must already accommodate them). Learner edits persist per-object. When the Tutor teaches the next Part it acts as a housemate, not an author: it reads the Lesson exactly as the learner has it, appends the new Part, and persists — never regenerating or overwriting. Citations resolve against the edited document: still correct after any edit, and explicitly "unavailable" when the learner deleted the cited block.

**Blocked by:** 02 (stable block IDs).

**Status:** ready-for-agent

- [ ] Learner edits a Lesson, restarts the server → edits persisted
- [ ] Tutor "Continue" appends the next Part to the edited document; the learner's text is byte-identical before and after
- [ ] Citation chips land on the correct block after heavy edits; a deleted cited block renders as unavailable, never wrong
- [ ] Editor-level undo works within a document
- [ ] HTTP seam: document saves are per-object; a concurrent Tutor turn and learner save cannot clobber each other (turn lock + per-object writes)

## Comments
