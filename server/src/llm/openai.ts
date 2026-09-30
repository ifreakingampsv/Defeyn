import { config } from "../config.js";
import { extractJson, sseLines, type LlmAdapter, type LlmChatMessage } from "./types.js";

/** OpenAI chat-completions adapter (works with any OpenAI-compatible endpoint
 * by overriding OPENAI_BASE_URL, e.g. LM Studio, vLLM, Together). */
export function createOpenAIAdapter(): LlmAdapter {
  const base = process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
  const { apiKey, model } = config.openai;

  async function call(messages: LlmChatMessage[], json: boolean, stream: boolean, maxTokens?: number) {
    return fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        stream,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      }),
    });
  }

  return {
    name: "openai",
    model,
    async isAvailable() {
      return !!apiKey;
    },
    async complete(messages, opts) {
      const res = await call(messages, !!opts?.json, false, opts?.maxTokens);
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
      return data.choices[0].message.content;
    },
    async *stream(messages, opts) {
      const res = await call(messages, !!opts?.json, true, opts?.maxTokens);
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
      for await (const data of sseLines(res)) {
        if (data === "[DONE]") return;
        try {
          const delta = (JSON.parse(data) as { choices: Array<{ delta?: { content?: string } }> }).choices[0].delta
            ?.content;
          if (delta) yield delta;
        } catch {
          /* keep-alive or malformed chunk */
        }
      }
    },
  };
}

/** Helper for structured output: complete + parse + (zod) validate happens at
 * the call site; this only unwraps fenced JSON. */
export async function completeJson<T>(adapter: LlmAdapter, messages: LlmChatMessage[], parse: (v: unknown) => T): Promise<T> {
  const raw = await adapter.complete(messages, { json: true });
  return parse(extractJson(raw));
}
