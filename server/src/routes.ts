import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { createToken, getUserFromRequest, hashPassword, id, requireAuth, verifyPassword } from "./auth.js";
import { db, now } from "./db.js";
import { store } from "./store.js";
import { boardToMarkdown, courseToMarkdown, lessonToMarkdown } from "./export.js";
import { tutorTurnStream } from "./tutor/engine.js";
import type { ChatMessage, MessageBlock, WorkingSession } from "./tutor/domain.js";
import type { TurnContext } from "./tutor/engine.js";
import { newMessage, stampBlockIds, timestampNow } from "./tutor/local.js";

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

/** SSE keepalive interval during generation (ms), 0 disables. Long LLM turns
 * send nothing between blocks; proxies/idle-timeouts kill quiet connections. */
const KEEPALIVE_MS = Math.max(0, Number(process.env.KEEPALIVE_MS ?? 15000));

/** Per-session turn lock: turns on one session run strictly one at a time
 * (queued, FIFO). Session snapshots are read inside the lock, so a concurrent
 * request — second tab, client timeout-retry — can never save a stale copy
 * over another turn's artifacts (the last-writer-wins overwrite bug). */
const sessionLocks = new Map<string, Promise<void>>();

async function withSessionLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  const prev = sessionLocks.get(sessionId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  sessionLocks.set(sessionId, gate);
  try {
    await prev.catch(() => {});
    return await fn();
  } finally {
    release();
    if (sessionLocks.get(sessionId) === gate) sessionLocks.delete(sessionId);
  }
}

/** Run one tutor turn: persist the user message (unless regenerating), stream
 * events to onEvent, persist the tutor reply and the mutated artifacts.
 * Lesson-document mutations persist through the docMutation channel: a new
 * doc replaces the row wholesale; an appended Part is written by re-reading
 * the row (store.appendDocBlocks) so learner edits made mid-turn survive. */
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

  const board = session.courseId
    ? store.getBoardByCourse(session.courseId, session.userId)
    : null;
  const spawnBoardCards = board
    ? (cards: Parameters<NonNullable<TurnContext["spawnBoardCards"]>>[0]) =>
        store.createTutorCards(session.userId, board.board.id, cards)
    : undefined;
  const docMutation: TurnContext["docMutation"] = { kind: "none", blocks: [] };

  const blocks: MessageBlock[] = [];
  let openText = "";

  for await (const ev of tutorTurnStream(session, userName, text, (course) => store.createCourse(session.userId, course), {
    spawnBoardCards,
    docMutation,
  })) {
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
  // Per-object persistence (v2): each artifact the turn touched writes its own
  // row. Nothing here rewrites unrelated artifacts — the whole-session-blob
  // overwrite race is closed structurally, not just by the turn lock.
  if (session.courseId && docMutation.kind === "replaced" && session.lessonDoc) {
    store.saveDoc(session.userId, session.courseId, session.currentTopic, session.lessonDoc);
  } else if (session.courseId && docMutation.kind === "appended" && docMutation.blocks.length) {
    const merged = store.appendDocBlocks(session.userId, session.courseId, session.currentTopic, docMutation.blocks);
    if (merged) session.lessonDoc = merged;
  }
  if (session.whiteboard) {
    store.saveWhiteboard(session.id, session.userId, session.whiteboard);
  }
  store.updateSessionMeta(session.id, {
    title: session.title,
    courseId: session.courseId,
    pane: session.pane,
    currentTopic: session.currentTopic,
    progress: session.lessonProgress,
  });
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
        currentTopic: session.currentTopic,
        seedGoal: session.seedGoal,
      };
    });

    fastify.patch("/api/sessions/:sessionId", async (req, reply) => {
      const { sessionId } = req.params as { sessionId: string };
      const { title } = (req.body as { title?: string }) ?? {};
      if (!title?.trim()) return reply.code(400).send({ error: "title required" });
      const renamed = store.renameSession(sessionId, getUserFromRequest(req).id, title);
      if (!renamed) return reply.code(404).send({ error: "Session not found" });
      return reply.code(204).send();
    });

    fastify.delete("/api/sessions/:sessionId", async (req, reply) => {
      const deleted = store.deleteSession(
        (req.params as { sessionId: string }).sessionId,
        getUserFromRequest(req).id,
      );
      if (!deleted) return reply.code(404).send({ error: "Session not found" });
      return reply.code(204).send();
    });

    fastify.post("/api/sessions/:sessionId/messages", async (req, reply) => {
      const { sessionId } = req.params as { sessionId: string };
      const { text } = (req.body as { text?: string }) ?? {};
      if (!text?.trim()) return reply.code(400).send({ error: "text required" });
      return withSessionLock(sessionId, async () => {
        const session = store.getSession(sessionId, getUserFromRequest(req).id);
        if (!session) return reply.code(404).send({ error: "Session not found" });
        return runTurn(session, text.trim());
      });
    });

    fastify.post("/api/sessions/:sessionId/messages/stream", async (req, reply) => {
      const { sessionId } = req.params as { sessionId: string };
      const { text } = (req.body as { text?: string }) ?? {};
      if (!text?.trim()) return reply.code(400).send({ error: "text required" });

      // raw writeHead bypasses @fastify/cors, so the CORS headers the JSON
      // routes get must be repeated here by hand — mirrors the plugin's
      // { origin: true, credentials: true } config (registered in index.ts)
      const origin = req.headers.origin;
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...(origin ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true", Vary: "Origin" } : {}),
      });
      reply.raw.write("retry: 2000\n\n");
      const send = (ev: unknown) => reply.raw.write(`data: ${JSON.stringify(ev)}\n\n`);
      // comment lines: ignored by SSE parsers, keep proxies/idle timers happy
      const keepalive =
        KEEPALIVE_MS > 0 ? setInterval(() => reply.raw.write(": keepalive\n\n"), KEEPALIVE_MS) : undefined;

      try {
        await withSessionLock(sessionId, async () => {
          const session = store.getSession(sessionId, getUserFromRequest(req).id);
          if (!session) throw Object.assign(new Error("Session not found"), { notFound: true });
          const message = await runTurn(session, text.trim(), (ev) => send(ev));
          send({ type: "done", message });
        });
      } catch (e) {
        const err = e as Error & { notFound?: boolean };
        send({ type: "error", error: err.message });
        if (!err.notFound) console.error("[stream]", e);
      } finally {
        if (keepalive) clearInterval(keepalive);
      }
      reply.raw.end();
      return reply;
    });

    fastify.post("/api/sessions/:sessionId/regenerate", async (req, reply) => {
      const { sessionId } = req.params as { sessionId: string };
      return withSessionLock(sessionId, async () => {
        const session = store.getSession(sessionId, getUserFromRequest(req).id);
        if (!session) return reply.code(404).send({ error: "Session not found" });
        const lastUser = [...session.messages].reverse().find((m) => m.author === "user");
        const text = lastUser?.blocks.find((b): b is Extract<MessageBlock, { kind: "text" }> => b.kind === "text")?.text;
        if (!text) return reply.code(400).send({ error: "Nothing to regenerate" });
        store.deleteTrailingTutorMessages(sessionId);
        const fresh = store.getSession(sessionId, getUserFromRequest(req).id)!;
        return runTurn(fresh, text, undefined, { skipUserMessage: true });
      });
    });

    fastify.post("/api/courses/:slug/start", async (req, reply) => {
      const preview = store.getCourseBySlug((req.params as { slug: string }).slug);
      if (!preview) return reply.code(404).send({ error: "Course not found" });
      return store.createSession(getUserFromRequest(req).id, (preview as unknown as { goal: string }).goal);
    });

    /* ---- editable Lessons (ticket 06): version-checked per-object save ---- */

    const DocBlockZ = z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("h1"), text: z.string().min(1).max(300), id: z.string().optional() }),
      z.object({ kind: z.literal("h2"), text: z.string().min(1).max(300), id: z.string().optional() }),
      z.object({ kind: z.literal("h3"), text: z.string().min(1).max(300), id: z.string().optional() }),
      z.object({
        kind: z.literal("p"),
        runs: z.array(z.object({ text: z.string().max(8000), bold: z.boolean().optional(), italic: z.boolean().optional() })).max(60),
        id: z.string().optional(),
      }),
    ]);
    const DocSaveZ = z.object({
      title: z.string().min(1).max(200).optional(),
      blocks: z.array(DocBlockZ).max(400),
      baseVersion: z.number().int().min(0).optional(),
    });

    fastify.patch("/api/sessions/:sessionId/doc", async (req, reply) => {
      const { sessionId } = req.params as { sessionId: string };
      const parsed = DocSaveZ.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "Invalid document payload" });
      const session = store.getSession(sessionId, getUserFromRequest(req).id);
      if (!session) return reply.code(404).send({ error: "Session not found" });
      if (!session.courseId || !session.lessonDoc) return reply.code(404).send({ error: "No lesson open" });
      const result = store.saveDocVersioned(
        session.userId,
        session.courseId,
        session.currentTopic,
        { title: parsed.data.title ?? session.lessonDoc.title, blocks: stampBlockIds(parsed.data.blocks) },
        parsed.data.baseVersion ?? session.lessonDoc.version,
      );
      if (!result.ok) {
        // The tutor appended a Part since this client last fetched — refuse to
        // clobber; the client re-fetches (the current doc rides the response).
        return reply.code(409).send({ error: "Document changed while you were editing", doc: result.doc });
      }
      return { doc: result.doc };
    });

    fastify.get("/api/courses-by-id/:courseId", async (req, reply) => {
      const course = store.getCourse((req.params as { courseId: string }).courseId, getUserFromRequest(req).id);
      if (!course) return reply.code(404).send({ error: "Course not found" });
      return course;
    });

    /* ---- v2 workspace objects: board / cards / edges (UI lands in ticket 03+) ---- */

    fastify.get("/api/courses/:courseId/board", async (req, reply) => {
      const data = store.getBoardByCourse((req.params as { courseId: string }).courseId, getUserFromRequest(req).id);
      if (!data) return reply.code(404).send({ error: "Board not found" });
      return data;
    });

    fastify.post("/api/boards/:boardId/cards", async (req, reply) => {
      const { boardId } = req.params as { boardId: string };
      const body = (req.body ?? {}) as {
        title?: string;
        body?: string;
        bullets?: unknown;
        x?: number;
        y?: number;
      };
      if (!body.title?.trim()) return reply.code(400).send({ error: "title required" });
      const bullets = Array.isArray(body.bullets) ? body.bullets.filter((b): b is string => typeof b === "string") : undefined;
      const board = store.getBoard(boardId, getUserFromRequest(req).id);
      if (!board) return reply.code(404).send({ error: "Board not found" });
      const card = store.createCard(getUserFromRequest(req).id, boardId, {
        title: body.title.trim().slice(0, 120),
        ...(body.body !== undefined ? { body: String(body.body).slice(0, 2000) } : {}),
        ...(bullets ? { bullets } : {}),
        ...(typeof body.x === "number" ? { x: body.x } : {}),
        ...(typeof body.y === "number" ? { y: body.y } : {}),
      });
      return reply.code(201).send(card);
    });

    fastify.patch("/api/cards/:cardId", async (req, reply) => {
      const { cardId } = req.params as { cardId: string };
      const body = (req.body ?? {}) as {
        x?: number;
        y?: number;
        title?: string;
        body?: string | null;
        bullets?: string[] | null;
      };
      if (
        body.x === undefined &&
        body.y === undefined &&
        body.title === undefined &&
        body.body === undefined &&
        body.bullets === undefined
      ) {
        return reply.code(400).send({ error: "nothing to update" });
      }
      const patch: Parameters<typeof store.updateCard>[2] = {};
      if (typeof body.x === "number") patch.x = body.x;
      if (typeof body.y === "number") patch.y = body.y;
      if (body.title !== undefined) {
        if (!body.title.trim()) return reply.code(400).send({ error: "title cannot be empty" });
        patch.title = body.title.trim().slice(0, 120);
      }
      if (body.body !== undefined) patch.body = body.body === null ? null : String(body.body).slice(0, 2000);
      if (body.bullets !== undefined) {
        patch.bullets =
          body.bullets === null ? null : Array.isArray(body.bullets) ? body.bullets.map(String) : null;
      }
      const existing = store.getCard(cardId, getUserFromRequest(req).id);
      if (!existing) return reply.code(404).send({ error: "Card not found" });
      store.updateCard(getUserFromRequest(req).id, cardId, patch);
      return reply.code(204).send();
    });

    fastify.delete("/api/cards/:cardId", async (req, reply) => {
      const { cardId } = req.params as { cardId: string };
      const existing = store.getCard(cardId, getUserFromRequest(req).id);
      if (!existing) return reply.code(404).send({ error: "Card not found" });
      store.deleteCard(getUserFromRequest(req).id, cardId);
      return reply.code(204).send();
    });

    fastify.post("/api/boards/:boardId/edges", async (req, reply) => {
      const { boardId } = req.params as { boardId: string };
      const body = (req.body ?? {}) as { sourceCardId?: string; targetCardId?: string };
      if (!body.sourceCardId || !body.targetCardId) {
        return reply.code(400).send({ error: "sourceCardId and targetCardId required" });
      }
      if (body.sourceCardId === body.targetCardId) {
        return reply.code(400).send({ error: "A Card cannot connect to itself" });
      }
      const board = store.getBoard(boardId, getUserFromRequest(req).id);
      if (!board) return reply.code(404).send({ error: "Board not found" });
      const duplicate = store
        .listEdges(boardId, getUserFromRequest(req).id)
        .find((e) => e.sourceCardId === body.sourceCardId && e.targetCardId === body.targetCardId);
      if (duplicate) return reply.code(409).send({ error: "This connection already exists" });
      const edge = store.createEdge(getUserFromRequest(req).id, boardId, body.sourceCardId, body.targetCardId);
      if (!edge) return reply.code(400).send({ error: "Both Cards must be on this board" });
      return reply.code(201).send(edge);
    });

    fastify.delete("/api/edges/:edgeId", async (req, reply) => {
      const { edgeId } = req.params as { edgeId: string };
      const existing = store.getEdge(edgeId, getUserFromRequest(req).id);
      if (!existing) return reply.code(404).send({ error: "Edge not found" });
      store.deleteEdge(getUserFromRequest(req).id, edgeId);
      return reply.code(204).send();
    });

    /* ---- export (ticket 07): pure reads, scoped to the owning user ---- */

    fastify.get("/api/courses/:courseId/export", async (req, reply) => {
      const course = store.getCourse((req.params as { courseId: string }).courseId, getUserFromRequest(req).id);
      if (!course) return reply.code(404).send({ error: "Course not found" });
      return reply.type("text/markdown; charset=utf-8").send(courseToMarkdown(course));
    });

    fastify.get("/api/courses/:courseId/lessons/:topicIndex/export", async (req, reply) => {
      const { courseId, topicIndex } = req.params as { courseId: string; topicIndex: string };
      const idx = Number(topicIndex);
      if (!Number.isInteger(idx) || idx < 0) return reply.code(400).send({ error: "Invalid topic index" });
      const doc = store.getDoc(courseId, idx, getUserFromRequest(req).id);
      if (!doc) return reply.code(404).send({ error: "Lesson not found" });
      return reply.type("text/markdown; charset=utf-8").send(lessonToMarkdown(doc));
    });

    fastify.get("/api/courses/:courseId/board/export", async (req, reply) => {
      const data = store.getBoardByCourse((req.params as { courseId: string }).courseId, getUserFromRequest(req).id);
      if (!data) return reply.code(404).send({ error: "Board not found" });
      return reply.type("text/markdown; charset=utf-8").send(boardToMarkdown(data.board, data.cards, data.edges));
    });

    /* ---- course cascade delete (ticket 08): one atomic statement ---- */

    fastify.get("/api/courses/:courseId/cascade-info", async (req, reply) => {
      const info = store.getCourseCascadeInfo(
        (req.params as { courseId: string }).courseId,
        getUserFromRequest(req).id,
      );
      if (!info) return reply.code(404).send({ error: "Course not found" });
      return { courseTitle: info.course.title, cardCount: info.cardCount };
    });

    fastify.delete("/api/courses/:courseId", async (req, reply) => {
      const deleted = store.deleteCourse(
        (req.params as { courseId: string }).courseId,
        getUserFromRequest(req).id,
      );
      if (!deleted) return reply.code(404).send({ error: "Course not found" });
      return reply.code(204).send();
    });
  });
}
