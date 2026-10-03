/**
 * E2E harness for the Defeyn HTTP seam.
 *
 * Boots the real server (server/src/index.ts via tsx) as a child process on a
 * random free port with a throwaway SQLite database inside a fresh temp dir.
 * Fully deterministic — no real LLM: LLM_PROVIDER=local runs the rule engine,
 * and any OPENAI_*, ANTHROPIC_* or QUICK_* variables are stripped from the
 * child env so no provider key can ever leak in (server/.env is never read
 * by the tests).
 *
 * Every test file boots its own server(s). restartServer() relaunches against
 * the SAME DB_PATH to test persistence. Teardown: SIGTERM → SIGKILL after a
 * grace period, then the temp dir is removed. A process-exit guard kills any
 * survivors so the suite can never leave a server behind.
 *
 * This file is a plain module (no tests of its own); the npm test script only
 * picks up *.test.mjs.
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export const SERVER_DIR = path.resolve(import.meta.dirname, "..");
const TSX_CLI = path.join(SERVER_DIR, "node_modules", "tsx", "dist", "cli.mjs");
const ENTRY = path.join(SERVER_DIR, "src", "index.ts");

const PORT_MIN = 8790;
const PORT_MAX = 8980;
const BOOT_TIMEOUT_MS = 15000;

const liveChildren = new Set();
const liveDirs = new Set();

// Last-resort guard: if the test process dies without running its after
// hooks, take the spawned servers with it so nothing is left listening.
process.on("exit", () => {
  for (const child of liveChildren) {
    try {
      child.kill("SIGKILL");
    } catch {
      /* already gone */
    }
  }
});

/** A random free TCP port inside the 8790–8980 band (verified by binding). */
export function freePort() {
  return new Promise((resolve, reject) => {
    const tryBind = (attemptsLeft) => {
      const port = PORT_MIN + Math.floor(Math.random() * (PORT_MAX - PORT_MIN + 1));
      const srv = net.createServer();
      srv.once("error", (err) => {
        if (err.code === "EADDRINUSE" && attemptsLeft > 0) tryBind(attemptsLeft - 1);
        else reject(err);
      });
      srv.listen(port, "127.0.0.1", () => {
        srv.close(() => resolve(port));
      });
    };
    tryBind(50);
  });
}

export function makeTempDir(label = "defeyn-e2e-") {
  const dir = mkdtempSync(path.join(os.tmpdir(), label));
  liveDirs.add(dir);
  return dir;
}

/** Boot the server as a child process and wait for /api/health.
 *
 * Options:
 *  - keepaliveMs   SSE keepalive interval (REQUIRED per test group; 0 disables)
 *  - dir           temp dir to use (default: fresh mkdtemp). For the
 *                  default-filename test pass an empty dir + withDbPath:false.
 *  - dbPath        DB file inside `dir` (default dir/test.db)
 *  - withDbPath    false → spawn with NO DB_PATH (default-filename behavior)
 *  - cwd           child cwd (default SERVER_DIR; pass an empty dir to test
 *                  default DB filename resolution)
 */
export async function bootServer({
  keepaliveMs = 0,
  dir,
  dbPath,
  withDbPath = true,
  cwd,
} = {}) {
  const tmpDir = dir ?? makeTempDir();
  liveDirs.add(tmpDir);
  const dbFile = withDbPath ? (dbPath ?? path.join(tmpDir, "test.db")) : undefined;

  // The free-port probe has a TOCTOU window (bind happens after the probe
  // closes), so a parallel test file can steal the port — retry on a fresh
  // port instead of failing the file.
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await bootOnPort({ keepaliveMs, dbFile, cwd, port: await freePort(), tmpDir });
    } catch (err) {
      const msg = String(err?.message ?? err);
      if (!msg.includes("EADDRINUSE")) throw err;
      lastErr = err;
    }
  }
  throw lastErr;
}

async function bootOnPort({ keepaliveMs, dbFile, cwd, port, tmpDir }) {
  const env = { ...process.env };
  // Never let a provider key reach the child — the suite must run the local
  // rule engine and nothing else.
  for (const key of [
    "OPENAI_API_KEY",
    "OPENAI_BASE_URL",
    "OPENAI_MODEL",
    "ANTHROPIC_API_KEY",
    "QUICK_OPENAI_API_KEY",
    "QUICK_OPENAI_BASE_URL",
    "QUICK_OPENAI_MODEL",
    "DB_PATH",
    "PORT",
    "KEEPALIVE_MS",
    "LLM_PROVIDER",
  ]) {
    delete env[key];
  }
  env.PORT = String(port);
  env.LLM_PROVIDER = "local";
  env.KEEPALIVE_MS = String(keepaliveMs);
  if (dbFile !== undefined) env.DB_PATH = dbFile;

  const child = spawn(process.execPath, [TSX_CLI, ENTRY], {
    cwd: cwd ?? SERVER_DIR,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  liveChildren.add(child);

  const logs = [];
  const capture = (chunk) => {
    for (const line of String(chunk).split("\n")) {
      if (line.trim()) logs.push(line);
    }
    if (logs.length > 60) logs.splice(0, logs.length - 60);
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  const logTail = () => logs.join("\n");

  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  for (;;) {
    if (child.exitCode !== null || child.signalCode !== null) {
      liveChildren.delete(child);
      throw new Error(`server exited early (code=${child.exitCode} signal=${child.signalCode}):\n${logTail()}`);
    }
    if (Date.now() > deadline) {
      child.kill("SIGKILL");
      liveChildren.delete(child);
      throw new Error(`server did not become healthy in ${BOOT_TIMEOUT_MS}ms:\n${logTail()}`);
    }
    try {
      const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) break;
    } catch {
      /* not up yet */
    }
    await delay(250);
  }

  let closed = false;
  const handle = {
    port,
    base,
    child,
    dir: tmpDir,
    dbPath: dbFile,
    logTail,

    /** SIGTERM → 2s grace → SIGKILL; removes the temp dir unless asked not to
     * (restartServer keeps it to reboot against the same DB). */
    async close({ removeDir = true } = {}) {
      if (closed) return;
      closed = true;
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGTERM");
        const exited = new Promise((resolve) => child.once("exit", resolve));
        const won = await Promise.race([exited, delay(2000).then(() => null)]);
        if (won === null && child.exitCode === null && child.signalCode === null) {
          child.kill("SIGKILL");
          await Promise.race([exited, delay(1500)]);
        }
      }
      liveChildren.delete(child);
      if (removeDir) {
        try {
          rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          /* best effort */
        }
        liveDirs.delete(tmpDir);
      }
    },
  };
  return handle;
}

/** Kill the same server and boot a fresh one against the SAME DB_PATH. */
export async function restartServer(handle, { keepaliveMs = 0 } = {}) {
  if (handle.dbPath === undefined) throw new Error("restartServer needs a server booted with DB_PATH");
  await handle.close({ removeDir: false });
  return bootServer({ keepaliveMs, dir: handle.dir, dbPath: handle.dbPath, withDbPath: true });
}

/** Safety net for a test file's top-level after(): kill survivors, rm dirs. */
export async function cleanupAll() {
  for (const child of [...liveChildren]) {
    try {
      child.kill("SIGKILL");
    } catch {
      /* already gone */
    }
    liveChildren.delete(child);
  }
  for (const dir of [...liveDirs]) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
    liveDirs.delete(dir);
  }
}

/* ------------------------------------------------------------ HTTP helpers */

/** One JSON request. Returns {status, json, text}; never throws on status. */
export async function api(base, token, method, urlPath, body, { timeoutMs = 15000 } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  let payload;
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${base}${urlPath}`, {
    method,
    headers,
    body: payload,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: res.status, json, text };
}

export function expectStatus(res, codes, label) {
  const list = Array.isArray(codes) ? codes : [codes];
  assert.ok(
    list.includes(res.status),
    `${label}: expected status ${list.join(" or ")}, got ${res.status}${res.text ? ` — ${res.text.slice(0, 300)}` : ""}`,
  );
}

export function uniqueEmail() {
  return `learner-${randomUUID().slice(0, 8)}@defeyn.test`;
}

/** Signup a fresh account; returns {email, password, token, user}. */
export async function signup(base, { email = uniqueEmail(), password = "correct-horse-battery", name = "Ada Lovelace" } = {}) {
  const res = await api(base, null, "POST", "/api/auth/signup", { email, password, name });
  expectStatus(res, 200, "signup");
  return { email, password, ...res.json };
}

export async function createSession(base, token) {
  const res = await api(base, token, "POST", "/api/sessions", {});
  expectStatus(res, 200, "create session");
  assert.ok(res.json?.sessionId, `create session: no sessionId in ${res.text.slice(0, 200)}`);
  return res.json.sessionId;
}

/** Non-streaming tutor turn; returns the tutor ChatMessage. */
export async function sendMessage(base, token, sessionId, text) {
  const res = await api(base, token, "POST", `/api/sessions/${sessionId}/messages`, { text });
  expectStatus(res, 200, `send message ${JSON.stringify(text)}`);
  return res.json;
}

export async function getDetail(base, token, sessionId) {
  const res = await api(base, token, "GET", `/api/sessions/${sessionId}`);
  expectStatus(res, 200, "get session detail");
  return res.json;
}

export async function getBoard(base, token, courseId) {
  return api(base, token, "GET", `/api/courses/${courseId}/board`);
}

/* ------------------------------------------------------------ SSE helpers */

/** POST the streaming endpoint and consume the whole SSE body.
 * Returns {status, raw, events, keepaliveCount, done, errors}. */
export async function postStream(base, token, sessionId, text, { timeoutMs = 30000 } = {}) {
  const res = await fetch(`${base}/api/sessions/${sessionId}/messages/stream`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const raw = await res.text();
  const events = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("data: ")) {
      try {
        events.push(JSON.parse(line.slice(6)));
      } catch {
        /* ignore malformed line */
      }
    }
  }
  const keepaliveCount = (raw.match(/^: keepalive\s*$/gm) ?? []).length;
  return {
    status: res.status,
    raw,
    events,
    keepaliveCount,
    done: [...events].reverse().find((e) => e.type === "done")?.message ?? null,
    errors: events.filter((e) => e.type === "error"),
  };
}

export const blockKinds = (message) => message.blocks.map((b) => b.kind);
