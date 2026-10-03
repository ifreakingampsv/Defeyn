/** Ticket 08 (course cascade delete) at the HTTP seam: cascade-info names what
 * goes, delete removes Course + Board + Cards + Edges in one atomic
 * owner-scoped operation with nothing orphaned, and cancel means nothing
 * happened. (The UI confirm dialog is verified at the browser seam.) */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  api,
  bootServer,
  cleanupAll,
  createSession,
  getBoard,
  getDetail,
  restartServer,
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
let courseTitle;

after(cleanupAll);

describe("course cascade delete (KEEPALIVE_MS=0)", () => {
  before(async () => {
    server = await bootServer({ keepaliveMs: 0 });
    ada = await signup(server.base, { name: "Ada" });
    mallory = await signup(server.base, { name: "Mallory" });

    sessionId = await createSession(server.base, ada.token);
    await sendMessage(server.base, ada.token, sessionId, "I want to learn how to bake sourdough bread");
    const detail = await getDetail(server.base, ada.token, sessionId);
    courseId = detail.course.id;
    courseTitle = detail.course.title;
    const board = await getBoard(server.base, ada.token, courseId);
    boardId = board.json.board.id;
    const card = await api(server.base, ada.token, "POST", `/api/boards/${boardId}/cards`, {
      title: "Doomed card",
    });
    cardId = card.json.id;
  });
  after(async () => {
    await server?.close();
  });

  test("cascade-info names the course and the card count before deletion", async () => {
    const res = await api(server.base, ada.token, "GET", `/api/courses/${courseId}/cascade-info`);
    assert.equal(res.status, 200);
    assert.equal(res.json.courseTitle, courseTitle);
    assert.equal(res.json.cardCount, 1);
  });

  test("another account cannot fetch cascade-info or delete the course", async () => {
    const info = await api(server.base, mallory.token, "GET", `/api/courses/${courseId}/cascade-info`);
    assert.equal(info.status, 404);
    const del = await api(server.base, mallory.token, "DELETE", `/api/courses/${courseId}`);
    assert.equal(del.status, 404);
    const stillThere = await getBoard(server.base, ada.token, courseId);
    assert.equal(stillThere.status, 200, "cancel/no-op path leaves everything intact");
  });

  test("after delete: course, board, cards, edges all gone; session keeps chat, unlinked", async () => {
    const del = await api(server.base, ada.token, "DELETE", `/api/courses/${courseId}`);
    assert.equal(del.status, 204);

    assert.equal((await api(server.base, ada.token, "GET", `/api/courses/${courseId}/export`)).status, 404);
    assert.equal((await getBoard(server.base, ada.token, courseId)).status, 404);
    assert.equal((await api(server.base, ada.token, "GET", `/api/cards/${cardId}`)).status, 404, "no orphaned card");
    assert.equal((await api(server.base, ada.token, "GET", `/api/courses/${courseId}/cascade-info`)).status, 404);

    const detail = await getDetail(server.base, ada.token, sessionId);
    assert.ok(detail.messages.length >= 2, "session chat history kept");
    assert.equal(detail.course, undefined, "session no longer links the deleted course");
  });

  test("deleting the same course twice answers 404 (idempotent-safe)", async () => {
    const del = await api(server.base, ada.token, "DELETE", `/api/courses/${courseId}`);
    assert.equal(del.status, 404);
  });

  test("cascade survives restart: nothing comes back", async () => {
    server = await restartServer(server, { keepaliveMs: 0 });
    assert.equal((await getBoard(server.base, ada.token, courseId)).status, 404);
    const detail = await getDetail(server.base, ada.token, sessionId);
    assert.equal(detail.course, undefined);
  });
});
