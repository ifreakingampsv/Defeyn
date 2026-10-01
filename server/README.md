# Defeyn server

Local backend for the Defeyn AI tutor: Fastify + SQLite (Node 24 built-in
`node:sqlite`, no native deps) with a pluggable LLM layer.

## Run

```bash
cd server
npm install
cp .env.example .env      # optional — defaults work with zero config
npm run dev               # http://localhost:8787
```

Point the frontend at it:

```bash
cd ../app
VITE_API_BASE_URL=http://localhost:8787 npm run dev
```

## LLM providers

`LLM_PROVIDER=auto` (default) detects in this order — the first available wins:

1. **OpenAI** — `OPENAI_API_KEY` set (or any OpenAI-compatible endpoint via
   `OPENAI_BASE_URL`: LM Studio, vLLM, Together…)
2. **Ollama** — fully local, no key: install [ollama](https://ollama.com),
   `ollama pull llama3.2`, restart the server
3. **Local rule engine** — always available fallback; deterministic replies so
   the whole product works with zero setup. It is also the behavioral spec the
   LLM prompts are written against (`src/tutor/local.ts`).

Anthropic: add `src/llm/anthropic.ts` mirroring `openai.ts` to enable.

## What the tutor does per turn

Streaming SSE (`POST /api/sessions/:id/messages/stream`) emits the frontend's
event protocol: `{type:"block"}` for structured blocks, `{type:"text-delta"}`
for streaming text, then `{type:"done", message}`. Citations reference lesson
block indices and are validated server-side. With an LLM configured, the
generation pipelines (goal→Course, topic→LessonDoc, lesson→WhiteboardGroups)
are model-generated with zod-validated JSON; any failure falls back to the
deterministic builders, so the product never breaks.

## API

See `BACKEND.md` at the repo root for the full endpoint map and the frontend
contract (`app/src/services/types.ts`).
