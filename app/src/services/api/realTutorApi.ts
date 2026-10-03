import type {
  BoardCard,
  BoardEdge,
  BoardState,
  ChatMessage,
  Course,
  DemoScript,
  ExploreCoursePreview,
  LessonDoc,
  MessageBlock,
  SessionDetail,
  SessionSummary,
  TutorApi,
} from "../types";
import { ApiError, apiBaseUrl, apiFetch, getAuthToken, streamTutorMessage, type StreamEvent } from "./client";
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

  // ---- v2 Board surface ----

  async getBoard(courseId) {
    return apiFetch<BoardState | null>(`/api/courses/${courseId}/board`);
  },

  async createCard(boardId, input) {
    return apiFetch<BoardCard>(`/api/boards/${boardId}/cards`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateCard(cardId, patch) {
    await apiFetch<null>(`/api/cards/${cardId}`, { method: "PATCH", body: JSON.stringify(patch) });
  },

  async deleteCard(cardId) {
    await apiFetch<null>(`/api/cards/${cardId}`, { method: "DELETE" });
  },

  async createEdge(boardId, sourceCardId, targetCardId) {
    return apiFetch<BoardEdge>(`/api/boards/${boardId}/edges`, {
      method: "POST",
      body: JSON.stringify({ sourceCardId, targetCardId }),
    });
  },

  async deleteEdge(edgeId) {
    await apiFetch<null>(`/api/edges/${edgeId}`, { method: "DELETE" });
  },

  /** Learner lesson save (ticket 06): version-checked per-object write. A 409
   * means the tutor appended a Part since this client fetched — the server's
   * current doc rides the response so the editor can reconcile. */
  async saveLessonDoc(sessionId, doc, baseVersion) {
    try {
      const res = await apiFetch<{ doc: LessonDoc }>(`/api/sessions/${sessionId}/doc`, {
        method: "PATCH",
        body: JSON.stringify({
          title: doc.title,
          blocks: doc.blocks,
          ...(baseVersion !== undefined ? { baseVersion } : {}),
        }),
      });
      return { ok: true, doc: res.doc };
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.body) {
        try {
          const parsed = JSON.parse(e.body) as { doc?: LessonDoc };
          if (parsed.doc) return { ok: false, doc: parsed.doc };
        } catch {
          /* fall through to rethrow */
        }
      }
      throw e;
    }
  },

  // ---- Course cascade delete (ticket 08) ----

  async getCourseCascadeInfo(courseId) {
    return apiFetch<{ courseTitle: string; cardCount: number } | null>(`/api/courses/${courseId}/cascade-info`);
  },

  async deleteCourse(courseId) {
    await apiFetch<null>(`/api/courses/${courseId}`, { method: "DELETE" });
  },

  // ---- Markdown export (ticket 07): text/markdown bodies, not JSON ----

  async exportCourseMd(courseId: string) {
    return exportMd(`/api/courses/${courseId}/export`);
  },

  async exportLessonMd(courseId: string, topicIndex: number) {
    return exportMd(`/api/courses/${courseId}/lessons/${topicIndex}/export`);
  },

  async exportBoardMd(courseId: string) {
    return exportMd(`/api/courses/${courseId}/board/export`);
  },
};

async function exportMd(path: string): Promise<string> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  if (!res.ok) throw new ApiError(res.status, path, await res.text().catch(() => undefined));
  return res.text();
}
