/** Server configuration from environment (see .env.example). */

function env(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

export const config = {
  port: Number(env("PORT", "8787")),
  // v2 store (per-object schema). The v1 file (defeyn.db) is never written
  // again and stays on disk as a readable archive (ADR-0001).
  dbPath: env("DB_PATH", "./defeyn-v2.db"),
  llmProvider: env("LLM_PROVIDER", "auto") as "auto" | "openai" | "anthropic" | "ollama" | "local",
  openai: {
    apiKey: env("OPENAI_API_KEY", ""),
    model: env("OPENAI_MODEL", "gpt-4o-mini"),
  },
  // Second "quick model" slot — hybrid-ready, deliberately unpopulated in
  // v2.0 (single-provider behavior unchanged). Enabling it later is a config
  // addition, not a rewrite: set QUICK_OPENAI_API_KEY (+ model/base URL).
  quick: {
    apiKey: env("QUICK_OPENAI_API_KEY", ""),
    baseUrl: env("QUICK_OPENAI_BASE_URL", ""),
    model: env("QUICK_OPENAI_MODEL", ""),
  },
  anthropic: {
    apiKey: env("ANTHROPIC_API_KEY", ""),
    model: env("ANTHROPIC_MODEL", "claude-3-5-haiku-latest"),
  },
  ollama: {
    url: env("OLLAMA_URL", "http://localhost:11434"),
    model: env("OLLAMA_MODEL", "llama3.2"),
  },
};
