import { randomUUID } from "node:crypto";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { db, id, now } from "./db.js";
import exploreCourses from "./data/exploreCourses.json" with { type: "json" };
import type {
  Board,
  BoardCard,
  BoardEdge,
  CardContent,
  ChatMessage,
  Course,
  LessonDoc,
  LessonProgress,
  MessageBlock,
  SessionPane,
  WhiteboardGroup,
  WorkingSession,
} from "./tutor/domain.js";

/**
 * V2 per-object store (ADR-0001). Sessions hold identity + UI state only;
 * every artifact is its own row (docs, boards, cards, edges, whiteboards,
 * messages). Writes are per-object: saving one artifact never rewrites
 * another, which structurally retires the whole-blob last-writer-wins race
 * the v1 persistSession had. Every table carries user_id and every function
 * takes the owner's id — cross-account access is a miss (→ 404 upstream).
 */

interface SessionRow {
  id: string;
  user_id: string;
  title: string;
  course_id: string | null;
  seed_goal: string | null;
  pane: string;
  current_topic: number;
  progress_json: string | null;
  updated_at: number;
}

function ageLabel(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function rowToSummary(row: SessionRow) {
  const course = row.course_id
    ? (db.prepare("SELECT title FROM courses WHERE id = ?").get(row.course_id) as { title: string } | undefined)
    : undefined;
  return {
    id: row.id,
    title: row.title,
    updatedLabel: ageLabel(row.updated_at),
    updatedTs: row.updated_at,
    courseId: row.course_id ?? undefined,
    courseTitle: course?.title,
  };
}

function all<T>(stmt: ReturnType<DatabaseSync["prepare"]>, ...params: SQLInputValue[]): T[] {
  return stmt.all(...params) as unknown as T[];
}

interface DocRow {
  id: string;
  title: string;
  blocks_json: string;
  topic_index: number;
}

function hydrate(row: SessionRow): WorkingSession {
  const course = row.course_id
    ? (db.prepare("SELECT id, title, goal, topics_json FROM courses WHERE id = ?").get(row.course_id) as
        | { id: string; title: string; goal: string; topics_json: string }
        | undefined)
    : undefined;
  const messages = all<{ id: string; author: string; timestamp: string; blocks_json: string }>(
    db.prepare("SELECT id, author, timestamp, blocks_json FROM messages WHERE session_id = ? ORDER BY seq"),
    row.id,
  );
  let lessonDoc: LessonDoc | undefined;
  let whiteboard: WhiteboardGroup[] | undefined;
  if (course) {
    const doc = db
      .prepare("SELECT id, title, blocks_json FROM docs WHERE course_id = ? AND topic_index = ?")
      .get(course.id, row.current_topic) as DocRow | undefined;
    if (doc) lessonDoc = { id: doc.id, title: doc.title, blocks: JSON.parse(doc.blocks_json) };
  }
  const wb = db
    .prepare("SELECT groups_json FROM whiteboards WHERE session_id = ?")
    .get(row.id) as { groups_json: string } | undefined;
  if (wb) whiteboard = JSON.parse(wb.groups_json);
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    courseId: row.course_id ?? undefined,
    course: course
      ? { id: course.id, title: course.title, goal: course.goal, topics: JSON.parse(course.topics_json) }
      : undefined,
    pane: row.pane as SessionPane,
    currentTopic: row.current_topic,
    lessonDoc,
    whiteboard,
    lessonProgress: row.progress_json ? (JSON.parse(row.progress_json) as LessonProgress) : undefined,
    seedGoal: row.seed_goal ?? undefined,
    messages: messages.map((m) => ({
      id: m.id,
      author: m.author as ChatMessage["author"],
      timestamp: m.timestamp,
      blocks: JSON.parse(m.blocks_json) as MessageBlock[],
    })),
  };
}

export interface SessionMetaPatch {
  title?: string;
  /** link the session to its drafted Course (set once at draft time) */
  courseId?: string;
  pane?: SessionPane;
  currentTopic?: number;
  progress?: LessonProgress;
}

export const store = {
  /* ---- sessions ---- */

  createSession(userId: string, seedGoal?: string): { sessionId: string } {
    const sid = id("s");
    db.prepare(
      "INSERT INTO sessions (id, user_id, title, seed_goal, pane, current_topic, created_at, updated_at) VALUES (?, ?, 'New session', ?, 'syllabus', 1, ?, ?)",
    ).run(sid, userId, seedGoal ?? null, now(), now());
    return { sessionId: sid };
  },

  listSessions(userId: string) {
    const rows = all<SessionRow>(db.prepare("SELECT * FROM sessions WHERE user_id = ? ORDER BY updated_at DESC"), userId);
    return rows.map(rowToSummary);
  },

  getSession(sessionId: string, userId: string): WorkingSession | null {
    const row = db.prepare("SELECT * FROM sessions WHERE id = ? AND user_id = ?").get(sessionId, userId) as
      | SessionRow
      | undefined;
    return row ? hydrate(row) : null;
  },

  /** Targeted UI-state save — the session's own columns only. Artifacts live
   * in their own tables and are saved by their own calls. */
  updateSessionMeta(sessionId: string, patch: SessionMetaPatch): void {
    const sets: string[] = ["updated_at = ?"];
    const params: SQLInputValue[] = [now()];
    if (patch.title !== undefined) {
      sets.push("title = ?");
      params.push(patch.title);
    }
    if (patch.courseId !== undefined) {
      sets.push("course_id = ?");
      params.push(patch.courseId);
    }
    if (patch.pane !== undefined) {
      sets.push("pane = ?");
      params.push(patch.pane);
    }
    if (patch.currentTopic !== undefined) {
      sets.push("current_topic = ?");
      params.push(patch.currentTopic);
    }
    if (patch.progress !== undefined) {
      sets.push("progress_json = ?");
      params.push(JSON.stringify(patch.progress));
    }
    params.push(sessionId);
    db.prepare(`UPDATE sessions SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  },

  insertMessage(sessionId: string, message: ChatMessage): void {
    db.prepare(
      "INSERT INTO messages (id, session_id, author, timestamp, blocks_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(message.id, sessionId, message.author, message.timestamp ?? timestampNowSafe(), JSON.stringify(message.blocks), now());
  },

  deleteTrailingTutorMessages(sessionId: string): void {
    // remove only the trailing run of tutor messages (the reply being regenerated)
    const rows = all<{ id: string; author: string }>(
      db.prepare("SELECT id, author FROM messages WHERE session_id = ? ORDER BY seq DESC"),
      sessionId,
    );
    const ids: string[] = [];
    for (const r of rows) {
      if (r.author !== "tutor") break;
      ids.push(r.id);
    }
    if (ids.length) {
      const del = db.prepare("DELETE FROM messages WHERE id = ?");
      for (const mid of ids) del.run(mid);
    }
  },

  renameSession(sessionId: string, userId: string, title: string): boolean {
    const res = db
      .prepare("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .run(title.trim().slice(0, 60), now(), sessionId, userId);
    return res.changes > 0;
  },

  deleteSession(sessionId: string, userId: string): boolean {
    // owner-scoped end to end: a foreign session id must not have its
    // messages (or anything else) touched — resolve ownership FIRST
    const owned = db.prepare("SELECT id FROM sessions WHERE id = ? AND user_id = ?").get(sessionId, userId);
    if (!owned) return false;
    db.prepare("DELETE FROM messages WHERE session_id = ?").run(sessionId);
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    return true;
  },

  /* ---- courses (each draft also gets its Board, 1:1) ---- */

  createCourse(userId: string, course: Course): void {
    db.prepare("INSERT INTO courses (id, user_id, title, goal, topics_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      course.id,
      userId,
      course.title,
      course.goal,
      JSON.stringify(course.topics),
      now(),
    );
    this.createBoard(userId, course.id, course.title);
  },

  getCourseBySlug(slug: string) {
    return (exploreCourses as Array<{ slug: string }>).find((c) => c.slug === slug) ?? null;
  },

  getCourse(courseId: string, userId: string): Course | null {
    const row = db.prepare("SELECT id, title, goal, topics_json FROM courses WHERE id = ? AND user_id = ?").get(
      courseId,
      userId,
    ) as { id: string; title: string; goal: string; topics_json: string } | undefined;
    return row ? { id: row.id, title: row.title, goal: row.goal, topics: JSON.parse(row.topics_json) } : null;
  },

  /* ---- lesson documents (per-object; stable row identity per course+topic) ---- */

  getDoc(courseId: string, topicIndex: number, userId: string): LessonDoc | null {
    const row = db
      .prepare("SELECT id, title, blocks_json FROM docs WHERE course_id = ? AND topic_index = ? AND user_id = ?")
      .get(courseId, topicIndex, userId) as DocRow | undefined;
    return row ? { id: row.id, title: row.title, blocks: JSON.parse(row.blocks_json) } : null;
  },

  /** Upsert by (course, topic): the row id — and therefore every citation's
   * docId — stays stable across saves of the same document. */
  saveDoc(userId: string, courseId: string, topicIndex: number, doc: LessonDoc): void {
    db.prepare(
      `INSERT INTO docs (id, user_id, course_id, topic_index, title, blocks_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(course_id, topic_index) DO UPDATE SET
         title = excluded.title, blocks_json = excluded.blocks_json, updated_at = excluded.updated_at`,
    ).run(doc.id, userId, courseId, topicIndex, doc.title, JSON.stringify(doc.blocks), now(), now());
  },

  /* ---- the v1 notes artifact (per-object until tickets 03/05 replace it) ---- */

  getWhiteboard(sessionId: string, userId: string): WhiteboardGroup[] | null {
    const row = db
      .prepare("SELECT groups_json FROM whiteboards WHERE session_id = ? AND user_id = ?")
      .get(sessionId, userId) as { groups_json: string } | undefined;
    return row ? (JSON.parse(row.groups_json) as WhiteboardGroup[]) : null;
  },

  saveWhiteboard(sessionId: string, userId: string, groups: WhiteboardGroup[]): void {
    db.prepare(
      `INSERT INTO whiteboards (id, user_id, session_id, groups_json, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(session_id) DO UPDATE SET groups_json = excluded.groups_json, updated_at = excluded.updated_at`,
    ).run(id("wb"), userId, sessionId, JSON.stringify(groups), now());
  },

  /* ---- boards, cards, edges ---- */

  createBoard(userId: string, courseId: string, title: string): Board {
    const boardId = id("b");
    db.prepare("INSERT INTO boards (id, user_id, course_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      boardId,
      userId,
      courseId,
      `${title} — Board`,
      now(),
      now(),
    );
    return { id: boardId, courseId, title: `${title} — Board` };
  },

  getBoardByCourse(courseId: string, userId: string): { board: Board; cards: BoardCard[]; edges: BoardEdge[] } | null {
    const board = db
      .prepare("SELECT id, course_id, title FROM boards WHERE course_id = ? AND user_id = ?")
      .get(courseId, userId) as { id: string; course_id: string; title: string } | undefined;
    if (!board) return null;
    return {
      board: { id: board.id, courseId: board.course_id, title: board.title },
      cards: this.listCards(board.id, userId),
      edges: this.listEdges(board.id, userId),
    };
  },

  getBoard(boardId: string, userId: string): Board | null {
    const row = db
      .prepare("SELECT id, course_id, title FROM boards WHERE id = ? AND user_id = ?")
      .get(boardId, userId) as { id: string; course_id: string; title: string } | undefined;
    return row ? { id: row.id, courseId: row.course_id, title: row.title } : null;
  },

  listCards(boardId: string, userId: string): BoardCard[] {
    const rows = all<{
      id: string;
      board_id: string;
      creator: string;
      content_json: string;
      citation_json: string | null;
      x: number;
      y: number;
      updated_at: number;
    }>(db.prepare("SELECT * FROM cards WHERE board_id = ? AND user_id = ? ORDER BY created_at"), boardId, userId);
    return rows.map((r) => ({
      id: r.id,
      boardId: r.board_id,
      creator: r.creator as BoardCard["creator"],
      content: JSON.parse(r.content_json) as CardContent,
      citation: r.citation_json ? (JSON.parse(r.citation_json) as BoardCard["citation"]) : null,
      x: r.x,
      y: r.y,
      updatedAt: r.updated_at,
    }));
  },

  getCard(cardId: string, userId: string): BoardCard | null {
    const r = db
      .prepare("SELECT * FROM cards WHERE id = ? AND user_id = ?")
      .get(cardId, userId) as
      | {
          id: string;
          board_id: string;
          creator: string;
          content_json: string;
          citation_json: string | null;
          x: number;
          y: number;
          updated_at: number;
        }
      | undefined;
    if (!r) return null;
    return {
      id: r.id,
      boardId: r.board_id,
      creator: r.creator as BoardCard["creator"],
      content: JSON.parse(r.content_json) as CardContent,
      citation: r.citation_json ? (JSON.parse(r.citation_json) as BoardCard["citation"]) : null,
      x: r.x,
      y: r.y,
      updatedAt: r.updated_at,
    };
  },

  createCard(
    userId: string,
    boardId: string,
    input: { title: string; body?: string; bullets?: string[]; x?: number; y?: number },
  ): BoardCard {
    const content: CardContent = { title: input.title };
    if (input.body !== undefined) content.body = input.body;
    if (input.bullets !== undefined) content.bullets = input.bullets;
    const cid = id("card");
    const ts = now();
    db.prepare(
      "INSERT INTO cards (id, user_id, board_id, creator, content_json, citation_json, x, y, created_at, updated_at) VALUES (?, ?, ?, 'learner', ?, NULL, ?, ?, ?, ?)",
    ).run(cid, userId, boardId, JSON.stringify(content), input.x ?? 0, input.y ?? 0, ts, ts);
    return this.getCard(cid, userId)!;
  },

  /** Per-object autosave write: only the provided fields change. */
  updateCard(
    userId: string,
    cardId: string,
    patch: { x?: number; y?: number; title?: string; body?: string | null; bullets?: string[] | null },
  ): void {
    const existing = this.getCard(cardId, userId);
    if (!existing) return;
    const content: CardContent = { ...existing.content };
    if (patch.title !== undefined) content.title = patch.title;
    if (patch.body !== undefined) {
      if (patch.body === null) delete content.body;
      else content.body = patch.body;
    }
    if (patch.bullets !== undefined) {
      if (patch.bullets === null) delete content.bullets;
      else content.bullets = patch.bullets;
    }
    db.prepare(
      "UPDATE cards SET content_json = ?, x = ?, y = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    ).run(
      JSON.stringify(content),
      patch.x ?? existing.x,
      patch.y ?? existing.y,
      now(),
      cardId,
      userId,
    );
  },

  deleteCard(userId: string, cardId: string): void {
    db.prepare("DELETE FROM cards WHERE id = ? AND user_id = ?").run(cardId, userId);
  },

  listEdges(boardId: string, userId: string): BoardEdge[] {
    const rows = all<{
      id: string;
      board_id: string;
      source_card_id: string;
      target_card_id: string;
    }>(db.prepare("SELECT id, board_id, source_card_id, target_card_id FROM edges WHERE board_id = ? AND user_id = ?"), boardId, userId);
    return rows.map((r) => ({
      id: r.id,
      boardId: r.board_id,
      sourceCardId: r.source_card_id,
      targetCardId: r.target_card_id,
    }));
  },

  /** Returns null when either card is missing/not on the board (both are
   * ownership-scoped), so callers can answer 404/400. Self edges are
   * rejected by the schema CHECK and pre-checked by the route. */
  createEdge(userId: string, boardId: string, sourceCardId: string, targetCardId: string): BoardEdge | null {
    // both cards must exist on this board, owned by this user
    const onBoard = all<{ id: string }>(
      db.prepare("SELECT id FROM cards WHERE board_id = ? AND user_id = ? AND id IN (?, ?)"),
      boardId,
      userId,
      sourceCardId,
      targetCardId,
    );
    if (onBoard.length !== 2) return null;
    const eid = id("e");
    db.prepare(
      "INSERT INTO edges (id, user_id, board_id, source_card_id, target_card_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(eid, userId, boardId, sourceCardId, targetCardId, now());
    return { id: eid, boardId, sourceCardId, targetCardId };
  },

  getEdge(edgeId: string, userId: string): BoardEdge | null {
    const row = db
      .prepare("SELECT id, board_id, source_card_id, target_card_id FROM edges WHERE id = ? AND user_id = ?")
      .get(edgeId, userId) as { id: string; board_id: string; source_card_id: string; target_card_id: string } | undefined;
    return row
      ? { id: row.id, boardId: row.board_id, sourceCardId: row.source_card_id, targetCardId: row.target_card_id }
      : null;
  },

  deleteEdge(userId: string, edgeId: string): void {
    db.prepare("DELETE FROM edges WHERE id = ? AND user_id = ?").run(edgeId, userId);
  },
};

function timestampNowSafe(): string {
  const d = new Date();
  const p2 = (n: number) => String(n).padStart(2, "0");
  let h = d.getHours() % 12;
  if (h === 0) h = 12;
  return `· ${p2(d.getMonth() + 1)}/${p2(d.getDate())}/${d.getFullYear()} ${h}:${p2(d.getMinutes())} ${d.getHours() < 12 ? "AM" : "PM"}`;
}

export { randomUUID };
