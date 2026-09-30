/** Domain types mirroring the frontend contract (app/src/services/types.ts).
 * Keep both sides in sync — the JSON payloads cross the wire verbatim. */

export type MessageAuthor = "user" | "tutor";

export interface Citation {
  docId: string;
  blockIndex: number;
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
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "p"; runs: Array<{ text: string; bold?: boolean; italic?: boolean }> };

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

/** Hydrated session the tutor engine works on (persisted rows in JSON columns). */
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
