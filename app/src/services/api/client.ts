/**
 * Thin HTTP client for the Defeyn backend (server/src).
 * Reads the base URL + bearer token at call time so both the mock build
 * (no base URL — this module stays unused) and the real build work.
 */

export function apiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? "";
}

const TOKEN_KEY = "defeyn-auth-token";

export function getAuthToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setAuthToken(token: string): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public path: string,
    public body?: string,
  ) {
    super(`API ${status} on ${path}: ${body ?? ""}`);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  });
  if (!res.ok) throw new ApiError(res.status, path, await res.text().catch(() => undefined));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type StreamEvent =
  | { type: "block"; block: unknown }
  | { type: "text-delta"; delta: string }
  | { type: "done"; message: unknown }
  | { type: "error"; error: string };

/** Consume the tutor's SSE stream for one user message. */
export async function streamTutorMessage(
  sessionId: string,
  text: string,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const res = await fetch(`${apiBaseUrl()}/api/sessions/${sessionId}/messages/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
    body: JSON.stringify({ text }),
  });
  if (!res.ok || !res.body) throw new ApiError(res.status, `/api/sessions/${sessionId}/messages/stream`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const data = part
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("");
      if (!data) continue;
      try {
        onEvent(JSON.parse(data) as StreamEvent);
      } catch {
        /* malformed chunk */
      }
    }
  }
}
