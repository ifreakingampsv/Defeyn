/** Scenario 8 (board/card/edge rules) + the per-object autosave guarantee:
 * a PATCHed card position is never reverted by an unrelated session turn. */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  api,
  bootServer,
  cleanupAll,
  createSession,
  expectStatus,
  getBoard,
  getDetail,
  sendMessage,
  signup,
} from "./helpers.mjs";

let server;
let user;
let boardId;
let board1Course;
let secondBoardId;
let card1;
let card2;
let otherBoardCard;
let edgeId;

async function createCard(board, body) {
  const res = await api(server.base, user.token, "POST", `/api/boards/${board}/cards`, body);
  expectStatus(res, [200, 201], `create card ${JSON.stringify(body)}`);
  return res.json;
}

after(cleanupAll);

describe("board / card / edge rules (KEEPALIVE_MS=0)", () => {
  before(async () => {
    server = await bootServer({ keepaliveMs: 0 });
    user = await signup(server.base, { name: "Board User" });

    // first course + board
    const sid1 = await createSession(server.base, user.token);
    await sendMessage(server.base, user.token, sid1, "I want to learn how to bake sourdough bread");
    const detail1 = await getDetail(server.base, user.token, sid1);
    board1Course = detail1.course.id;
    const b1 = await getBoard(server.base, user.token, board1Course);
    assert.equal(b1.status, 200);
    boardId = b1.json.board.id;

    // second course + board (used for the cross-board edge case)
    const sid2 = await createSession(server.base, user.token);
    await sendMessage(server.base, user.token, sid2, "I want to master chess endgames");
    const detail2 = await getDetail(server.base, user.token, sid2);
    const b2 = await getBoard(server.base, user.token, detail2.course.id);
    assert.equal(b2.status, 200);
    secondBoardId = b2.json.board.id;
    assert.notEqual(boardId, secondBoardId, "each course got its own board");
  });
  after(async () => {
    await server?.close();
  });

  test("S8: create a card with body + position → learner card without citation", async () => {
    card1 = await createCard(boardId, { title: "Core idea", body: "The central claim", x: 10, y: 20 });
    assert.equal(card1.boardId, boardId);
    assert.equal(card1.creator, "learner");
    assert.equal(card1.citation, null);
    assert.deepEqual(card1.content, { title: "Core idea", body: "The central claim" });
    assert.equal(card1.x, 10);
    assert.equal(card1.y, 20);
    assert.ok(card1.updatedAt !== undefined);
  });

  test("S8: create a card with bullet content", async () => {
    card2 = await createCard(boardId, { title: "Checklist", bullets: ["one", "two"] });
    assert.deepEqual(card2.content, { title: "Checklist", bullets: ["one", "two"] });
    assert.equal(card2.content.body, undefined);
  });

  test("S8: a card without a title is rejected with 400", async () => {
    const res = await api(server.base, user.token, "POST", `/api/boards/${boardId}/cards`, { body: "no title" });
    assert.equal(res.status, 400);
  });

  test("S8: PATCH position → 204, persisted, content untouched", async () => {
    expectStatus(await api(server.base, user.token, "PATCH", `/api/cards/${card1.id}`, { x: -33.5, y: 120 }), 204);
    const board = await getBoard(server.base, user.token, board1Course);
    const saved = board.json.cards.find((c) => c.id === card1.id);
    assert.deepEqual({ x: saved.x, y: saved.y }, { x: -33.5, y: 120 });
    assert.deepEqual(saved.content, { title: "Core idea", body: "The central claim" });
  });

  test("S8: PATCH content → 204, persisted, other cards untouched", async () => {
    expectStatus(
      await api(server.base, user.token, "PATCH", `/api/cards/${card2.id}`, {
        title: "Checklist v2",
        body: "now with a body",
      }),
      204,
    );
    const board = await getBoard(server.base, user.token, board1Course);
    const saved = board.json.cards.find((c) => c.id === card2.id);
    assert.deepEqual(saved.content, { title: "Checklist v2", body: "now with a body", bullets: ["one", "two"] });
    const other = board.json.cards.find((c) => c.id === card1.id);
    assert.equal(other.content.title, "Core idea", "sibling card unaffected");
  });

  test("per-object autosave: a PATCHed position survives an unrelated tutor turn", async () => {
    expectStatus(await api(server.base, user.token, "PATCH", `/api/cards/${card1.id}`, { x: 500, y: -12 }), 204);
    const sidForTurn = await createSession(server.base, user.token);
    await sendMessage(server.base, user.token, sidForTurn, "I want to learn how to bake sourdough bread");
    await sendMessage(server.base, user.token, sidForTurn, "continue");

    const board = await getBoard(server.base, user.token, board1Course);
    const saved = board.json.cards.find((c) => c.id === card1.id);
    assert.deepEqual({ x: saved.x, y: saved.y }, { x: 500, y: -12 }, "position not reverted by the tutor turn");
  });

  test("S8: connect two cards → the edge appears in GET board", async () => {
    const res = await api(server.base, user.token, "POST", `/api/boards/${boardId}/edges`, {
      sourceCardId: card1.id,
      targetCardId: card2.id,
    });
    expectStatus(res, [200, 201], "create edge");
    edgeId = res.json;
    assert.equal(edgeId.boardId, boardId);
    assert.equal(edgeId.sourceCardId, card1.id);
    assert.equal(edgeId.targetCardId, card2.id);
    const board = await getBoard(server.base, user.token, board1Course);
    assert.equal(board.json.edges.length, 1);
    assert.deepEqual(
      { s: board.json.edges[0].sourceCardId, t: board.json.edges[0].targetCardId },
      { s: card1.id, t: card2.id },
    );
  });

  test("S8: a self-edge is rejected with 400", async () => {
    const res = await api(server.base, user.token, "POST", `/api/boards/${boardId}/edges`, {
      sourceCardId: card1.id,
      targetCardId: card1.id,
    });
    assert.equal(res.status, 400);
  });

  test("S8: an edge across two different boards is rejected (400/404)", async () => {
    otherBoardCard = await createCard(secondBoardId, { title: "Other board card" });
    const forward = await api(server.base, user.token, "POST", `/api/boards/${boardId}/edges`, {
      sourceCardId: card1.id,
      targetCardId: otherBoardCard.id,
    });
    assert.ok([400, 404].includes(forward.status), `cross-board edge forward: ${forward.status}`);
    const backward = await api(server.base, user.token, "POST", `/api/boards/${secondBoardId}/edges`, {
      sourceCardId: otherBoardCard.id,
      targetCardId: card1.id,
    });
    assert.ok([400, 404].includes(backward.status), `cross-board edge backward: ${backward.status}`);
  });

  test("S8: a duplicate edge pair is rejected with 409", async () => {
    const res = await api(server.base, user.token, "POST", `/api/boards/${boardId}/edges`, {
      sourceCardId: card1.id,
      targetCardId: card2.id,
    });
    assert.equal(res.status, 409);
  });

  test("S8: edge payloads missing an endpoint are rejected with 400", async () => {
    const empty = await api(server.base, user.token, "POST", `/api/boards/${boardId}/edges`, {});
    assert.equal(empty.status, 400);
    const half = await api(server.base, user.token, "POST", `/api/boards/${boardId}/edges`, {
      sourceCardId: card1.id,
    });
    assert.equal(half.status, 400);
  });

  test("S8: unknown ids answer 404 across board/card/edge routes", async () => {
    expectStatus(await getBoard(server.base, user.token, "c_unknown"), 404, "unknown course board");
    expectStatus(
      await api(server.base, user.token, "POST", "/api/boards/b_unknown/cards", { title: "x" }),
      404,
      "unknown board card create",
    );
    expectStatus(
      await api(server.base, user.token, "PATCH", "/api/cards/card_unknown", { x: 1 }),
      404,
      "unknown card patch",
    );
    expectStatus(
      await api(server.base, user.token, "DELETE", "/api/cards/card_unknown"),
      404,
      "unknown card delete",
    );
    expectStatus(
      await api(server.base, user.token, "POST", "/api/boards/b_unknown/edges", {
        sourceCardId: card1.id,
        targetCardId: card2.id,
      }),
      404,
      "unknown board edge create",
    );
    expectStatus(
      await api(server.base, user.token, "DELETE", "/api/edges/edge_unknown"),
      404,
      "unknown edge delete",
    );
  });

  test("S8: deleting a card removes the edges that touch it", async () => {
    expectStatus(await api(server.base, user.token, "DELETE", `/api/cards/${card2.id}`), 204, "delete card2");
    const board = await getBoard(server.base, user.token, board1Course);
    assert.ok(!board.json.cards.some((c) => c.id === card2.id), "card gone from the board");
    assert.equal(board.json.edges.length, 0, "its edge disappeared");
  });

  test("S8: edges cannot reference a card that is no longer on the board", async () => {
    const res = await api(server.base, user.token, "POST", `/api/boards/${boardId}/edges`, {
      sourceCardId: card1.id,
      targetCardId: card2.id,
    });
    assert.ok([400, 404].includes(res.status), `edge to deleted card: ${res.status}`);
  });
});
