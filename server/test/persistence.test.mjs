/** Scenario 6 (restart persistence — sessions, artifacts, board objects)
 *  + Scenario 9 (default DB filename: defeyn-v2.db, never the v1 defeyn.db). */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import {
  api,
  bootServer,
  cleanupAll,
  createSession,
  expectStatus,
  getBoard,
  getDetail,
  makeTempDir,
  restartServer,
  sendMessage,
  signup,
} from "./helpers.mjs";

let server;
let user;
let sessionId;
let courseId;
let card1;
let card2;
let detailBefore;

after(cleanupAll);

describe("S6 restart persistence (KEEPALIVE_MS=0)", () => {
  before(async () => {
    server = await bootServer({ keepaliveMs: 0 });
    user = await signup(server.base, { name: "Persist User" });
    sessionId = await createSession(server.base, user.token);
  });
  after(async () => {
    await server?.close();
  });

  test("setup: full product loop + board writes on the first boot", async () => {
    await sendMessage(server.base, user.token, sessionId, "I want to learn how to bake sourdough bread");
    await sendMessage(server.base, user.token, sessionId, "continue");
    await sendMessage(server.base, user.token, sessionId, "please summarize this lesson for revision");

    detailBefore = await getDetail(server.base, user.token, sessionId);
    courseId = detailBefore.course.id;

    const board = await getBoard(server.base, user.token, courseId);
    assert.equal(board.status, 200, "board exists after the goal turn");
    const boardId = board.json.board.id;

    const c1 = await api(server.base, user.token, "POST", `/api/boards/${boardId}/cards`, {
      title: "Drag me around",
      body: "autosave should keep this",
      x: 5,
      y: 6,
    });
    expectStatus(c1, [200, 201], "create card1");
    card1 = c1.json;
    expectStatus(
      await api(server.base, user.token, "PATCH", `/api/cards/${card1.id}`, { x: 123.5, y: -40 }),
      204,
      "patch card1 position",
    );
    const c2 = await api(server.base, user.token, "POST", `/api/boards/${boardId}/cards`, {
      title: "Doomed card",
      bullets: ["a", "b"],
    });
    expectStatus(c2, [200, 201], "create card2");
    card2 = c2.json;
    const edge = await api(server.base, user.token, "POST", `/api/boards/${boardId}/edges`, {
      sourceCardId: card1.id,
      targetCardId: card2.id,
    });
    expectStatus(edge, [200, 201], "create edge");

    const after2 = await getBoard(server.base, user.token, courseId);
    assert.equal(after2.json.cards.length, 4, "2 learner cards + 2 tutor cards from the notes turn");
    assert.equal(after2.json.edges.length, 1);
    const saved = after2.json.cards.find((c) => c.id === card1.id);
    assert.equal(saved.x, 123.5);
    assert.equal(saved.y, -40);
  });

  test("after a restart on the same DB_PATH, sessions + artifacts + board objects are intact", async () => {
    server = await restartServer(server, { keepaliveMs: 0 });

    const detailAfter = await getDetail(server.base, user.token, sessionId);
    assert.deepEqual(
      {
        messages: detailAfter.messages,
        course: detailAfter.course,
        lessonDoc: detailAfter.lessonDoc,
        whiteboard: detailAfter.whiteboard,
        pane: detailAfter.pane,
        lessonProgress: detailAfter.lessonProgress,
      },
      {
        messages: detailBefore.messages,
        course: detailBefore.course,
        lessonDoc: detailBefore.lessonDoc,
        whiteboard: detailBefore.whiteboard,
        pane: detailBefore.pane,
        lessonProgress: detailBefore.lessonProgress,
      },
      "every session artifact survived the restart unchanged",
    );

    const board = await getBoard(server.base, user.token, courseId);
    assert.equal(board.status, 200);
    assert.equal(board.json.cards.length, 4, "all four cards survived (2 tutor + 2 learner)");
    assert.equal(board.json.edges.length, 1, "the edge survived");
    const moved = board.json.cards.find((c) => c.id === card1.id);
    assert.deepEqual({ x: moved.x, y: moved.y }, { x: 123.5, y: -40 }, "patched position survived");
    const bulletCard = board.json.cards.find((c) => c.id === card2.id);
    assert.deepEqual(bulletCard.content.bullets, ["a", "b"], "card content survived");
  });

  test("a deleted card stays gone across another restart (and its edges with it)", async () => {
    expectStatus(
      await api(server.base, user.token, "DELETE", `/api/cards/${card2.id}`),
      204,
      "delete card2",
    );
    let board = await getBoard(server.base, user.token, courseId);
    assert.equal(board.json.cards.length, 3);
    assert.equal(board.json.edges.length, 0, "edges touching the deleted card disappeared");

    server = await restartServer(server, { keepaliveMs: 0 });
    board = await getBoard(server.base, user.token, courseId);
    assert.equal(board.json.cards.length, 3, "deleted card stayed gone");
    assert.ok(!board.json.cards.some((c) => c.id === card2.id));
    assert.equal(board.json.edges.length, 0, "deleted card's edges stayed gone");
    const kept = board.json.cards.find((c) => c.id === card1.id);
    assert.deepEqual({ x: kept.x, y: kept.y }, { x: 123.5, y: -40 });
  });
});

describe("S9 default DB filename (no DB_PATH, empty cwd)", () => {
  test("first run creates defeyn-v2.db and never the v1 defeyn.db", async () => {
    const emptyDir = makeTempDir("defeyn-default-");
    const spawned = await bootServer({ keepaliveMs: 0, dir: emptyDir, cwd: emptyDir, withDbPath: false });
    await spawned.close({ removeDir: false });
    assert.ok(existsSync(path.join(emptyDir, "defeyn-v2.db")), "default database file is defeyn-v2.db");
    assert.ok(!existsSync(path.join(emptyDir, "defeyn.db")), "the v1 defeyn.db is never created by default");
  });
});
