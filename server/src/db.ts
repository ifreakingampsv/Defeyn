import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";

/**
 * SQLite persistence (Node 24 built-in driver — no native deps).
 *
 * V2 per-object schema (ADR-0001: fresh start, no migration). Every object is
 * its own row with an owner: instead of one whole-session blob, sessions hold
 * only identity + UI state, and the artifacts hang off as objects —
 * docs (lesson documents), boards/cards/edges (the workspace canvas), and the
 * v1 notes artifact as its own whiteboards row until tickets 03/05 replace it
 * with Board Cards. Structured shapes (topics, blocks, card content, message
 * blocks) are stored as JSON text and validated on write; the TutorApi
 * contract in ../app/src/services/types.ts owns them.
 */

export const db = new DatabaseSync(config.dbPath);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

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
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  seed_goal TEXT,
  pane TEXT NOT NULL DEFAULT 'syllabus',
  current_topic INTEGER NOT NULL DEFAULT 1,
  progress_json TEXT,
  created_at INTEGER NOT NULL,
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

-- Lesson documents: one row per (course, topic). Stable identity so
-- citations survive regeneration and (from ticket 06) learner edits.
CREATE TABLE IF NOT EXISTS docs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  blocks_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (course_id, topic_index)
);

-- The Board: 1:1 with a Course, auto-created when the Course is drafted.
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Cards on a Board. One Card type (ADR-0003): a snapshot body plus optional
-- source Citation (learner Cards carry none). x/y are queryable positions.
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  creator TEXT NOT NULL CHECK (creator IN ('tutor','learner')),
  content_json TEXT NOT NULL,
  citation_json TEXT,
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Arrows between two Cards of the same Board, stored as first-class data.
CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  source_card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  target_card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE (source_card_id, target_card_id),
  CHECK (source_card_id <> target_card_id)
);

-- V1 notes artifact, kept as its own per-session object so the v1 whiteboard
-- view works unchanged; tickets 03/05 replace it with Board Cards.
CREATE TABLE IF NOT EXISTS whiteboards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  groups_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, seq);
CREATE INDEX IF NOT EXISTS idx_docs_course ON docs(course_id, topic_index);
CREATE INDEX IF NOT EXISTS idx_cards_board ON cards(board_id, created_at);
CREATE INDEX IF NOT EXISTS idx_edges_board ON edges(board_id);
`);

export function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function now(): number {
  return Date.now();
}
