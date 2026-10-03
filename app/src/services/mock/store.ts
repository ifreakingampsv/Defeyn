import type {
  BoardCard,
  BoardEdge,
  BoardState,
  CardContent,
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
  /** learner-owned board state per course: edits/deletes/creates layered over
   * the derived tutor Cards (which come from the stored whiteboard groups). */
  boardOverlay: Record<string, BoardOverlay>;
}

export interface BoardOverlay {
  /** position/content patches for derived tutor Cards, keyed by card id */
  patches: Record<string, { x?: number; y?: number; content?: Partial<CardContent> }>;
  /** tombstones for derived tutor Cards */
  deleted: string[];
  /** learner-created Cards, stored whole */
  extraCards: BoardCard[];
  edges: BoardEdge[];
  deletedEdges: string[];
}

const EMPTY_OVERLAY: BoardOverlay = { patches: {}, deleted: [], extraCards: [], edges: [], deletedEdges: [] };

const KEY = 'defeyn-mock-db';

const EMPTY: DB = { seq: 1, sessions: [], courses: [], boardOverlay: {} };

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as DB;
    if (!Array.isArray(parsed.sessions) || !Array.isArray(parsed.courses)) return { ...EMPTY };
    return { ...parsed, boardOverlay: parsed.boardOverlay ?? {} };
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

  /* ---- v2 Board (mock adapter) ---- */

  overlayFor(courseId: string): BoardOverlay {
    if (!db.boardOverlay[courseId]) db.boardOverlay[courseId] = { ...EMPTY_OVERLAY };
    return db.boardOverlay[courseId];
  },

  /** The mock Board derives tutor Cards from the stored whiteboard groups of
   * the latest session linked to the course (stable ids), then layers the
   * learner overlay on top. */
  getBoard(courseId: string): BoardState | null {
    const course = this.getCourse(courseId);
    if (!course) return null;
    const session = [...db.sessions]
      .filter((s) => s.courseId === courseId)
      .sort((a, b) => b.updatedTs - a.updatedTs)[0];
    const overlay = this.overlayFor(courseId);
    const boardId = `b_${courseId}`;
    const derived: BoardCard[] = [];
    if (session?.whiteboard?.length) {
      let i = 0;
      for (const group of session.whiteboard) {
        for (const c of group.cards) {
          derived.push(makeCard(`card_${c.id}`, boardId, 'tutor', { title: c.title, body: c.body }, i++));
        }
        derived.push(
          makeCard(`card_${group.note.id}`, boardId, 'tutor', { title: group.note.title, bullets: group.note.bullets }, i++),
        );
      }
    }
    const cards = [...derived, ...overlay.extraCards]
      .filter((c) => !overlay.deleted.includes(c.id))
      .map((c) => {
        const p = overlay.patches[c.id];
        return p ? { ...c, x: p.x ?? c.x, y: p.y ?? c.y, content: { ...c.content, ...p.content } } : c;
      });
    const ids = new Set(cards.map((c) => c.id));
    const edges = overlay.edges.filter((e) => !overlay.deletedEdges.includes(e.id) && ids.has(e.sourceCardId) && ids.has(e.targetCardId));
    return { board: { id: boardId, courseId, title: `${course.title} — Board` }, cards, edges };
  },

  createCard(courseId: string, input: { title: string; body?: string; bullets?: string[]; x?: number; y?: number }): BoardCard {
    const overlay = this.overlayFor(courseId);
    const card: BoardCard = {
      id: nextId('card_'),
      boardId: `b_${courseId}`,
      creator: 'learner',
      content: { title: input.title, ...(input.body !== undefined ? { body: input.body } : {}), ...(input.bullets ? { bullets: input.bullets } : {}) },
      citation: null,
      x: input.x ?? 0,
      y: input.y ?? 0,
      updatedAt: Date.now(),
    };
    overlay.extraCards.push(card);
    save();
    return card;
  },

  updateCard(courseId: string, cardId: string, patch: { x?: number; y?: number; title?: string; body?: string | null; bullets?: string[] | null }): void {
    const overlay = this.overlayFor(courseId);
    const extra = overlay.extraCards.find((c) => c.id === cardId);
    if (extra) {
      if (patch.x !== undefined) extra.x = patch.x;
      if (patch.y !== undefined) extra.y = patch.y;
      const content: CardContent = { ...extra.content };
      if (patch.title !== undefined) content.title = patch.title;
      if (patch.body !== undefined) {
        if (patch.body === null) delete content.body;
        else content.body = patch.body;
      }
      if (patch.bullets !== undefined) {
        if (patch.bullets === null) delete content.bullets;
        else content.bullets = patch.bullets;
      }
      extra.content = content;
      extra.updatedAt = Date.now();
    } else {
      const p = (overlay.patches[cardId] ??= {});
      if (patch.x !== undefined) p.x = patch.x;
      if (patch.y !== undefined) p.y = patch.y;
      if (patch.title !== undefined || patch.body !== undefined || patch.bullets !== undefined) {
        const content = { ...(p.content ?? {}) } as Partial<CardContent>;
        if (patch.title !== undefined) content.title = patch.title;
        if (patch.body !== undefined) {
          if (patch.body === null) delete content.body;
          else content.body = patch.body;
        }
        if (patch.bullets !== undefined) {
          if (patch.bullets === null) delete content.bullets;
          else content.bullets = patch.bullets;
        }
        p.content = content;
      }
    }
    save();
  },

  deleteCard(courseId: string, cardId: string): void {
    const overlay = this.overlayFor(courseId);
    overlay.extraCards = overlay.extraCards.filter((c) => c.id !== cardId);
    if (!overlay.deleted.includes(cardId)) overlay.deleted.push(cardId);
    overlay.edges = overlay.edges.filter((e) => e.sourceCardId !== cardId && e.targetCardId !== cardId);
    delete overlay.patches[cardId];
    save();
  },

  createEdge(courseId: string, sourceCardId: string, targetCardId: string): BoardEdge | null {
    const board = this.getBoard(courseId);
    if (!board) return null;
    const ids = new Set(board.cards.map((c) => c.id));
    if (sourceCardId === targetCardId || !ids.has(sourceCardId) || !ids.has(targetCardId)) return null;
    const overlay = this.overlayFor(courseId);
    if (overlay.edges.some((e) => e.sourceCardId === sourceCardId && e.targetCardId === targetCardId)) return null;
    const edge: BoardEdge = { id: nextId('e_'), boardId: `b_${courseId}`, sourceCardId, targetCardId };
    overlay.edges.push(edge);
    save();
    return edge;
  },

  deleteEdge(courseId: string, edgeId: string): void {
    const overlay = this.overlayFor(courseId);
    overlay.edges = overlay.edges.filter((e) => e.id !== edgeId);
    if (!overlay.deletedEdges.includes(edgeId)) overlay.deletedEdges.push(edgeId);
    save();
  },
};

function makeCard(id: string, boardId: string, creator: 'tutor' | 'learner', content: CardContent, i: number): BoardCard {
  return {
    id,
    boardId,
    creator,
    content,
    citation: null,
    x: 60 + (i % 3) * 210,
    y: 60 + Math.floor(i / 3) * 160,
    updatedAt: 0,
  };
}
