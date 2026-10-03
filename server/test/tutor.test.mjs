/** Scenario 3 (full product loop on the local rule engine)
 *  + Scenario 4 (SSE streaming protocol + keepalives during generation/queueing). */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  api,
  blockKinds,
  bootServer,
  cleanupAll,
  createSession,
  getBoard,
  getDetail,
  postStream,
  sendMessage,
  signup,
} from "./helpers.mjs";

let server;
let user;
let sessionId;
let courseId;
let lessonDocSnapshot;
let whiteboardSnapshot;

after(cleanupAll);

describe("product loop on the local engine (KEEPALIVE_MS=0)", () => {
  before(async () => {
    server = await bootServer({ keepaliveMs: 0 });
    user = await signup(server.base, { name: "Loop User" });
    sessionId = await createSession(server.base, user.token);
  });
  after(async () => {
    await server?.close();
  });

  test("S3: a short first message gets a plain greeting and drafts no course", async () => {
    const reply = await sendMessage(server.base, user.token, sessionId, "hi there");
    assert.equal(reply.author, "tutor");
    assert.ok(reply.id);
    for (const block of reply.blocks) assert.equal(block.kind, "text", "only text blocks in a greeting");
    const detail = await getDetail(server.base, user.token, sessionId);
    assert.equal(detail.course, undefined);
    assert.equal(detail.pane, "syllabus");
  });

  test("S3: the first long message becomes the learning goal → course drafted", async () => {
    const reply = await sendMessage(
      server.base,
      user.token,
      sessionId,
      "I want to learn how to bake sourdough bread",
    );
    const kinds = blockKinds(reply);
    assert.ok(kinds.includes("course-chip"), `course-chip block expected, got ${kinds.join(", ")}`);
    assert.ok(kinds.includes("choices"), `choices block expected, got ${kinds.join(", ")}`);

    const detail = await getDetail(server.base, user.token, sessionId);
    assert.ok(detail.course, "session now has a course");
    assert.ok(
      detail.course.topics.length >= 7 && detail.course.topics.length <= 8,
      `course has 7-8 topics, got ${detail.course.topics.length}`,
    );
    for (const topic of detail.course.topics) {
      assert.ok(topic.title);
      assert.ok(Array.isArray(topic.sections) && topic.sections.length > 0);
    }
    assert.equal(detail.pane, "syllabus");
    assert.equal(detail.session.courseId, detail.course.id);
    assert.deepEqual(
      { completed: detail.lessonProgress?.completed, total: detail.lessonProgress?.total },
      { completed: 0, total: 4 },
    );
    courseId = detail.course.id;
  });

  test("S3: the drafted course already has a board with no cards and no edges", async () => {
    const res = await getBoard(server.base, user.token, courseId);
    assert.equal(res.status, 200, `GET board for a freshly drafted course: ${res.text?.slice(0, 200)}`);
    assert.ok(res.json.board.id);
    assert.equal(res.json.board.courseId, courseId);
    assert.equal(typeof res.json.board.title, "string");
    assert.deepEqual(res.json.cards, []);
    assert.deepEqual(res.json.edges, []);
  });

  test("S3: first continue teaches part 1 — lessonDoc + citations + progress", async () => {
    const reply = await sendMessage(server.base, user.token, sessionId, "continue");
    const kinds = blockKinds(reply);
    assert.ok(kinds.includes("lesson-progress"), `lesson-progress expected, got ${kinds.join(", ")}`);
    assert.ok(kinds.includes("citations"), `citations expected, got ${kinds.join(", ")}`);

    const detail = await getDetail(server.base, user.token, sessionId);
    assert.ok(detail.lessonDoc, "session now has a lessonDoc");
    assert.equal(detail.lessonDoc.blocks[0].kind, "h1", "lessonDoc starts with an h1");
    assert.equal(detail.pane, "lesson");
    assert.equal(detail.lessonProgress.completed, 0);

    const citationBlock = reply.blocks.find((b) => b.kind === "citations");
    assert.ok(citationBlock.items.length >= 1, "citations reference the lesson");
    for (const item of citationBlock.items) {
      assert.equal(item.docId, detail.lessonDoc.id, "citation points at the lessonDoc");
      const target = detail.lessonDoc.blocks[item.blockIndex];
      assert.ok(target, `citation blockIndex ${item.blockIndex} in range`);
      assert.equal(target.kind, "h2", "citation anchors a heading block");
    }
    lessonDocSnapshot = JSON.stringify(detail.lessonDoc);
  });

  test("S3: second continue bumps lessonProgress.completed, same document", async () => {
    const reply = await sendMessage(server.base, user.token, sessionId, "continue");
    const progress = reply.blocks.find((b) => b.kind === "lesson-progress");
    assert.equal(progress.completed, 1, "progress moved to part 2");
    const detail = await getDetail(server.base, user.token, sessionId);
    assert.equal(detail.lessonProgress.completed, 1);
    assert.equal(detail.lessonDoc.id, JSON.parse(lessonDocSnapshot).id, "same lesson document continues");
    assert.equal(detail.pane, "lesson");
  });

  test("S3: notes turn → whiteboard groups; lessonDoc is byte-identical (per-object isolation)", async () => {
    const reply = await sendMessage(server.base, user.token, sessionId, "please summarize this lesson for revision");
    assert.equal(reply.author, "tutor");
    assert.ok(blockKinds(reply).includes("choices"));

    const detail = await getDetail(server.base, user.token, sessionId);
    assert.ok(Array.isArray(detail.whiteboard) && detail.whiteboard.length >= 1, "whiteboard groups present");
    for (const group of detail.whiteboard) {
      assert.ok(["orange", "green"].includes(group.color), `group color ${group.color}`);
      assert.ok(group.label);
      assert.ok(Array.isArray(group.cards) && group.cards.length >= 1);
      for (const card of group.cards) {
        for (const key of ["id", "title", "subtitle", "body"]) assert.ok(card[key] !== undefined, `card.${key}`);
      }
      assert.ok(group.note.id);
      assert.ok(Array.isArray(group.note.bullets));
    }
    assert.equal(detail.pane, "whiteboard");
    assert.equal(detail.lessonProgress.completed, 1, "progress untouched by the notes turn");
    assert.equal(JSON.stringify(detail.lessonDoc), lessonDocSnapshot, "lessonDoc byte-identical after notes turn");
    whiteboardSnapshot = JSON.stringify(detail.whiteboard);
  });

  test("S3: a further continue bumps progress and leaves the whiteboard untouched", async () => {
    await sendMessage(server.base, user.token, sessionId, "continue");
    const detail = await getDetail(server.base, user.token, sessionId);
    assert.equal(detail.pane, "lesson");
    assert.equal(detail.lessonProgress.completed, 2);
    assert.equal(JSON.stringify(detail.whiteboard), whiteboardSnapshot, "whiteboard byte-identical after continue");
  });
});

describe("SSE streaming + keepalive (KEEPALIVE_MS=100)", () => {
  let streamUser;
  let streamSession;

  before(async () => {
    server = await bootServer({ keepaliveMs: 100 });
    streamUser = await signup(server.base, { name: "Stream User" });
    streamSession = await createSession(server.base, streamUser.token);
    // goal turn via the non-streaming endpoint (fast) so the streams below are
    // lesson/question turns against an existing course.
    await sendMessage(
      server.base,
      streamUser.token,
      streamSession,
      "I want to learn how to bake sourdough bread",
    );
  });
  after(async () => {
    await server?.close();
  });

  test("S4: a streamed turn sends retry line, block + text-delta events, then done", async () => {
    const r = await postStream(server.base, streamUser.token, streamSession, "continue");
    assert.equal(r.status, 200);
    assert.ok(r.raw.startsWith("retry:"), `stream starts with a retry line, got ${JSON.stringify(r.raw.slice(0, 30))}`);
    assert.equal(r.errors.length, 0, `no error events: ${JSON.stringify(r.errors)}`);
    const blockEvents = r.events.filter((e) => e.type === "block");
    const deltaEvents = r.events.filter((e) => e.type === "text-delta");
    assert.ok(blockEvents.length >= 1, "block events streamed");
    assert.ok(deltaEvents.length >= 1, "text deltas streamed");
    for (const ev of blockEvents) assert.ok(ev.block?.kind, "block events carry a block");
    assert.equal(r.events.at(-1)?.type, "done", "stream ends with a done event");
    assert.equal(r.done?.author, "tutor");
    const doneKinds = blockKinds(r.done);
    assert.ok(doneKinds.includes("lesson-progress"), `done message has lesson-progress (${doneKinds.join(", ")})`);
    assert.ok(doneKinds.includes("citations"), `done message has citations (${doneKinds.join(", ")})`);
  });

  test("S4: a queued concurrent turn waits with keepalives; both turns complete in order", async () => {
    const q1 = "Why does this matter?";
    const q2 = "How should I practice this?";
    // fire both without awaiting the first: the second must queue behind the
    // per-session turn lock while the first generates (~1.5s of local-engine
    // paced delays), so BOTH streams see `: keepalive` comment lines.
    const pending1 = postStream(server.base, streamUser.token, streamSession, q1);
    const pending2 = postStream(server.base, streamUser.token, streamSession, q2);
    const [r1, r2] = await Promise.all([pending1, pending2]);

    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.ok(r1.keepaliveCount >= 1, `first stream carries keepalives (found ${r1.keepaliveCount})`);
    assert.ok(r2.keepaliveCount >= 1, `queued stream carries keepalives (found ${r2.keepaliveCount})`);
    assert.equal(r1.errors.length, 0, `no error events in r1: ${JSON.stringify(r1.errors)}`);
    assert.equal(r2.errors.length, 0, `no error events in r2: ${JSON.stringify(r2.errors)}`);
    assert.ok(r1.done, "first turn completed with its own done event");
    assert.ok(r2.done, "queued turn completed with its own done event");
    assert.equal(r1.done.author, "tutor");
    assert.equal(r2.done.author, "tutor");
    assert.notEqual(r1.done.id, r2.done.id);

    // both user messages + both tutor replies, in order
    const detail = await getDetail(server.base, streamUser.token, streamSession);
    const userMsgs = detail.messages.filter((m) => m.author === "user");
    const tutorMsgs = detail.messages.filter((m) => m.author === "tutor");
    assert.equal(userMsgs.length, 4, "goal + continue + 2 queued turns");
    assert.equal(tutorMsgs.length, 4);
    const tail = detail.messages.slice(-4);
    assert.deepEqual(tail.map((m) => m.author), ["user", "tutor", "user", "tutor"]);
    assert.deepEqual(
      new Set([tail[0].blocks[0].text, tail[2].blocks[0].text]),
      new Set([q1, q2]),
      "both questions present, each immediately answered",
    );
  });

  test("S4: SSE keepalives are comment lines the protocol ignores", async () => {
    const r = await postStream(server.base, streamUser.token, streamSession, "What should I focus on?");
    for (const line of r.raw.split("\n")) {
      if (line.startsWith(":")) {
        assert.match(line, /^: keepalive\s*$/, "comment lines are keepalives only");
      }
    }
  });
});
