import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { initLlm } from "./llm/index.js";
import { registerRoutes } from "./routes.js";

const app = Fastify({
  logger: { level: "info" },
});

// tolerate empty JSON bodies (e.g. POST /api/sessions with no payload)
app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
  if (body === "" || body === undefined) return done(null, {});
  try {
    done(null, JSON.parse(body as string));
  } catch (err) {
    const typed = err as Error & { statusCode?: number };
    typed.statusCode = 400;
    done(typed, undefined);
  }
});

await app.register(cors, { origin: true, credentials: true });

// public health route — registered BEFORE the auth hook is scoped to /api routes
const provider = await initLlm();
app.get("/api/health", async () => ({
  ok: true,
  provider,
  time: new Date().toISOString(),
}));

registerRoutes(app);

app
  .listen({ port: config.port, host: "127.0.0.1" })
  .then((address) => {
    app.log.info(`Defeyn server on ${address} — provider: ${provider}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
