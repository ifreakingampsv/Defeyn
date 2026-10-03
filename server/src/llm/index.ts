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

/**
 * Second "quick model" slot — hybrid-ready, deliberately UNPOPULATED in
 * v2.0 (single-provider behavior is unchanged: with no QUICK_OPENAI_API_KEY
 * this stays null and everything routes through `llm` as before). Populating
 * it later is a config addition (QUICK_OPENAI_* env, see .env.example), not a
 * rewrite: a fast non-thinking model for interactive moments (card edits,
 * short replies) while the main provider keeps drafting big artifacts.
 */
export let quickLlm: LlmAdapter | null = null;

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

  if (config.quick.apiKey) {
    const quick = createOpenAIAdapter({
      apiKey: config.quick.apiKey,
      model: config.quick.model || config.openai.model,
      ...(config.quick.baseUrl ? { baseUrl: config.quick.baseUrl } : {}),
    });
    quickLlm = (await quick.isAvailable()) ? quick : null;
  } else {
    quickLlm = null;
  }

  return llm ? `${llm.name} (${llm.model})` : "local rule-based engine";
}
