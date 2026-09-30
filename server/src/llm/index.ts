import { config } from "../config.js";
import { createOllamaAdapter } from "./ollama.js";
import { createOpenAIAdapter } from "./openai.js";
import type { LlmAdapter } from "./types.js";

export type { LlmAdapter, LlmChatMessage } from "./types.js";
export { extractJson } from "./types.js";

/**
 * Provider selection. LLM_PROVIDER=auto detects in this order:
 *   openai (key present) -> anthropic -> ollama (reachable) -> none
 * `none` means the tutor engine uses the deterministic local engine — the
 * whole product still works, replies just aren't LLM-generated.
 * Anthropic: add an adapter in llm/anthropic.ts mirroring openai.ts when you
 * want it; the key alone does not enable it yet.
 */
export let llm: LlmAdapter | null = null;

export async function initLlm(): Promise<string> {
  const preferred = config.llmProvider;
  const candidates: LlmAdapter[] = [];
  if (config.openai.apiKey) candidates.push(createOpenAIAdapter());
  if (config.ollama.url) candidates.push(createOllamaAdapter());

  if (preferred !== "auto") {
    const chosen = candidates.find((c) => c.name === preferred) ?? null;
    if (preferred !== "local" && chosen && (await chosen.isAvailable())) {
      llm = chosen;
    } else {
      llm = null;
    }
  } else {
    for (const c of candidates) {
      if (await c.isAvailable()) {
        llm = c;
        break;
      }
    }
  }
  return llm ? `${llm.name} (${llm.model})` : "local rule-based engine";
}
