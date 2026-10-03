import { config } from "../config.js";
import { extractJson, sseLines, type LlmAdapter, type LlmChatMessage } from "./types.js";

/** OpenAI chat-completions adapter (works with any OpenAI-compatible endpoint
 * by overriding OPENAI_BASE_URL, e.g. LM Studio, vLLM, Together). The optional
 * overrides parameter exists for the second "quick model" slot — the main
 * provider is constructed with no arguments and reads the environment. */
export function createOpenAIAdapter(overrides?: { apiKey?: string; model?: string; baseUrl?: string }): LlmAdapter {
  const base = overrides?.baseUrl?.trim() || process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
  const apiKey = overrides?.apiKey ?? config.openai.apiKey;
  const model = overrides?.model ?? config.openai.model;

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

  /** HTTP failures become typed errors: `status` lets callers skip futile
   * retries (401/403/404), `retryAfterSeconds` feeds 429 backoff. */
  async function toHttpError(res: Response): Promise<Error & { status?: number; retryAfterSeconds?: number }> {
    const err = new Error(`OpenAI ${res.status}: ${await res.text().catch(() => "")}`) as Error & {
      status?: number;
      retryAfterSeconds?: number;
    };
    err.status = res.status;
    const ra = Number(res.headers.get("retry-after"));
    if (!Number.isNaN(ra) && ra > 0) err.retryAfterSeconds = ra;
    return err;
  }

  return {
    name: "openai",
    model,
    async isAvailable() {
      return !!apiKey;
    },
    async complete(messages, opts) {
      const res = await call(messages, !!opts?.json, false, opts?.maxTokens);
      if (!res.ok) throw await toHttpError(res);
      const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
      const content = data.choices[0]?.message?.content;
      if (!content) throw new Error("Empty completion (truncated at max_tokens, or reasoning-only output)");
      return content;
    },
    async *stream(messages, opts) {
      const res = await call(messages, !!opts?.json, true, opts?.maxTokens);
      if (!res.ok) throw await toHttpError(res);
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
