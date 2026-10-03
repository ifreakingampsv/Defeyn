/** Ticket 02 — ADR-0002: every Lesson block gets a stable ID at creation,
 * Citations reference the ID (never an array position), and the IDs survive
 * server restarts (persisted with the document's blocks).
 *
 * Runs against the local rule engine (no LLM) — the fallback builder and the
 * LLM path both funnel through the same stampBlockIds step. */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  blockKinds,
  bootServer,
  cleanupAll,
  createSession,
  getDetail,
  restartServer,
  sendMessage,
  signup,
} from "./helpers.mjs";

let server;
let user;
let sessionId;

after(cleanupAll);

const blockIds = (doc) => doc.blocks.map((b) => b.id);

describe("stable block IDs + citations by ID (ADR-0002)", () => {
  before(async () => {
    server = await bootServer({ keepaliveMs: 0 });
    user = await signup(server.base, { name: "Blockid User" });
    sessionId = await createSession(server.base, user.token);
    await sendMessage(server.base, user.token, sessionId, "I want to learn how to bake sourdough bread");
  });
  after(async () => {
    await server?.close();
  });

  test("after goal + continue: every block has a unique non-empty id; reply citations carry blockIds of h2 parts", async () => {
    const reply = await sendMessage(server.base, user.token, sessionId, "continue");
    assert.ok(blockKinds(reply).includes("citations"), "reply carries a citations block");

    const detail = await getDetail(server.base, user.token, sessionId);
    const doc = detail.lessonDoc;
    assert.ok(doc, "lessonDoc present after the first continue");

    const ids = blockIds(doc);
    assert.ok(ids.length > 0, "doc has blocks");
    for (const id of ids) assert.ok(typeof id === "string" && id.length > 0, "every block id is non-empty");
    assert.equal(new Set(ids).size, ids.length, "block ids are unique");

    const citationBlock = reply.blocks.find((b) => b.kind === "citations");
    assert.ok(citationBlock.items.length >= 1, "reply cites the lesson");
    for (const item of citationBlock.items) {
      assert.equal(item.docId, doc.id, "citation points at the open doc");
      assert.ok(item.blockId, "citation carries a blockId");
      assert.equal(item.blockIndex, undefined, "live citations carry no array position");
      assert.ok(ids.includes(item.blockId), "citation blockId exists in the doc");
      const target = doc.blocks.find((b) => b.id === item.blockId);
      assert.equal(target.kind, "h2", "citation anchors an h2 part heading");
      assert.equal(item.label, target.text, "citation label is the heading text");
    }
  });

  test("continues on the same doc keep every id stable; advancing to the next topic yields a new doc with fresh ids", async () => {
    const first = await getDetail(server.base, user.token, sessionId);
    const firstDocId = first.lessonDoc.id;
    const firstIds = blockIds(first.lessonDoc);

    // Keep saying "Continue": while the doc is unchanged the ids must be
    // byte-identical every turn; when progress exhausts the topic's parts the
    // tutor opens the next topic — a NEW document with NEW ids.
    let advanced = null;
    for (let i = 0; i < 8 && !advanced; i++) {
      await sendMessage(server.base, user.token, sessionId, "continue");
      const detail = await getDetail(server.base, user.token, sessionId);
      if (detail.lessonDoc.id !== firstDocId) {
        advanced = detail.lessonDoc;
      } else {
        assert.deepEqual(blockIds(detail.lessonDoc), firstIds, "ids stable across same-doc continues");
      }
    }
    assert.ok(advanced, "a continue eventually advances to the next topic's document");
    assert.notEqual(advanced.id, firstDocId, "new topic → new doc id");
    const oldIds = new Set(firstIds);
    for (const id of blockIds(advanced)) {
      assert.ok(id.length > 0 && !oldIds.has(id), "new doc's ids are fresh, not recycled");
    }
  });

  test("chat citations reference blocks that exist — no dangling citations in the normal flow", async () => {
    const detail = await getDetail(server.base, user.token, sessionId);
    const doc = detail.lessonDoc;
    const idSet = new Set(blockIds(doc));

    let checked = 0;
    for (const message of detail.messages) {
      for (const block of message.blocks) {
        if (block.kind !== "citations") continue;
        for (const item of block.items) {
          if (item.docId !== doc.id) continue; // a replaced doc's history chips
          checked++;
          assert.ok(idSet.has(item.blockId), `citation ${item.blockId} resolves in the open doc`);
        }
      }
    }
    assert.ok(checked >= 1, "at least one citation against the open doc was checked");
  });

  test("server restart → block ids identical (persisted with the document)", async () => {
    const before = await getDetail(server.base, user.token, sessionId);
    server = await restartServer(server, { keepaliveMs: 0 });
    const after = await getDetail(server.base, user.token, sessionId);
    assert.deepEqual(after.lessonDoc, before.lessonDoc, "lessonDoc byte-identical across restart");
    assert.deepEqual(blockIds(after.lessonDoc), blockIds(before.lessonDoc), "block ids survive the restart");
  });
});
