import type {
  ChatMessage,
  Course,
  LessonDoc,
  LessonProgress,
  SessionPane,
  WhiteboardGroup,
} from '../types';

/**
 * localStorage-backed persistence for the mock tutor product (Phase 1).
 *
 * One JSON blob under `defeyn-mock-db` holds every session, course, lesson and
 * whiteboard the fake tutor has produced, so the workspace survives reloads.
 * A real backend replaces this whole module (see BACKEND.md): the UI only ever
 * talks to the TutorApi contract, never to this store.
 */

export interface StoredCourse extends Course {
  goal: string;
}

export interface StoredSession {
  id: string;
  title: string;
  courseId?: string;
  updatedTs: number;
  messages: ChatMessage[];
  pane: SessionPane;
  lessonDoc?: LessonDoc;
  whiteboard?: WhiteboardGroup[];
  lessonProgress?: LessonProgress;
  /** index into course.topics of the topic being taught */
  currentTopic: number;
  seedGoal?: string;
}

interface DB {
  seq: number;
  sessions: StoredSession[];
  courses: StoredCourse[];
}

const KEY = 'defeyn-mock-db';

const EMPTY: DB = { seq: 1, sessions: [], courses: [] };

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as DB;
    if (!Array.isArray(parsed.sessions) || !Array.isArray(parsed.courses)) return { ...EMPTY };
    return parsed;
  } catch {
    return { ...EMPTY };
  }
}

let db: DB = load();

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* storage unavailable/unwritable: keep working in memory */
  }
}

/** Monotonic-ish id with a random tail so StrictMode double-invocations
 * cannot collide. */
export function nextId(prefix: string): string {
  const n = db.seq++;
  return `${prefix}${Date.now().toString(36)}${n.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

/** "· 09/19/2026 3:47 PM" — matches the demo fixture format. */
export function timestampNow(): string {
  const d = new Date();
  const p2 = (n: number) => String(n).padStart(2, '0');
  let h = d.getHours() % 12;
  if (h === 0) h = 12;
  return `· ${p2(d.getMonth() + 1)}/${p2(d.getDate())}/${d.getFullYear()} ${h}:${p2(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/** Coarse age label for the sidebar, in the reference's voice ("3h", "2d"). */
export function ageLabel(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export const store = {
  listSessions() {
    return [...db.sessions].sort((a, b) => b.updatedTs - a.updatedTs);
  },
  getSession(id: string): StoredSession | undefined {
    return db.sessions.find((s) => s.id === id);
  },
  getCourse(id: string): StoredCourse | undefined {
    return db.courses.find((c) => c.id === id);
  },
  createSession(): StoredSession {
    const s: StoredSession = {
      id: nextId('s'),
      title: 'New session',
      updatedTs: Date.now(),
      messages: [],
      pane: 'syllabus',
      currentTopic: 1,
    };
    db.sessions.push(s);
    save();
    return s;
  },
  createSeededSession(seedGoal: string): StoredSession {
    const s = this.createSession();
    s.seedGoal = seedGoal;
    save();
    return s;
  },
  renameSession(id: string, title: string) {
    const s = db.sessions.find((x) => x.id === id);
    if (!s) return;
    s.title = title.trim().slice(0, 60) || s.title;
    save();
  },
  deleteSession(id: string) {
    db.sessions = db.sessions.filter((s) => s.id !== id);
    save();
  },
  addCourse(course: StoredCourse): StoredCourse {
    db.courses.push(course);
    save();
    return course;
  },
  /** touch + persist after the fake tutor mutated a session in place. */
  commit(session: StoredSession) {
    session.updatedTs = Date.now();
    save();
  },
  summaryOf(s: StoredSession) {
    const course = s.courseId ? db.courses.find((c) => c.id === s.courseId) : undefined;
    return {
      id: s.id,
      title: s.title,
      updatedLabel: ageLabel(s.updatedTs),
      updatedTs: s.updatedTs,
      courseId: s.courseId,
      courseTitle: course?.title,
    };
  },
  /** Test hook + "reset demo" affordance: wipes the mock product data. */
  reset() {
    db = { ...EMPTY };
    save();
  },
};
