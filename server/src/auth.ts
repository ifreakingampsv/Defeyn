import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db, id, now } from "./db.js";

/**
 * Auth: scrypt-hashed passwords + opaque bearer tokens (DB-backed).
 * Real accounts replace the frontend's localStorage mock (auth.ts) — the
 * frontend sends `Authorization: Bearer <token>` on every API call.
 */

export interface AuthedUser {
  id: string;
  name: string;
  email: string;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function createToken(userId: string): string {
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO auth_tokens (token, user_id, created_at) VALUES (?, ?, ?)").run(token, userId, now());
  return token;
}

export function getUserByToken(token: string): AuthedUser | null {
  const row = db
    .prepare(
      "SELECT u.id, u.name, u.email FROM auth_tokens t JOIN users u ON u.id = t.user_id WHERE t.token = ?",
    )
    .get(token) as AuthedUser | undefined;
  return row ?? null;
}

/** Fastify preHandler: require a valid bearer token, attach request.user. */
export function requireAuth(request: FastifyRequest, reply: FastifyReply, done: () => void): void {
  const header = request.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const user = token ? getUserByToken(token) : null;
  if (!user) {
    reply.code(401).send({ error: "Not authenticated" });
    return;
  }
  (request as FastifyRequest & { user: AuthedUser }).user = user;
  done();
}

export function getUserFromRequest(request: FastifyRequest): AuthedUser {
  return (request as FastifyRequest & { user: AuthedUser }).user;
}

export { id };
