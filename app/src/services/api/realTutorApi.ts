import type {
  ChatMessage,
  Course,
  DemoScript,
  ExploreCoursePreview,
  MessageBlock,
  SessionDetail,
  SessionSummary,
  TutorApi,
} from "../types";
import { apiFetch, streamTutorMessage, type StreamEvent } from "./client";
import { demoScripts } from "../mock/demoData";
import { exploreCourses } from "../mock/exploreCourses";

/**
 * Real HTTP implementation of TutorApi — getTutorApi() hands this out when
 * VITE_API_BASE_URL is set. Endpoint map (implemented in server/src/routes.ts):
 *
 *   POST   /api/auth/signup|login                  -> { token, user }
 *   POST   /api/sessions                           -> { sessionId }
 *   GET    /api/sessions                           -> SessionSummary[]
 *   GET    /api/sessions/:id                       -> SessionDetail
 *   PATCH  /api/sessions/:id {title}               -> 204
 *   DELETE /api/sessions/:id                       -> 204
 *   POST   /api/sessions/:id/messages              -> ChatMessage
 *   POST   /api/sessions/:id/messages/stream       -> SSE stream (block|text-delta|done)
 *   POST   /api/sessions/:id/regenerate            -> ChatMessage
 *   POST   /api/courses/:slug/start                -> { sessionId }
 *
 * Marketing fixtures (demo scripts, explore-course previews) ship with the
 * bundle — they are static site content; everything user-owned lives on the
 * server.
 */

function toStreamEvent(ev: StreamEvent): { type: "block"; block: MessageBlock } | { type: "text-delta"; delta: string } | null {
  if (ev.type === "block") return { type: "block", block: ev.block as MessageBlock };
  if (ev.type === "text-delta") return { type: "text-delta", delta: ev.delta };
  return null;
}

export const realTutorApi: TutorApi = {
  async getDemoScripts(): Promise<DemoScript[]> {
    return demoScripts;
  },
  async getExploreCourses(): Promise<ExploreCoursePreview[]> {
    return exploreCourses;
  },

  async createSession() {
    return apiFetch<{ sessionId: string }>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async listSessions(): Promise<SessionSummary[]> {
    return apiFetch<SessionSummary[]>("/api/sessions");
  },

  async sendMessage(sessionId, text): Promise<ChatMessage> {
    return apiFetch<ChatMessage>(`/api/sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  async sendMessageStream(sessionId, text, onEvent): Promise<ChatMessage> {
    let final: ChatMessage | null = null;
    await streamTutorMessage(sessionId, text, (ev) => {
      if (ev.type === "done") {
        final = ev.message as ChatMessage;
        return;
      }
      if (ev.type === "error") throw new Error(ev.error);
      const mapped = toStreamEvent(ev);
      if (mapped) onEvent(mapped);
    });
    if (!final) throw new Error("Stream ended without a done event");
    return final;
  },

  async regenerateLast(sessionId): Promise<ChatMessage> {
    return apiFetch<ChatMessage>(`/api/sessions/${sessionId}/regenerate`, { method: "POST" });
  },

  async renameSession(sessionId, title): Promise<void> {
    await apiFetch<null>(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  },

  async deleteSession(sessionId): Promise<void> {
    await apiFetch<null>(`/api/sessions/${sessionId}`, { method: "DELETE" });
  },

  async getSession(sessionId): Promise<SessionDetail> {
    return apiFetch<SessionDetail>(`/api/sessions/${sessionId}`);
  },

  async getCourse(courseId) {
    return apiFetch<Course>(`/api/courses-by-id/${courseId}`);
  },

  async getCourseBySlug(slug): Promise<ExploreCoursePreview | null> {
    return exploreCourses.find((c) => c.slug === slug) ?? null;
  },

  async startCourse(slug) {
    return apiFetch<{ sessionId: string } | null>(`/api/courses/${slug}/start`, { method: "POST" });
  },
};
