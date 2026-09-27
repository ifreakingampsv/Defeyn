import type {
  ChatMessage,
  Course,
  DemoScript,
  ExploreCoursePreview,
  MessageBlock,
  SessionDetail,
  SessionSummary,
  TutorApi,
  User,
} from '../types';
import { getCurrentUser } from '../auth';
import { store, type StoredCourse } from '../mock/store';
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
    onEvent: (event: { type: 'block'; block: MessageBlock } | { type: 'done'; message: ChatMessage }) => void,
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
    onEvent({ type: 'done', message: tutor });
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
};

export type { ChatMessage, Course };
