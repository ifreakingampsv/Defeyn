import { randomUUID } from "node:crypto";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { db, id, now } from "./db.js";
import exploreCourses from "./data/exploreCourses.json" with { type: "json" };
import type {
  ChatMessage,
  Course,
  LessonDoc,
  LessonProgress,
  MessageBlock,
  SessionPane,
  WhiteboardGroup,
  WorkingSession,
} from "./tutor/domain.js";

/** Session/course persistence: rows <-> hydrated WorkingSession. */

interface SessionRow {
  id: string;
  user_id: string;
  title: string;
  course_id: string | null;
  pane: string;
  current_topic: number;
  lesson_doc_json: string | null;
  whiteboard_json: string | null;
  progress_json: string | null;
  seed_goal: string | null;
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
    lessonDoc: row.lesson_doc_json ? (JSON.parse(row.lesson_doc_json) as LessonDoc) : undefined,
    whiteboard: row.whiteboard_json ? (JSON.parse(row.whiteboard_json) as WhiteboardGroup[]) : undefined,
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

export const store = {
  createSession(userId: string, seedGoal?: string): { sessionId: string } {
    const sid = id("s");
    db.prepare(
      "INSERT INTO sessions (id, user_id, title, pane, current_topic, seed_goal, updated_at) VALUES (?, ?, ?, 'syllabus', 1, ?, ?)",
    ).run(sid, userId, "New session", seedGoal ?? null, now());
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

  persistSession(session: WorkingSession): void {
    db.prepare(
      `UPDATE sessions SET title = ?, course_id = ?, pane = ?, current_topic = ?, lesson_doc_json = ?,
       whiteboard_json = ?, progress_json = ?, seed_goal = NULL, updated_at = ? WHERE id = ?`,
    ).run(
      session.title,
      session.courseId ?? null,
      session.pane,
      session.currentTopic,
      session.lessonDoc ? JSON.stringify(session.lessonDoc) : null,
      session.whiteboard ? JSON.stringify(session.whiteboard) : null,
      session.lessonProgress ? JSON.stringify(session.lessonProgress) : null,
      now(),
      session.id,
    );
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

  renameSession(sessionId: string, userId: string, title: string): void {
    db.prepare("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?").run(
      title.trim().slice(0, 60),
      now(),
      sessionId,
      userId,
    );
  },

  deleteSession(sessionId: string, userId: string): void {
    db.prepare("DELETE FROM messages WHERE session_id = ?").run(sessionId);
    db.prepare("DELETE FROM sessions WHERE id = ? AND user_id = ?").run(sessionId, userId);
  },

  createCourse(userId: string, course: Course): void {
    db.prepare("INSERT INTO courses (id, user_id, title, goal, topics_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      course.id,
      userId,
      course.title,
      course.goal,
      JSON.stringify(course.topics),
      now(),
    );
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
};

function timestampNowSafe(): string {
  const d = new Date();
  const p2 = (n: number) => String(n).padStart(2, "0");
  let h = d.getHours() % 12;
  if (h === 0) h = 12;
  return `· ${p2(d.getMonth() + 1)}/${p2(d.getDate())}/${d.getFullYear()} ${h}:${p2(d.getMinutes())} ${d.getHours() < 12 ? "AM" : "PM"}`;
}

export { randomUUID };
