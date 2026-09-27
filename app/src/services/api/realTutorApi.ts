import type {
  ChatMessage,
  Course,
  DemoScript,
  ExploreCoursePreview,
  MessageBlock,
  SessionDetail,
  SessionSummary,
  TutorApi,
} from '../types';
import { apiFetch, streamChat } from './client';
import { exploreCourses } from '../mock/exploreCourses';

/**
 * Real HTTP implementation of TutorApi — the thing getTutorApi() hands out when
 * VITE_API_BASE_URL is set. Endpoint map (implement these on the backend, see
 * BACKEND.md):
 *
 *   GET    /api/demo-scripts                      -> DemoScript[]
 *   POST   /api/sessions                          -> { sessionId }
 *   GET    /api/sessions                          -> SessionSummary[]
 *   GET    /api/sessions/:id                      -> SessionDetail
 *   POST   /api/sessions/:id/messages             -> ChatMessage          (non-streaming)
 *   POST   /api/sessions/:id/messages  {stream}   -> SSE of TutorStreamEvent (streaming)
 *   POST   /api/sessions/:id/regenerate           -> ChatMessage
 *   PATCH  /api/sessions/:id        {title}       -> 204
 *   DELETE /api/sessions/:id                      -> 204
 *   GET    /api/courses/:id                       -> Course
 *
 * TutorStreamEvent = { type: 'block', block: MessageBlock } | { type: 'done', message: ChatMessage }
 * Explore courses are bundled frontend content; a backend may later serve them per slug.
 */

function sseToEvent(data: string): { type: 'block'; block: MessageBlock } | { type: 'done'; message: ChatMessage } {
  return JSON.parse(data);
}

export const realTutorApi: TutorApi = {
  async getDemoScripts(): Promise<DemoScript[]> {
    return apiFetch<DemoScript[]>('/api/demo-scripts');
  },
  async getExploreCourses(): Promise<ExploreCoursePreview[]> {
    return exploreCourses;
  },

  async createSession() {
    return apiFetch<{ sessionId: string }>('/api/sessions', { method: 'POST' });
  },

  async listSessions(): Promise<SessionSummary[]> {
    return apiFetch<SessionSummary[]>('/api/sessions');
  },

  async sendMessage(sessionId, text): Promise<ChatMessage> {
    return apiFetch<ChatMessage>(`/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async sendMessageStream(sessionId, text, onEvent): Promise<ChatMessage> {
    let final: ChatMessage | null = null;
    for await (const data of streamChat(sessionId, text)) {
      const ev = sseToEvent(String(data));
      if (ev.type === 'done') final = ev.message;
      else onEvent(ev);
    }
    if (!final) throw new Error('Stream ended without a done event');
    onEvent({ type: 'done', message: final });
    return final;
  },

  async regenerateLast(sessionId): Promise<ChatMessage> {
    return apiFetch<ChatMessage>(`/api/sessions/${sessionId}/regenerate`, { method: 'POST' });
  },

  async renameSession(sessionId, title): Promise<void> {
    await apiFetch<null>(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  },

  async deleteSession(sessionId): Promise<void> {
    await apiFetch<null>(`/api/sessions/${sessionId}`, { method: 'DELETE' });
  },

  async getSession(sessionId): Promise<SessionDetail> {
    return apiFetch<SessionDetail>(`/api/sessions/${sessionId}`);
  },

  async getCourse(courseId) {
    return apiFetch<Course>(`/api/courses/${courseId}`);
  },

  async getCourseBySlug(slug): Promise<ExploreCoursePreview | null> {
    return exploreCourses.find((c) => c.slug === slug) ?? null;
  },

  async startCourse(slug) {
    return apiFetch<{ sessionId: string } | null>(`/api/courses/${slug}/start`, { method: 'POST' });
  },
};
