/**
 * Thin fetch wrapper around the (future) AI Tutor backend.
 *
 * Today nothing in the marketing page calls this module; the demos run on
 * `mockTutorApi`. It exists so that wiring the real backend later is a
 * configuration change, not a refactor: set `VITE_API_BASE_URL` and
 * `getTutorApi()` (see ./index.ts) hands every consumer a real client.
 */

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  constructor(
    public status: number,
    public path: string,
    body?: string,
  ) {
    super(`API ${status} on ${path}: ${body ?? ''}`);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new ApiError(res.status, path, await res.text().catch(() => undefined));
  return res.json() as Promise<T>;
}

/**
 * Streaming chat surface. The real backend will stream tutor events over SSE or
 * WebSocket; this helper consumes an SSE endpoint and yields parsed chunks.
 * Kept here so the UI layer can already be written against a stream shape.
 */
export async function* streamChat(
  sessionId: string,
  text: string,
  signal?: AbortSignal,
): AsyncGenerator<unknown> {
  const res = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, stream: true }),
    signal,
  });
  if (!res.ok || !res.body) throw new ApiError(res.status, `/api/sessions/${sessionId}/messages`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const data = line.replace(/^data: ?/gm, '');
      if (data.trim()) yield JSON.parse(data);
    }
  }
}
