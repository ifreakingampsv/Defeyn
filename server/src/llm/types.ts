/** Provider-agnostic LLM interface. Remote providers implement this; the
 * deterministic local engine is handled separately by the tutor engine (it
 * produces structured blocks directly, no text model involved). */

export interface LlmChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmAdapter {
  readonly name: string;
  readonly model: string;
  isAvailable(): Promise<boolean>;
  /** Full completion. */
  complete(messages: LlmChatMessage[], opts?: { maxTokens?: number; json?: boolean }): Promise<string>;
  /** Token-delta stream of the same completion. */
  stream(messages: LlmChatMessage[], opts?: { maxTokens?: number; json?: boolean }): AsyncGenerator<string>;
}

/** Shared SSE-line parser for OpenAI-compatible streams. */
export async function* sseLines(res: Response): AsyncGenerator<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (trimmed.startsWith("data:")) yield trimmed.slice(5).trim();
    }
  }
}

/** NDJSON-line parser for Ollama streams. */
export async function* ndjsonLines(res: Response): AsyncGenerator<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (trimmed) yield trimmed;
    }
  }
}

/** Extract the first JSON object from a model response (handles ```json fences,
 * prose around the object, and trailing text). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object in model output");
  return JSON.parse(candidate.slice(start, end + 1));
}
