/** Ticket 07 (Markdown export) at the HTTP seam: Course syllabus, Lesson, and
 * Board each export as valid Markdown, scoped to the owning user, stable
 * across repeated exports of unchanged data, and never mutating anything. */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  api,
  bootServer,
  cleanupAll,
  createSession,
  getBoard,
  getDetail,
  sendMessage,
  signup,
} from "./helpers.mjs";

let server;
let ada;
let mallory;
let sessionId;
let courseId;
let boardId;
let cardId;
let card2Id;

after(cleanupAll);

describe("markdown export (KEEPALIVE_MS=0)", () => {
  before(async () => {
    server = await bootServer({ keepaliveMs: 0 });
    ada = await signup(server.base, { name: "Ada" });
    mallory = await signup(server.base, { name: "Mallory" });

    sessionId = await createSession(server.base, ada.token);
    await sendMessage(server.base, ada.token, sessionId, "I want to learn how to bake sourdough bread");
    await sendMessage(server.base, ada.token, sessionId, "Continue");
    await sendMessage(server.base, ada.token, sessionId, "Give me notes for this");
    const detail = await getDetail(server.base, ada.token, sessionId);
    courseId = detail.course.id;
    assert.ok(detail.lessonDoc, "lesson doc exists for export");

    const board = await getBoard(server.base, ada.token, courseId);
    boardId = board.json.board.id;
    const c1 = await api(server.base, ada.token, "POST", `/api/boards/${boardId}/cards`, {
      title: "Starter schedule",
      bullets: ["Feed 1:1:1", "Wait 4h", "Bake"],
    });
    const c2 = await api(server.base, ada.token, "POST", `/api/boards/${boardId}/cards`, {
      title: "Oven setup",
      body: "Dutch oven at 250C, lid on 20 min.",
    });
    cardId = c1.json.id;
    card2Id = c2.json.id;
    await api(server.base, ada.token, "POST", `/api/boards/${boardId}/edges`, {
      sourceCardId: cardId,
      targetCardId: card2Id,
    });
  });
  after(async () => {
    await server?.close();
  });

  test("Course export returns valid syllabus Markdown", async () => {
    const res = await api(server.base, ada.token, "GET", `/api/courses/${courseId}/export`);
    assert.equal(res.status, 200);
    assert.match(res.text, /^# .+/);
    assert.match(res.text, /> Goal: /);
    assert.match(res.text, /## Topic /);
    const snapshot = res.text;
    const again = await api(server.base, ada.token, "GET", `/api/courses/${courseId}/export`);
    assert.equal(again.text, snapshot, "output shape stable across repeated exports");
  });

  test("Lesson export renders the document blocks", async () => {
    const res = await api(server.base, ada.token, "GET", `/api/courses/${courseId}/lessons/1/export`);
    assert.equal(res.status, 200);
    assert.match(res.text, /^# /);
    assert.match(res.text, /## Part 1: /);
    const bad = await api(server.base, ada.token, "GET", `/api/courses/${courseId}/lessons/99/export`);
    assert.equal(bad.status, 404);
  });

  test("Board export includes every card and its connections as text", async () => {
    const res = await api(server.base, ada.token, "GET", `/api/courses/${courseId}/board/export`);
    assert.equal(res.status, 200);
    assert.match(res.text, /### Starter schedule/);
    assert.match(res.text, /- Feed 1:1:1/);
    assert.match(res.text, /### Oven setup/);
    assert.match(res.text, /Starter schedule → Oven setup/);
    const snapshot = res.text;
    const again = await api(server.base, ada.token, "GET", `/api/courses/${courseId}/board/export`);
    assert.equal(again.text, snapshot, "board export stable across repeats");
  });

  test("export never mutates anything", async () => {
    const beforeBoard = await getBoard(server.base, ada.token, courseId);
    await api(server.base, ada.token, "GET", `/api/courses/${courseId}/export`);
    await api(server.base, ada.token, "GET", `/api/courses/${courseId}/board/export`);
    const afterBoard = await getBoard(server.base, ada.token, courseId);
    assert.deepEqual(afterBoard.json, beforeBoard.json);
  });

  test("export endpoints are scoped to the owning user", async () => {
    for (const path of [
      `/api/courses/${courseId}/export`,
      `/api/courses/${courseId}/lessons/1/export`,
      `/api/courses/${courseId}/board/export`,
    ]) {
      const res = await api(server.base, mallory.token, "GET", path);
      assert.equal(res.status, 404, `${path} not readable by another account`);
    }
    const noAuth = await api(server.base, null, "GET", `/api/courses/${courseId}/export`);
    assert.equal(noAuth.status, 401);
  });
});
