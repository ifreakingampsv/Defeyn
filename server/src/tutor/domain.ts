/** Domain types mirroring the frontend contract (app/src/services/types.ts).
 * Keep both sides in sync — the JSON payloads cross the wire verbatim. */

export type MessageAuthor = "user" | "tutor";

/** A reference from a tutor answer to the exact Lesson passage it drew from.
 * Per ADR-0002 it points at a stable block ID — never an array position, which
 * would rot the moment lessons become editable. Display-time resolution maps
 * the ID to the block's current position; a missing block renders as
 * explicitly unavailable. */
export interface Citation {
  docId: string;
  blockId: string;
  label: string;
  quote?: string;
}

export type MessageBlock =
  | { kind: "text"; text: string; rich?: boolean }
  | { kind: "thought"; summary: string }
  | { kind: "step"; label: string }
  | { kind: "page-created"; title: string; caption: string }
  | { kind: "outline"; items: Array<{ head: string; rest: string }> }
  | { kind: "lesson-progress"; completed: number; total: number; items: string[] }
  | { kind: "course-chip"; title: string; caption: string }
  | { kind: "citations"; items: Citation[] }
  | { kind: "choices"; options: string[]; selected?: string };

export interface ChatMessage {
  id: string;
  author: MessageAuthor;
  timestamp?: string;
  blocks: MessageBlock[];
}

export interface TopicSection {
  number: string;
  title: string;
  description?: string;
}

export interface CourseTopic {
  id: string;
  number: number;
  title: string;
  description?: string;
  sections: TopicSection[];
}

export interface Course {
  id: string;
  title: string;
  goal: string;
  topics: CourseTopic[];
}

export type DocBlock =
  | { kind: "h1"; text: string; id: string }
  | { kind: "h2"; text: string; id: string }
  | { kind: "h3"; text: string; id: string }
  | { kind: "p"; runs: Array<{ text: string; bold?: boolean; italic?: boolean }>; id: string };

/** Omit that distributes over unions so variant-specific fields survive. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** A DocBlock before `stampBlockIds` assigns its stable ID (ADR-0002) — the
 * shape generators emit straight out of an LLM parse or a rule template. The
 * ID may also be absent on rows written before ADR-0002 landed. */
export type UnstampedDocBlock = DistributiveOmit<DocBlock, "id"> & { id?: string };

export interface LessonDoc {
  id: string;
  title: string;
  blocks: DocBlock[];
}

export interface WhiteboardCard {
  id: string;
  title: string;
  subtitle: string;
  body: string;
}

export interface WhiteboardNote {
  id: string;
  title: string;
  summary: string;
  sectionTitle: string;
  bullets: string[];
  highlight?: boolean;
}

export interface WhiteboardGroup {
  id: string;
  label: string;
  color: "orange" | "green";
  cards: WhiteboardCard[];
  note: WhiteboardNote;
}

export type SessionPane = "syllabus" | "lesson" | "whiteboard";

export interface LessonProgress {
  completed: number;
  total: number;
  items: string[];
}

/* ---- v2 workspace objects (schema + API land in ticket 01; the UI wires up
 *      in tickets 03–05). Every object is its own row owned by its user. ---- */

/** One Card type only (ADR-0003): a summary note is a Card with bullets. */
export interface CardContent {
  title: string;
  body?: string;
  bullets?: string[];
}

/** A generated Card's source Citation — points at a stable block ID per
 * ADR-0002 (values are produced by ticket 05; learner Cards carry none). */
export interface CardCitation {
  docId: string;
  blockId: string;
  label: string;
  quote?: string;
}

export interface Board {
  id: string;
  courseId: string;
  title: string;
}

export interface BoardCard {
  id: string;
  boardId: string;
  creator: "tutor" | "learner";
  content: CardContent;
  citation: CardCitation | null;
  x: number;
  y: number;
  updatedAt: number;
}

export interface BoardEdge {
  id: string;
  boardId: string;
  sourceCardId: string;
  targetCardId: string;
}

/** Hydrated session the tutor engine works on (per-object rows, hydrated). */
export interface WorkingSession {
  id: string;
  userId: string;
  title: string;
  courseId?: string;
  course?: Course;
  pane: SessionPane;
  currentTopic: number;
  lessonDoc?: LessonDoc;
  whiteboard?: WhiteboardGroup[];
  lessonProgress?: LessonProgress;
  messages: ChatMessage[];
  seedGoal?: string;
}
