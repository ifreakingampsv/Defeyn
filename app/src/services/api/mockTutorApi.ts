import type {
  ChatMessage,
  Course,
  DemoScript,
  ExploreCoursePreview,
  LessonDoc,
  LessonSaveResult,
  MessageBlock,
  SessionDetail,
  SessionSummary,
  TutorApi,
  User,
} from '../types';
import { getCurrentUser } from '../auth';
import { nextId, store, type StoredCourse } from '../mock/store';
import { newMessage, tutorTurn } from '../mock/fakeTutor';
import { exploreCourses } from '../mock/exploreCourses';

/**
 * Mock implementation of TutorApi: the scripted marketing-page fixtures plus a
 * working, localStorage-backed fake product (Phase 1 of PRODUCT_PLAN.md).
 * Replies stream block-by-block with human-ish delays so the workspace
 * exercises its real streaming states. Replace via getTutorApi() when the
 * backend lands — sendMessageStream maps to SSE, the rest to REST.
 */

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const thinkFor = () => 800 + Math.floor(Math.random() * 900);
const blockFor = () => 450 + Math.floor(Math.random() * 550);

function notFound(sessionId: string): never {
  throw new Error(`Session ${sessionId} not found`);
}

function currentUser(): User {
  return getCurrentUser() ?? { id: 'guest', name: 'You', initials: 'Y' };
}

function linkedCourse(session: { courseId?: string }): StoredCourse | undefined {
  return session.courseId ? store.getCourse(session.courseId) : undefined;
}

/** Produce the tutor's reply for `text`, persist it, return the message. */
function produceReply(session: NonNullable<ReturnType<typeof store.getSession>>, text: string): ChatMessage {
  const { tutor } = tutorTurn(
    session,
    currentUser(),
    text,
    (course: StoredCourse) => store.addCourse(course),
    linkedCourse,
  );
  session.messages.push(tutor);
  session.seedGoal = undefined;
  store.commit(session);
  return tutor;
}

export const mockTutorApi: TutorApi = {
  async getDemoScripts(): Promise<DemoScript[]> {
    const { demoScripts } = await import('../mock/demoData');
    return demoScripts;
  },
  async getExploreCourses(): Promise<ExploreCoursePreview[]> {
    return exploreCourses;
  },

  async createSession(): Promise<{ sessionId: string }> {
    const s = store.createSession();
    return { sessionId: s.id };
  },

  async listSessions(): Promise<SessionSummary[]> {
    return store.listSessions().map((s) => store.summaryOf(s));
  },

  async sendMessage(sessionId: string, text: string): Promise<ChatMessage> {
    const session = store.getSession(sessionId);
    if (!session) notFound(sessionId);
    session.messages.push(newMessage('user', [{ kind: 'text', text }]));
    await sleep(thinkFor());
    return produceReply(session, text);
  },

  async sendMessageStream(
    sessionId: string,
    text: string,
    onEvent: (event: { type: "block"; block: MessageBlock } | { type: "text-delta"; delta: string }) => void,
  ): Promise<ChatMessage> {
    const session = store.getSession(sessionId);
    if (!session) notFound(sessionId);
    session.messages.push(newMessage('user', [{ kind: 'text', text }]));
    store.commit(session);
    await sleep(thinkFor());
    const tutor = produceReply(session, text);
    for (const block of tutor.blocks) {
      await sleep(blockFor());
      onEvent({ type: 'block', block });
    }
    return tutor;
  },

  async regenerateLast(sessionId: string): Promise<ChatMessage> {
    const session = store.getSession(sessionId);
    if (!session) notFound(sessionId);
    while (session.messages.length && session.messages[session.messages.length - 1].author === 'tutor') {
      session.messages.pop();
    }
    const lastUser = [...session.messages].reverse().find((m) => m.author === 'user');
    const text = lastUser?.blocks.find((b) => b.kind === 'text');
    await sleep(500);
    return produceReply(session, text && 'text' in text ? text.text : 'Continue');
  },

  async renameSession(sessionId: string, title: string): Promise<void> {
    store.renameSession(sessionId, title);
  },

  async deleteSession(sessionId: string): Promise<void> {
    store.deleteSession(sessionId);
  },

  async getSession(sessionId: string): Promise<SessionDetail> {
    const session = store.getSession(sessionId);
    if (!session) notFound(sessionId);
    const course = session.courseId ? store.getCourse(session.courseId) : undefined;
    return {
      session: store.summaryOf(session),
      messages: session.messages,
      course,
      lessonDoc: session.lessonDoc,
      whiteboard: session.whiteboard,
      pane: session.pane,
      lessonProgress: session.lessonProgress,
      seedGoal: session.seedGoal,
    };
  },

  async getCourse(courseId: string): Promise<Course> {
    const course = store.getCourse(courseId);
    if (!course) throw new Error(`Course ${courseId} not found`);
    return { id: course.id, title: course.title, goal: course.goal, topics: course.topics };
  },

  async getCourseBySlug(slug: string): Promise<ExploreCoursePreview | null> {
    return exploreCourses.find((c) => c.slug === slug) ?? null;
  },

  async startCourse(slug: string): Promise<{ sessionId: string } | null> {
    const preview = exploreCourses.find((c) => c.slug === slug);
    if (!preview) return null;
    const s = store.createSeededSession(preview.goal);
    return { sessionId: s.id };
  },

  // ---- v2 Board surface (mock adapter: derived Cards + learner overlay) ----

  async getBoard(courseId: string) {
    return store.getBoard(courseId);
  },

  async createCard(boardId: string, input: { title: string; body?: string; bullets?: string[]; x?: number; y?: number }) {
    const courseId = boardId.replace(/^b_/, '');
    return store.createCard(courseId, input);
  },

  async updateCard(
    cardId: string,
    patch: { x?: number; y?: number; title?: string; body?: string | null; bullets?: string[] | null },
  ): Promise<void> {
    const courseId = courseIdOfCard(cardId);
    if (courseId) store.updateCard(courseId, cardId, patch);
  },

  async deleteCard(cardId: string): Promise<void> {
    const courseId = courseIdOfCard(cardId);
    if (courseId) store.deleteCard(courseId, cardId);
  },

  async createEdge(boardId: string, sourceCardId: string, targetCardId: string) {
    const courseId = boardId.replace(/^b_/, '');
    const edge = store.createEdge(courseId, sourceCardId, targetCardId);
    if (!edge) throw new Error('Both Cards must be on this board');
    return edge;
  },

  async deleteEdge(edgeId: string): Promise<void> {
    for (const courseId of Object.keys(storeListCourseIds())) {
      const board = store.getBoard(courseId);
      if (board?.edges.some((e) => e.id === edgeId)) {
        store.deleteEdge(courseId, edgeId);
        return;
      }
    }
    throw new Error(`Edge ${edgeId} not found`);
  },

  /** Learner lesson save (mock): single-user localStorage — no conflicts. */
  async saveLessonDoc(sessionId: string, doc: LessonDoc): Promise<LessonSaveResult> {
    const session = store.getSession(sessionId);
    if (!session) notFound(sessionId);
    const stamped: LessonDoc = {
      ...doc,
      blocks: doc.blocks.map((b) => (b.id ? b : ({ ...b, id: nextId('blk') } as typeof b))),
      version: (session.lessonDoc?.version ?? 0) + 1,
    };
    session.lessonDoc = stamped;
    store.commit(session);
    return { ok: true, doc: stamped };
  },

  // ---- Course cascade delete (ticket 08, mock) ----

  async getCourseCascadeInfo(courseId: string) {
    const course = store.getCourse(courseId);
    if (!course) return null;
    const board = store.getBoard(courseId);
    return { courseTitle: course.title, cardCount: board?.cards.length ?? 0 };
  },

  async deleteCourse(courseId: string): Promise<void> {
    store.deleteCourse(courseId);
  },

  // ---- Markdown export (ticket 07, mock): naive serializer over store data ----

  async exportCourseMd(courseId: string): Promise<string> {
    const course = store.getCourse(courseId);
    if (!course) throw new Error(`Course ${courseId} not found`);
    const lines = [`# ${course.title}`, '', `> Goal: ${course.goal}`, ''];
    for (const t of course.topics) {
      lines.push(`## ${t.title}`, '');
      if (t.description) lines.push(t.description, '');
      for (const s of t.sections) lines.push(`- **${s.number} ${s.title}**${s.description ? ` — ${s.description}` : ''}`);
      lines.push('');
    }
    return lines.join('\n');
  },

  async exportLessonMd(courseId: string, topicIndex: number): Promise<string> {
    const session = [...store.listSessions()].find((s) => s.courseId === courseId);
    const doc = session?.lessonDoc;
    if (!session || !doc) throw new Error('No lesson open');
    void topicIndex;
    const lines: string[] = [];
    for (const b of doc.blocks) {
      if (b.kind === 'h1') lines.push(`# ${b.text}`, '');
      else if (b.kind === 'h2') lines.push(`## ${b.text}`, '');
      else if (b.kind === 'h3') lines.push(`### ${b.text}`, '');
      else lines.push(b.runs.map((r) => (r.bold ? `**${r.text}**` : r.italic ? `*${r.text}*` : r.text)).join(''), '');
    }
    return lines.join('\n');
  },

  async exportBoardMd(courseId: string): Promise<string> {
    const board = store.getBoard(courseId);
    if (!board) throw new Error('Board not found');
    const lines = [`# ${board.board.title}`, ''];
    if (board.edges.length) {
      lines.push('## Connections', '');
      for (const e of board.edges) {
        const name = (id: string) => board.cards.find((c) => c.id === id)?.content.title ?? '(deleted card)';
        lines.push(`- ${name(e.sourceCardId)} → ${name(e.targetCardId)}`);
      }
      lines.push('');
    }
    lines.push('## Cards', '');
    for (const c of board.cards) {
      lines.push(`### ${c.content.title}`, '', `*${c.creator === 'tutor' ? 'from the Tutor' : 'your card'}*`, '');
      if (c.content.body) lines.push(c.content.body, '');
      for (const b of c.content.bullets ?? []) lines.push(`- ${b}`);
      lines.push('');
    }
    return lines.join('\n');
  },
};

function courseIdOfCard(cardId: string): string | null {
  for (const courseId of Object.keys(storeListCourseIds())) {
    const board = store.getBoard(courseId);
    if (board?.cards.some((c) => c.id === cardId)) return courseId;
  }
  return null;
}

function storeListCourseIds(): string[] {
  return store.listSessions().map((s) => s.courseId).filter((c): c is string => !!c);
}

export type { ChatMessage, Course };
