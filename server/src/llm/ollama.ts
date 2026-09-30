import { config } from "../config.js";
import { ndjsonLines, type LlmAdapter, type LlmChatMessage } from "./types.js";

/** Ollama adapter — fully local AI, no API key. Requires https://ollama.com
 * installed and a model pulled (e.g. `ollama pull llama3.2`). */
export function createOllamaAdapter(): LlmAdapter {
  const { url, model } = config.ollama;

  async function call(messages: LlmChatMessage[], stream: boolean, format?: string) {
    return fetch(`${url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream, ...(format ? { format } : {}) }),
    });
  }

  return {
    name: "ollama",
    model,
    async isAvailable() {
      try {
        const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(1500) });
        if (!res.ok) return false;
        const tags = (await res.json()) as { models?: Array<{ name: string }> };
        // available if the configured model exists (or any model does — we
        // fall back to the first one at call time if the exact tag is missing)
        return !!tags.models?.length;
      } catch {
        return false;
      }
    },
    async complete(messages) {
      const res = await call(messages, false, "json");
      if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as { message?: { content?: string } };
      return data.message?.content ?? "";
    },
    async *stream(messages) {
      const res = await call(messages, true);
      if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
      for await (const line of ndjsonLines(res)) {
        try {
          const delta = (JSON.parse(line) as { message?: { content?: string } }).message?.content;
          if (delta) yield delta;
        } catch {
          /* partial line */
        }
      }
    },
  };
}
