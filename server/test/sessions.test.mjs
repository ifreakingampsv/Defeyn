/** Scenario 2 (session CRUD) + Scenario 5 (regenerate). One server for the
 * whole file (booted at file level); each describe gets its own accounts. */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  api,
  bootServer,
  cleanupAll,
  createSession,
  expectStatus,
  getDetail,
  sendMessage,
  signup,
} from "./helpers.mjs";

let server;
let user;
let sessionId;

before(async () => {
  server = await bootServer({ keepaliveMs: 0 });
  user = await signup(server.base);
  sessionId = await createSession(server.base, user.token);
});
after(async () => {
  await server?.close();
});
after(cleanupAll);

describe("session CRUD (KEEPALIVE_MS=0)", () => {
  test("S2: POST /api/sessions with empty JSON body returns a sessionId", async () => {
    assert.ok(sessionId);
    const res = await api(server.base, user.token, "GET", `/api/sessions/${sessionId}`);
    assert.equal(res.status, 200);
    assert.equal(res.json.session.id, sessionId);
    assert.equal(res.json.session.title, "New session");
    assert.equal(res.json.pane, "syllabus");
    assert.deepEqual(res.json.messages, []);
    assert.equal(res.json.course, undefined);
  });

  test("S2: the session appears in GET /api/sessions as a summary", async () => {
    const res = await api(server.base, user.token, "GET", "/api/sessions");
    assert.equal(res.status, 200);
    const summary = res.json.find((s) => s.id === sessionId);
    assert.ok(summary, "session listed");
    assert.equal(summary.title, "New session");
    assert.equal(typeof summary.updatedTs, "number");
    assert.equal(typeof summary.updatedLabel, "string");
    assert.equal(summary.courseId, undefined);
  });

  test("S2: PATCH title → 204 and the rename shows in list + detail", async () => {
    const patch = await api(server.base, user.token, "PATCH", `/api/sessions/${sessionId}`, {
      title: "Real analysis drilling",
    });
    assert.equal(patch.status, 204);
    const list = await api(server.base, user.token, "GET", "/api/sessions");
    assert.equal(list.json.find((s) => s.id === sessionId).title, "Real analysis drilling");
    const detail = await getDetail(server.base, user.token, sessionId);
    assert.equal(detail.session.title, "Real analysis drilling");
  });

  test("S2: PATCH without a (non-blank) title is rejected with 400", async () => {
    const empty = await api(server.base, user.token, "PATCH", `/api/sessions/${sessionId}`, {});
    assert.equal(empty.status, 400);
    const blank = await api(server.base, user.token, "PATCH", `/api/sessions/${sessionId}`, { title: "   " });
    assert.equal(blank.status, 400);
  });

  test("S2: DELETE → 204, then GET detail 404 and the session leaves the list", async () => {
    const doomed = await createSession(server.base, user.token);
    const del = await api(server.base, user.token, "DELETE", `/api/sessions/${doomed}`);
    assert.equal(del.status, 204);
    const gone = await api(server.base, user.token, "GET", `/api/sessions/${doomed}`);
    assert.equal(gone.status, 404);
    const list = await api(server.base, user.token, "GET", "/api/sessions");
    assert.ok(!list.json.some((s) => s.id === doomed), "deleted session is gone from the list");
  });

  test("S2: unknown session id answers 404", async () => {
    const res = await api(server.base, user.token, "GET", "/api/sessions/s_does_not_exist");
    assert.equal(res.status, 404);
  });

  test("S2: posting an empty message body is rejected with 400", async () => {
    const res = await api(server.base, user.token, "POST", `/api/sessions/${sessionId}/messages`, { text: "   " });
    assert.equal(res.status, 400);
  });

  test("S2: two sessions from the same account are both listed", async () => {
    const a = await createSession(server.base, user.token);
    const b = await createSession(server.base, user.token);
    assert.notEqual(a, b);
    const res = await api(server.base, user.token, "GET", "/api/sessions");
    assert.equal(res.status, 200);
    const ids = res.json.map((s) => s.id);
    assert.ok(ids.includes(a) && ids.includes(b), "both sessions listed");
  });
});

describe("regenerate (KEEPALIVE_MS=0)", () => {
  let regenUser;
  let regenSession;
  let questionReply;
  let messagesBefore;

  before(async () => {
    regenUser = await signup(server.base, { name: "Regen User" });
    regenSession = await createSession(server.base, regenUser.token);
    await sendMessage(
      server.base,
      regenUser.token,
      regenSession,
      "I want to learn how to bake sourdough bread",
    );
    questionReply = await sendMessage(server.base, regenUser.token, regenSession, "Why does this matter?");
    messagesBefore = (await getDetail(server.base, regenUser.token, regenSession)).messages;
  });

  test("S5: setup — goal turn + question turn produced user/tutor/user/tutor", () => {
    assert.deepEqual(messagesBefore.map((m) => m.author), ["user", "tutor", "user", "tutor"]);
    assert.equal(messagesBefore[2].blocks[0].text, "Why does this matter?");
  });

  test("S5: regenerate returns a fresh tutor message for the same user turn", async () => {
    const res = await api(server.base, regenUser.token, "POST", `/api/sessions/${regenSession}/regenerate`, {});
    assert.equal(res.status, 200);
    assert.equal(res.json.author, "tutor");
    assert.ok(Array.isArray(res.json.blocks) && res.json.blocks.length > 0);
    assert.notEqual(res.json.id, questionReply.id, "the reply is a NEW message, not the old one");
  });

  test("S5: the trailing tutor reply is replaced — count unchanged, user turn intact", async () => {
    const detail = await getDetail(server.base, regenUser.token, regenSession);
    assert.equal(detail.messages.length, messagesBefore.length, "no message added or lost");
    assert.equal(detail.messages.filter((m) => m.author === "user").length, 2, "no new user message");
    assert.equal(detail.messages[2].blocks[0].text, "Why does this matter?", "user turn intact");
    assert.equal(detail.messages[3].author, "tutor", "trailing tutor reply present");
    assert.notEqual(detail.messages[3].id, questionReply.id, "old trailing reply was replaced");
  });

  test("S5: regenerate on a session with no user turn is a 400 (nothing to regenerate)", async () => {
    const sid = await createSession(server.base, regenUser.token);
    const res = await api(server.base, regenUser.token, "POST", `/api/sessions/${sid}/regenerate`, {});
    expectStatus(res, 400, "regenerate with no user turn");
  });
});
