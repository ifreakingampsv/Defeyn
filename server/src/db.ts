import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";

/**
 * SQLite persistence (Node 24 built-in driver — no native deps).
 * Structured artifacts (course topics, lesson docs, whiteboard groups,
 * message blocks) are stored as JSON text: their shapes are owned by the
 * TutorApi contract (see ../app/src/services/types.ts) and validated on write.
 */

export const db = new DatabaseSync(config.dbPath);

db.exec(`
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  topics_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  course_id TEXT REFERENCES courses(id),
  pane TEXT NOT NULL DEFAULT 'syllabus',
  current_topic INTEGER NOT NULL DEFAULT 1,
  lesson_doc_json TEXT,
  whiteboard_json TEXT,
  progress_json TEXT,
  seed_goal TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  author TEXT NOT NULL CHECK (author IN ('user','tutor')),
  timestamp TEXT NOT NULL,
  blocks_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, seq);
`);

export function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function now(): number {
  return Date.now();
}
