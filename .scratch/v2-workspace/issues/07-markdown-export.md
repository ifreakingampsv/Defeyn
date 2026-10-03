# 07: Markdown export

**What to build:** the finishing move — the learner can export a Course (its syllabus), a Lesson, or a Board to Markdown. The serializer is deliberately naive: structured text out, readable in any plain editor, nothing fancy. It is both a trust feature ("my work leaves the app whenever I want") and a debugging tool during the build.

**Blocked by:** 06 (editable Lessons — export reads the final document shape).

**Status:** ready-for-agent

- [ ] Course, Lesson, and Board each export to valid Markdown that reads cleanly in a plain editor
- [ ] Board export includes every Card's text and its connections rendered as text
- [ ] HTTP seam: export endpoints are scoped to the owning user; output shape is stable across repeated exports of unchanged data
- [ ] Export never mutates anything (pure read)

## Comments
