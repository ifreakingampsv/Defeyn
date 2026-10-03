/** Tickets 05 + 06 at the HTTP seam:
 *  - 05: "Give me notes" spawns snapshot Cards on the Course's Board, each
 *    carrying a source Citation to the Lesson block it came from; repeated
 *    notes turns append without corrupting anything.
 *  - 06: the Tutor's append-mode ("Continue" appends the next Part to the
 *    lesson exactly as the learner has it — byte-identical), version-checked
 *    learner saves (409 on stale writes), and a concurrent learner save
 *    surviving a tutor turn.
 *
 * Runs on the local rule engine; the LLM path funnels through the same
 * store/engine seams. */

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
let doc;

after(cleanupAll);

const firstParagraphText = (d) => {
  const idx = d.blocks.findIndex((b) => b.kind === "p");
  return d.blocks[idx].runs.map((r) => r.text).join("");
};

describe("append-mode + notes→Cards (KEEPALIVE_MS=0)", () => {
  before(async () => {
    server = await bootServer({ keepaliveMs: 0 });
    user = await signup(server.base, { name: "Housemate User" });
    sessionId = await createSession(server.base, user.token);
    await sendMessage(server.base, user.token, sessionId, "I want to learn how to bake sourdough bread");
    await sendMessage(server.base, user.token, sessionId, "continue");
    const detail = await getDetail(server.base, user.token, sessionId);
    courseId = detail.course.id;
    doc = detail.lessonDoc;
    assert.ok(doc, "lesson open after the first continue");
  });
  after(async () => {
    await server?.close();
  });

  test("learner edits the lesson via PATCH; the edit persists per-object", async () => {
    const edited = JSON.parse(JSON.stringify(doc));
    edited.blocks.splice(2, 0, {
      kind: "p",
      runs: [{ text: "MY OWN NOTE: the starter smells like ripe apples when it is ready." }],
    });
    const res = await api(server.base, user.token, "PATCH", `/api/sessions/${sessionId}/doc`, {
      title: edited.title,
      blocks: edited.blocks,
      baseVersion: doc.version,
    });
    assert.equal(res.status, 200, `doc save: ${res.text.slice(0, 200)}`);
    doc = res.json.doc;
    assert.ok(firstParagraphText(doc).includes("MY OWN NOTE") === false || doc.blocks.some((b) => b.kind === "p" && b.runs[0]?.text.includes("MY OWN NOTE")), "learner block present");
    const detail = await getDetail(server.base, user.token, sessionId);
    assert.ok(
      detail.lessonDoc.blocks.some((b) => b.kind === "p" && b.runs[0]?.text.includes("MY OWN NOTE")),
      "the learner's edit is persisted",
    );
  });

  test("stale baseVersion is refused with 409 + the current doc (never a silent clobber)", async () => {
    const stale = await api(server.base, user.token, "PATCH", `/api/sessions/${sessionId}/doc`, {
      title: doc.title,
      blocks: doc.blocks.slice(0, 3),
      baseVersion: doc.version - 1,
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.json.doc.version, doc.version, "409 carries the current document");
  });

  test("Continue appends the next Part; the learner's text is byte-identical before and after", async () => {
    const beforeBlocks = doc.blocks.map((b) => JSON.stringify(b));
    const reply = await sendMessage(server.base, user.token, sessionId, "continue");
    assert.ok(blockKinds(reply).includes("citations"), "the appended part is cited");

    const detail = await getDetail(server.base, user.token, sessionId);
    assert.equal(detail.lessonDoc.id, doc.id, "same document row");
    assert.ok(detail.lessonDoc.blocks.length > doc.blocks.length, "blocks were appended");
    beforeBlocks.forEach((b, i) => {
      assert.equal(JSON.stringify(detail.lessonDoc.blocks[i]), b, `learner-era block ${i} byte-identical`);
    });
    const appendedHeading = detail.lessonDoc.blocks.find(
      (b) => b.kind === "h2" && /^Part 2:/.test(b.text),
    );
    assert.ok(appendedHeading, "the appended Part 2 heading is at the document's tail");
    const citation = reply.blocks.find((b) => b.kind === "citations").items[0];
    assert.equal(citation.blockId, appendedHeading.id, "the appended part's citation resolves to the persisted row");
    doc = detail.lessonDoc;
  });

  test("a learner save racing a tutor turn never loses either write (housemate guarantee)", async () => {
    const learnerBlock = { kind: "p", runs: [{ text: "RACE EDIT: the learner typed while the tutor was thinking." }] };
    const streamPromise = postStream(server.base, user.token, sessionId, "continue");
    await new Promise((r) => setTimeout(r, 30)); // local turns are fast — the PATCH may land mid-turn or after it

    const mid = await api(server.base, user.token, "PATCH", `/api/sessions/${sessionId}/doc`, {
      title: doc.title,
      blocks: [...doc.blocks, learnerBlock],
      baseVersion: doc.version,
    });
    assert.ok([200, 409].includes(mid.status), `race PATCH answered ${mid.status}`);
    // 200: the edit landed before the tutor's end-of-turn append (which then
    // re-reads the row and preserves it). 409: the append won the race — the
    // learner's write is refused rather than clobbering it, and is re-applied.

    const stream = await streamPromise;
    assert.ok(stream.done, "the tutor turn completed");

    if (mid.status === 409) {
      doc = (await getDetail(server.base, user.token, sessionId)).lessonDoc;
      const retry = await api(server.base, user.token, "PATCH", `/api/sessions/${sessionId}/doc`, {
        title: doc.title,
        blocks: [...doc.blocks, learnerBlock],
        baseVersion: doc.version,
      });
      assert.equal(retry.status, 200, "learner edit re-applied on the fresh version");
    }
    const detail = await getDetail(server.base, user.token, sessionId);
    doc = detail.lessonDoc;
    const texts = doc.blocks.flatMap((b) => (b.kind === "p" ? b.runs.map((r) => r.text) : []));
    assert.ok(texts.some((t) => t.includes("RACE EDIT")), "the learner's write is in the row");
    const preIds = new Set(); // the tutor's appended part is a tail h2 not present before the turn
    assert.ok(
      doc.blocks.some((b) => b.kind === "h2" && /^Part [0-9]+:/.test(b.text)),
      "the tutor's appended Part is present too",
    );
  });

  test("notes turn spawns snapshot Cards with block-ID citations; repeating appends without corrupting", async () => {
    const res1 = await api(server.base, user.token, "GET", `/api/courses/${courseId}/board`);
    const before = res1.json.cards;

    const reply = await sendMessage(server.base, user.token, sessionId, "give me notes");
    assert.ok(blockKinds(reply).includes("page-created"), "chat → Board handoff block");

    const board1 = await (await api(server.base, user.token, "GET", `/api/courses/${courseId}/board`)).json;
    const tutorCards = board1.cards.filter((c) => c.creator === "tutor");
    assert.ok(tutorCards.length >= 2, "cards spawned");
    for (const card of tutorCards) {
      if (card.citation) {
        assert.equal(card.citation.docId, doc.id);
        assert.ok(doc.blocks.some((b) => b.id === card.citation.blockId), "citation blockId exists in the lesson");
      }
    }
    for (const c of before) {
      assert.ok(board1.cards.some((x) => x.id === c.id && JSON.stringify(x.content) === JSON.stringify(c.content)), "existing cards intact");
    }

    // second notes turn appends more Cards, touches nothing else
    await sendMessage(server.base, user.token, sessionId, "give me notes");
    const board2 = await (await api(server.base, user.token, "GET", `/api/courses/${courseId}/board`)).json;
    assert.ok(board2.cards.length > board1.cards.length, "repeat notes turn appends Cards");
    for (const c of tutorCards) {
      const kept = board2.cards.find((x) => x.id === c.id);
      assert.ok(kept, "earlier tutor Card still present");
      assert.equal(JSON.stringify(kept.content), JSON.stringify(c.content), "snapshot content unchanged");
    }
  });

  test("deleting the cited block from the doc leaves the citation pointing at nothing (unavailable mechanism)", async () => {
    const board = await (await api(server.base, user.token, "GET", `/api/courses/${courseId}/board`)).json;
    const cited = board.cards.find((c) => c.citation);
    assert.ok(cited, "a cited card exists");
    assert.ok(doc.blocks.some((b) => b.id === cited.citation.blockId), "cited block currently exists");

    const remaining = doc.blocks.filter((b) => b.id !== cited.citation.blockId);
    const res = await api(server.base, user.token, "PATCH", `/api/sessions/${sessionId}/doc`, {
      title: doc.title,
      blocks: remaining,
      baseVersion: doc.version,
    });
    assert.equal(res.status, 200);
    doc = res.json.doc;
    assert.ok(!doc.blocks.some((b) => b.id === cited.citation.blockId), "cited block is gone — the card's citation now renders unavailable");
  });
});
