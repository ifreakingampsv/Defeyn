import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { createToken, getUserFromRequest, hashPassword, id, requireAuth, verifyPassword } from "./auth.js";
import { db, now } from "./db.js";
import { store } from "./store.js";
import { tutorTurnStream } from "./tutor/engine.js";
import type { ChatMessage, MessageBlock, WorkingSession } from "./tutor/domain.js";
import { newMessage, timestampNow } from "./tutor/local.js";

/** All /api routes. Public: signup, login, course previews. Protected routes
 * live inside an encapsulated plugin so the auth hook cannot leak outside it.
 * The streaming endpoint emits the protocol the frontend's sendMessageStream
 * contract consumes: {type:'block'|'text-delta', ...} events, then {type:'done'}. */

const Credentials = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  name: z.string().min(1).max(60).optional(),
});

function publicUser(u: { id: string; name: string; email: string }) {
  return { id: u.id, name: u.name, email: u.email, initials: (u.name[0] ?? "?").toUpperCase() };
}

/** Run one tutor turn: persist the user message (unless regenerating), stream
 * events to onEvent, persist the tutor reply and the mutated artifacts. */
async function runTurn(
  session: WorkingSession,
  text: string,
  onEvent?: (ev: { type: "block"; block: MessageBlock } | { type: "text-delta"; delta: string }) => void,
  opts?: { skipUserMessage?: boolean },
): Promise<ChatMessage> {
  const userName =
    (db.prepare("SELECT name FROM users WHERE id = ?").get(session.userId) as { name: string } | undefined)?.name ?? "Learner";

  if (!opts?.skipUserMessage) {
    const userMsg = newMessage("user", [{ kind: "text", text }]);
    store.insertMessage(session.id, userMsg);
    session.messages.push(userMsg);
  }

  const blocks: MessageBlock[] = [];
  let openText = "";

  for await (const ev of tutorTurnStream(session, userName, text, (course) => store.createCourse(session.userId, course))) {
    if (ev.type === "text-delta") {
      openText += ev.delta;
      onEvent?.(ev);
    } else {
      if (openText) {
        blocks.push({ kind: "text", text: openText });
        openText = "";
      }
      blocks.push(ev.block);
      onEvent?.(ev);
    }
  }
  if (openText) blocks.push({ kind: "text", text: openText });

  const reply: ChatMessage = {
    id: `m_${randomUUID().slice(0, 12)}`,
    author: "tutor",
    timestamp: timestampNow(),
    blocks,
  };
  store.insertMessage(session.id, reply);
  session.messages.push(reply);
  store.persistSession(session);
  return reply;
}

export function registerRoutes(app: FastifyInstance): void {
  /* ---- public ---- */

  app.post("/api/auth/signup", async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = Credentials.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid payload" });
    const { email, password, name } = parsed.data;
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
    if (existing) return reply.code(409).send({ error: "An account with this email already exists" });
    const uid = id("u");
    const displayName = name ?? email.split("@")[0];
    db.prepare("INSERT INTO users (id, email, name, pass_hash, created_at) VALUES (?, ?, ?, ?, ?)").run(
      uid,
      email.toLowerCase(),
      displayName,
      hashPassword(password),
      now(),
    );
    const token = createToken(uid);
    return { token, user: publicUser({ id: uid, name: displayName, email }) };
  });

  app.post("/api/auth/login", async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = Credentials.omit({ name: true }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid payload" });
    const { email, password } = parsed.data;
    const row = db.prepare("SELECT id, name, email, pass_hash FROM users WHERE email = ?").get(email.toLowerCase()) as
      | { id: string; name: string; email: string; pass_hash: string }
      | undefined;
    if (!row || !verifyPassword(password, row.pass_hash)) {
      return reply.code(401).send({ error: "Wrong email or password" });
    }
    const token = createToken(row.id);
    return { token, user: publicUser(row) };
  });

  app.get("/api/courses/:slug", async (req, reply) => {
    const preview = store.getCourseBySlug((req.params as { slug: string }).slug);
    if (!preview) return reply.code(404).send({ error: "Course not found" });
    return preview;
  });

  /* ---- protected: encapsulated plugin so requireAuth cannot leak out ---- */

  app.register(async function api(fastify: FastifyInstance) {
    fastify.addHook("preHandler", requireAuth);

    fastify.post("/api/sessions", async (req) => {
      const seed = (req.body as { seedGoal?: string } | null)?.seedGoal;
      return store.createSession(getUserFromRequest(req).id, seed);
    });

    fastify.get("/api/sessions", async (req) => {
      return store.listSessions(getUserFromRequest(req).id);
    });

    fastify.get("/api/sessions/:sessionId", async (req, reply) => {
      const session = store.getSession((req.params as { sessionId: string }).sessionId, getUserFromRequest(req).id);
      if (!session) return reply.code(404).send({ error: "Session not found" });
      const summary = store.listSessions(session.userId).find((s) => s.id === session.id)!;
      return {
        session: summary,
        messages: session.messages,
        course: session.course,
        lessonDoc: session.lessonDoc,
        whiteboard: session.whiteboard,
        pane: session.pane,
        lessonProgress: session.lessonProgress,
        seedGoal: session.seedGoal,
      };
    });

    fastify.patch("/api/sessions/:sessionId", async (req, reply) => {
      const { sessionId } = req.params as { sessionId: string };
      const { title } = (req.body as { title?: string }) ?? {};
      if (!title?.trim()) return reply.code(400).send({ error: "title required" });
      store.renameSession(sessionId, getUserFromRequest(req).id, title);
      return reply.code(204).send();
    });

    fastify.delete("/api/sessions/:sessionId", async (req, reply) => {
      store.deleteSession((req.params as { sessionId: string }).sessionId, getUserFromRequest(req).id);
      return reply.code(204).send();
    });

    fastify.post("/api/sessions/:sessionId/messages", async (req, reply) => {
      const { sessionId } = req.params as { sessionId: string };
      const { text } = (req.body as { text?: string }) ?? {};
      if (!text?.trim()) return reply.code(400).send({ error: "text required" });
      const session = store.getSession(sessionId, getUserFromRequest(req).id);
      if (!session) return reply.code(404).send({ error: "Session not found" });
      return runTurn(session, text.trim());
    });

    fastify.post("/api/sessions/:sessionId/messages/stream", async (req, reply) => {
      const { sessionId } = req.params as { sessionId: string };
      const { text } = (req.body as { text?: string }) ?? {};
      if (!text?.trim()) return reply.code(400).send({ error: "text required" });
      const session = store.getSession(sessionId, getUserFromRequest(req).id);
      if (!session) return reply.code(404).send({ error: "Session not found" });

      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      reply.raw.write("retry: 2000\n\n");
      const send = (ev: unknown) => reply.raw.write(`data: ${JSON.stringify(ev)}\n\n`);

      try {
        const message = await runTurn(session, text.trim(), (ev) => send(ev));
        send({ type: "done", message });
      } catch (e) {
        send({ type: "error", error: (e as Error).message });
        console.error("[stream]", e);
      }
      reply.raw.end();
      return reply;
    });

    fastify.post("/api/sessions/:sessionId/regenerate", async (req, reply) => {
      const { sessionId } = req.params as { sessionId: string };
      const session = store.getSession(sessionId, getUserFromRequest(req).id);
      if (!session) return reply.code(404).send({ error: "Session not found" });
      const lastUser = [...session.messages].reverse().find((m) => m.author === "user");
      const text = lastUser?.blocks.find((b): b is Extract<MessageBlock, { kind: "text" }> => b.kind === "text")?.text;
      if (!text) return reply.code(400).send({ error: "Nothing to regenerate" });
      store.deleteTrailingTutorMessages(sessionId);
      const fresh = store.getSession(sessionId, getUserFromRequest(req).id)!;
      return runTurn(fresh, text, undefined, { skipUserMessage: true });
    });

    fastify.post("/api/courses/:slug/start", async (req, reply) => {
      const preview = store.getCourseBySlug((req.params as { slug: string }).slug);
      if (!preview) return reply.code(404).send({ error: "Course not found" });
      return store.createSession(getUserFromRequest(req).id, (preview as unknown as { goal: string }).goal);
    });

    fastify.get("/api/courses-by-id/:courseId", async (req, reply) => {
      const course = store.getCourse((req.params as { courseId: string }).courseId, getUserFromRequest(req).id);
      if (!course) return reply.code(404).send({ error: "Course not found" });
      return course;
    });
  });
}
