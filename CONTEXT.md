# Defeyn

An AI tutor whose generated study material becomes user-owned, editable
material the learner arranges on a canvas. The tutor is the front door; the
workspace is where the learner lives afterward.

## Language

**Tutor**:
The AI teacher — the product's front door. Drafts Courses, teaches Lessons,
answers questions with Citations.
_Avoid_: AI, assistant, bot, chatbot

**Goal**:
One sentence of what the learner wants to learn; it seeds a Course.
_Avoid_: prompt, query, request

**Course**:
A tutor-drafted syllabus for a Goal: ordered Topics, each with Sections.
_Avoid_: syllabus (the syllabus is the rendered *view* of a Course, not the object)

**Topic**:
One numbered unit of a Course, taught through a Lesson.

**Lesson**:
A tutor-drafted teaching document for a Topic, built from Parts. From v2 on,
user-editable — the Tutor appends, never clobbers.
_Avoid_: article, document

**Part**:
One checklist step of a Lesson (usually 4: foundations → mechanics → example → review).

**Artifact**:
Material the Tutor generated that the learner now owns and may edit, arrange, or delete.
_Avoid_: output, content, generated stuff

**Card**:
A small note object on a Board. Either Tutor-generated (carrying a source
Citation) or learner-created (no citation). Draggable and editable.
_Avoid_: note, note card, sticky

**Board**:
The canvas surface where Cards live and are arranged: drag, create, delete, connect.
_Avoid_: whiteboard (the v1 UI tab label; rename planned in v2)

**Session**:
One tutoring conversation with its history, linked to at most one Course.
_Avoid_: chat, thread, conversation

**Citation**:
A reference from a tutor answer or Card to the exact Lesson passage it drew
from. In v2 it points to a stable block identifier, not a position.
_Avoid_: source, reference, link
