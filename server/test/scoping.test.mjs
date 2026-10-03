/** Scenario 7 (per-user scoping): a second account gets 404 on every read and
 * mutation of the first account's session/board/card/edge objects, while the
 * owner still sees everything intact. Scoping is by owner-scoped lookup, so
 * the answer is 404 (not 403). */

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
let alice;
let mallory;
let sessionId;
let courseId;
let boardId;
let cardId;
let edgeId;

after(cleanupAll);

describe("per-user scoping (KEEPALIVE_MS=0)", () => {
  before(async () => {
    server = await bootServer({ keepaliveMs: 0 });
    alice = await signup(server.base, { name: "Alice" });
    mallory = await signup(server.base, { name: "Mallory" });

    sessionId = await createSession(server.base, alice.token);
    await sendMessage(server.base, alice.token, sessionId, "I want to learn how to bake sourdough bread");
    const detail = await getDetail(server.base, alice.token, sessionId);
    courseId = detail.course.id;

    const board = await getBoard(server.base, alice.token, courseId);
    assert.equal(board.status, 200, "board exists for Alice's course");
    boardId = board.json.board.id;

    const card1 = await api(server.base, alice.token, "POST", `/api/boards/${boardId}/cards`, {
      title: "Alice's card",
      body: "hands off",
    });
    assert.ok([200, 201].includes(card1.status), `card created: ${card1.text}`);
    cardId = card1.json.id;
    const card2 = await api(server.base, alice.token, "POST", `/api/boards/${boardId}/cards`, {
      title: "Alice's second card",
    });
    assert.ok([200, 201].includes(card2.status), `second card created: ${card2.text}`);
    const edge = await api(server.base, alice.token, "POST", `/api/boards/${boardId}/edges`, {
      sourceCardId: cardId,
      targetCardId: card2.json.id,
    });
    assert.ok([200, 201].includes(edge.status), `edge created: ${edge.text}`);
    edgeId = edge.json.id;
  });
  after(async () => {
    await server?.close();
  });

  describe("another account cannot touch Alice's session", () => {
    test("Mallory GET Alice's session → 404", async () => {
      const res = await api(server.base, mallory.token, "GET", `/api/sessions/${sessionId}`);
      assert.equal(res.status, 404);
    });

    test("Mallory PATCH Alice's session → 404", async () => {
      const res = await api(server.base, mallory.token, "PATCH", `/api/sessions/${sessionId}`, {
        title: "hijacked",
      });
      assert.equal(res.status, 404);
    });

    test("Mallory DELETE Alice's session → 404", async () => {
      const res = await api(server.base, mallory.token, "DELETE", `/api/sessions/${sessionId}`);
      assert.equal(res.status, 404);
    });

    test("Mallory POST a message to Alice's session → 404", async () => {
      const res = await api(server.base, mallory.token, "POST", `/api/sessions/${sessionId}/messages`, {
        text: "continue",
      });
      assert.equal(res.status, 404);
    });

    test("unknown session ids answer 404 for the owner too", async () => {
      const get = await api(server.base, alice.token, "GET", "/api/sessions/s_unknown");
      assert.equal(get.status, 404);
      const post = await api(server.base, alice.token, "POST", "/api/sessions/s_unknown/messages", {
        text: "continue",
      });
      assert.equal(post.status, 404);
    });

    test("Alice still sees her session intact after all the rejected attempts", async () => {
      const detail = await getDetail(server.base, alice.token, sessionId);
      assert.equal(detail.session.id, sessionId);
      assert.equal(detail.messages.length, 2, "goal turn messages intact");
      assert.equal(detail.course.id, courseId);
      assert.notEqual(detail.session.title, "hijacked");
    });
  });

  describe("another account cannot touch Alice's board, cards or edges", () => {
    test("Mallory GET Alice's course board → 404", async () => {
      const res = await getBoard(server.base, mallory.token, courseId);
      assert.equal(res.status, 404);
    });

    test("Mallory POST a card to Alice's board → 404", async () => {
      const res = await api(server.base, mallory.token, "POST", `/api/boards/${boardId}/cards`, {
        title: "sneaky card",
      });
      assert.equal(res.status, 404);
    });

    test("Mallory PATCH Alice's card → 404", async () => {
      const res = await api(server.base, mallory.token, "PATCH", `/api/cards/${cardId}`, { x: 999, y: 999 });
      assert.equal(res.status, 404);
    });

    test("Mallory DELETE Alice's card → 404", async () => {
      const res = await api(server.base, mallory.token, "DELETE", `/api/cards/${cardId}`);
      assert.equal(res.status, 404);
    });

    test("Mallory DELETE Alice's edge → 404", async () => {
      const res = await api(server.base, mallory.token, "DELETE", `/api/edges/${edgeId}`);
      assert.equal(res.status, 404);
    });

    test("Alice's board objects are all still intact", async () => {
      const board = await getBoard(server.base, alice.token, courseId);
      assert.equal(board.status, 200);
      assert.equal(board.json.cards.length, 2);
      assert.equal(board.json.edges.length, 1);
      const card = board.json.cards.find((c) => c.id === cardId);
      assert.equal(card.content.title, "Alice's card");
      assert.notEqual(card.x, 999);
    });
  });
});
