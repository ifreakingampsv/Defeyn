/**
 * Domain model for the AI Tutor product.
 *
 * FRONTEND-ONLY BUILD: these types describe the data the real backend will own
 * (sessions, messages, AI-generated courses/lessons, whiteboard notes). Today the
 * only implementation backing them is the in-memory mock in
 * `src/services/api/mockTutorApi.ts`. See BACKEND.md at the repo root for the
 * full list of services that are intentionally left unimplemented.
 */

export interface User {
  id: string;
  name: string;
  initials: string;
  role?: string;
}

export type MessageAuthor = 'user' | 'tutor';

/** A reference from a chat message (or a Card) to a specific passage of a
 * lesson document. The live path cites a stable `blockId` (ADR-0002) and
 * resolves it to the block's current position at display time; a block that
 * no longer exists renders as explicitly `unavailable`. The demo replay
 * fixtures still cite `blockIndex` directly. */
export interface Citation {
  docId: string;
  /** stable block identity — citations that survive any editing */
  blockId?: string;
  /** position in `LessonDoc.blocks` (demo replay fixtures only) */
  blockIndex?: number;
  /** short anchor label, e.g. "Part 2: Core mechanics" */
  label: string;
  /** the quoted passage the citation refers to, if any */
  quote?: string;
  /** set at display time when the cited block no longer exists */
  unavailable?: boolean;
}

/** Structured content blocks an assistant message can carry (beyond plain text). */
export type MessageBlock =
  | { kind: 'text'; text: string; rich?: boolean }
  | { kind: 'thought'; summary: string } // collapsed "Thought completed" row
  | { kind: 'step'; label: string } // collapsed progress step, e.g. "Creating the next part"
  | { kind: 'page-created'; title: string; caption: string }
  | { kind: 'outline'; items: Array<{ head: string; rest: string }> }
  | { kind: 'lesson-progress'; completed: number; total: number; items: string[] }
  | { kind: 'course-chip'; title: string; caption: string }
  | { kind: 'citations'; items: Citation[] }
  | { kind: 'choices'; options: string[]; selected?: string };

export interface ChatMessage {
  id: string;
  author: MessageAuthor;
  /** display timestamp on the demo timeline, e.g. "· 05/01/2026 3:47 PM" */
  timestamp?: string;
  blocks: MessageBlock[];
}

export interface TopicSection {
  number: string; // "15.1"
  title: string;
  description?: string;
}

export interface CourseTopic {
  id: string;
  number: number;
  title: string; // "Topic 15: Postmodernism and Contemporary Thought"
  description?: string;
  sections: TopicSection[];
}

export interface Course {
  id: string;
  title: string; // "History of Western Philosophy"
  goal: string;
  topics: CourseTopic[];
}

export type DocBlock =
  | { kind: 'h1'; text: string; id?: string }
  | { kind: 'h2'; text: string; id?: string }
  | { kind: 'h3'; text: string; id?: string }
  | { kind: 'p'; runs: DocRun[]; id?: string };

export type DocRun = { text: string; bold?: boolean; italic?: boolean };

export interface LessonDoc {
  id: string;
  title: string;
  blocks: DocBlock[];
}

/** A small note card on the whiteboard, generated from one lesson part. */
export interface WhiteboardCard {
  id: string;
  title: string;
  subtitle: string;
  body: string;
}

/** The summary note a lesson group collapses into. */
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
  label: string; // "Lesson 1"
  color: 'orange' | 'green';
  cards: WhiteboardCard[];
  note: WhiteboardNote;
}

/* ---- v2 workspace objects: Board, Cards, Edges ---- */

/** One Card type only (ADR-0003): a summary note is a Card with bullets. */
export interface CardContent {
  title: string;
  body?: string;
  bullets?: string[];
}

/** A generated Card's source Citation — stable block ID per ADR-0002.
 * Learner-created Cards carry no citation. */
export interface CardCitation {
  docId: string;
  blockId: string;
  label: string;
  quote?: string;
}

/** The canvas surface of a Course: 1:1, auto-created when the Course is drafted. */
export interface Board {
  id: string;
  courseId: string;
  title: string;
}

export interface BoardCard {
  id: string;
  boardId: string;
  creator: 'tutor' | 'learner';
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

export interface BoardState {
  board: Board;
  cards: BoardCard[];
  edges: BoardEdge[];
}

/** One scripted demo conversation: what the (mock) backend replays to the UI. */
export interface DemoScript {
  id: 'hero' | 'goal' | 'curriculum' | 'whiteboard';
  messages: ChatMessage[];
  /** typed input for the "goal" demo before it is sent */
  typedInput?: string;
  course?: Course;
  lessonDoc?: LessonDoc;
  whiteboard?: WhiteboardGroup[];
}

/** A syllabus preview used by the "Explore what people are learning" cards. */
export interface ExploreCoursePreview {
  slug: string;
  persona: User;
  goal: string;
  topics: CourseTopic[];
}

/** Which artifact the workspace's right pane is showing. */
export type SessionPane = 'syllabus' | 'lesson' | 'whiteboard';

/** Checklist state for the lesson the session is currently teaching. */
export interface LessonProgress {
  completed: number;
  total: number;
  items: string[];
}

/** A session row in the workspace sidebar (listSessions shape). */
export interface SessionSummary {
  id: string;
  title: string;
  /** coarse age label, e.g. "now" | "5m" | "2h" | "3d" */
  updatedLabel: string;
  updatedTs: number;
  courseId?: string;
  courseTitle?: string;
}

/** Everything the workspace needs to render one session (getSession shape). */
export interface SessionDetail {
  session: SessionSummary;
  messages: ChatMessage[];
  course?: Course;
  lessonDoc?: LessonDoc;
  whiteboard?: WhiteboardGroup[];
  pane: SessionPane;
  lessonProgress?: LessonProgress;
  /** goal seeded by an external entry point (e.g. a course page); the
   * workspace sends it as the session's first message, once. */
  seedGoal?: string;
}

export interface TutorApi {
  /** Demo content shown on the marketing page (static scripts today). */
  getDemoScripts(): Promise<DemoScript[]>;
  getExploreCourses(): Promise<ExploreCoursePreview[]>;

  // ---- Real product surface ----
  // The mock implements all of these against a localStorage-backed store with
  // a rule-based fake tutor; a real backend swaps in behind the same contract
  // (see BACKEND.md) via getTutorApi().
  createSession(): Promise<{ sessionId: string }>;
  listSessions(): Promise<SessionSummary[]>;
  sendMessage(sessionId: string, text: string): Promise<ChatMessage>;
  /** Streaming variant. Emits tutor blocks as they are produced, plus text
   * deltas that append to the currently open text block, then resolves with
   * the final message. The mock streams with delays; the real backend streams
   * SSE (client.ts streamTutorMessage). */
  sendMessageStream(
    sessionId: string,
    text: string,
    onEvent: (
      event: { type: "block"; block: MessageBlock } | { type: "text-delta"; delta: string },
    ) => void,
  ): Promise<ChatMessage>;
  /** Drop the last tutor reply and produce a fresh one for the same user turn. */
  regenerateLast(sessionId: string): Promise<ChatMessage>;
  renameSession(sessionId: string, title: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  getSession(sessionId: string): Promise<SessionDetail>;
  getCourse(courseId: string): Promise<Course>;
  getCourseBySlug(slug: string): Promise<ExploreCoursePreview | null>;
  /** Create a session seeded with an explore course's goal ("Start this course"). */
  startCourse(slug: string): Promise<{ sessionId: string } | null>;

  // ---- v2 Board surface (the workspace canvas; see tickets 03–05) ----
  /** The Board of a Course (auto-created with the course; null if the course
   * predates v2 or doesn't exist). */
  getBoard(courseId: string): Promise<BoardState | null>;
  createCard(
    boardId: string,
    input: { title: string; body?: string; bullets?: string[]; x?: number; y?: number },
  ): Promise<BoardCard>;
  /** Per-object autosave write: only the provided fields change. */
  updateCard(
    cardId: string,
    patch: { x?: number; y?: number; title?: string; body?: string | null; bullets?: string[] | null },
  ): Promise<void>;
  deleteCard(cardId: string): Promise<void>;
  createEdge(boardId: string, sourceCardId: string, targetCardId: string): Promise<BoardEdge>;
  deleteEdge(edgeId: string): Promise<void>;
}
