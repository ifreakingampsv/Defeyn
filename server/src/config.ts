/** Server configuration from environment (see .env.example). */

function env(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

export const config = {
  port: Number(env("PORT", "8787")),
  dbPath: env("DB_PATH", "./defeyn.db"),
  llmProvider: env("LLM_PROVIDER", "auto") as "auto" | "openai" | "anthropic" | "ollama" | "local",
  openai: {
    apiKey: env("OPENAI_API_KEY", ""),
    model: env("OPENAI_MODEL", "gpt-4o-mini"),
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
