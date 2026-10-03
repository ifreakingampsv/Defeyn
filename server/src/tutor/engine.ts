import { randomUUID } from "node:crypto";
import { z } from "zod";
import { extractJson, llm, quickLlm, type LlmAdapter, type LlmChatMessage } from "../llm/index.js";
import type {
  ChatMessage,
  Citation,
  Course,
  LessonDoc,
  MessageBlock,
  UnstampedDocBlock,
  WhiteboardGroup,
  WorkingSession,
} from "./domain.js";
import { buildCourse, buildLesson, buildNotes, deriveSubject, lessonCitations, localTurn, newMessage, stampBlockIds, timestampNow } from "./local.js";

/**
 * Turn orchestration. One generator per tutor turn yields the wire events the
 * SSE endpoint forwards:
 *   {type:'block', block}      — a complete structured block
 *   {type:'text-delta', delta} — incremental text appended to the open block
 * With an LLM configured, conversational turns and generation pipelines are
 * model-generated (JSON-mode prompts validated with zod); anything the model
 * fumbles falls back to the deterministic local engine, so the product never
 * breaks. Without an LLM everything runs on the local engine.
 */

export type TurnEvent = { type: "block"; block: MessageBlock } | { type: "text-delta"; delta: string };

/** Hybrid-ready quick model accessor (unpopulated in v2.0). `quickLlm` is null
 * unless QUICK_OPENAI_* is configured; when it exists, interactive moments
 * (card edits, short replies) can route here while the main `llm` provider
 * keeps drafting big artifacts. Falls back to the main provider. */
export function quickModel(): LlmAdapter | null {
  return quickLlm ?? llm;
}

const DEFAULT_CHOICES = ["Continue", "I have questions", "Too hard", "Not what I want"];
const PART_TITLES = ["First principles", "Core mechanics", "A guided example", "Review and practice"];

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const sleep = delay;

/** One retry for LLM attempts. Parse/validation failures (no HTTP status) and
 * transient provider errors (429, 5xx) get a single retry — honoring
 * Retry-After on 429s, capped at 30s — then the deterministic fallback runs.
 * Auth/config errors (401/403/404) fall back immediately; retrying is futile. */
async function withLlmRetry<T>(label: string, attempt: () => Promise<T>, fallback: () => T): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await attempt();
    } catch (e) {
      const err = e as Error & { status?: number; retryAfterSeconds?: number };
      const retriable = err.status === undefined || err.status === 429 || err.status >= 500;
      console.warn(`[tutor] ${label} attempt ${i + 1} failed:`, err.message);
      if (!retriable || i >= 1) return fallback();
      const wait = err.retryAfterSeconds;
      if (typeof wait === "number" && wait > 0) await sleep(Math.min(wait, 30) * 1000);
    }
  }
}

function isQuestion(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t.endsWith("?") || /^(why|how|what|when|who|where|which|can|could|should|does|do|is|are)\b/.test(t);
}

/* ------------------------------------------------------------ LLM prompts */

function contextBlock(session: WorkingSession): string {
  const lines: string[] = [];
  if (session.course) {
    lines.push(`Course: "${session.course.title}" (goal: "${session.course.goal}")`);
    const topic = session.course.topics[session.currentTopic] ?? session.course.topics[0];
    lines.push(`Current topic: ${topic.title}`);
  }
  if (session.lessonDoc) {
    const headings = session.lessonDoc.blocks
      .filter((b) => b.kind === "h2")
      .map((b) => `- ${b.text} [blockIndex ${session.lessonDoc!.blocks.indexOf(b)}]`)
      .join("\n");
    lines.push(`Open lesson: "${session.lessonDoc.title}" with parts:\n${headings}`);
  }
  if (session.lessonProgress) {
    lines.push(`Lesson progress: ${session.lessonProgress.completed}/${session.lessonProgress.total} parts done (${session.lessonProgress.items.join(", ")})`);
  }
  return lines.join("\n");
}

const TUTOR_SYSTEM = `You are "Defeyn AI Tutor", a personal tutor that drafts real courses and teaches them one part at a time. Voice: warm, precise, never sycophantic, no emoji. You teach the user's course — you do not answer generic trivia. Reply with a JSON object only:
{"texts": string[], "citeParts": number[], "choices": string[]}
- "texts": 1-2 short paragraphs of the reply (plain text, no markdown).
- "citeParts": which lesson parts (1-4) your reply draws from, for citation chips; [] if none.
- "choices": exactly 3-4 short follow-up chips like ["Continue","I have questions","Too hard"].`;

const TutorReplyJson = z.object({
  texts: z.array(z.string().min(1)).min(1).max(3),
  citeParts: z.array(z.number().int().min(1).max(9)).max(9).default([]),
  choices: z.array(z.string().min(1).max(40)).max(4).default([]),
});

async function llmTutorReply(
  session: WorkingSession,
  userName: string,
  text: string,
): Promise<z.infer<typeof TutorReplyJson> | null> {
  const provider = llm;
  if (!provider) return null;
  const recent = session.messages
    .slice(-6)
    .map((m) => `${m.author === "user" ? userName : "Tutor"}: ${m.blocks.map((b) => (b.kind === "text" ? b.text : `[${b.kind}]`)).join(" ")}`);
  const messages: LlmChatMessage[] = [
    { role: "system", content: TUTOR_SYSTEM },
    { role: "system", content: `Context:\n${contextBlock(session) || "(no course yet)"}` },
    { role: "assistant", content: "Understood. I'll answer within the course context and cite the parts I use." },
    ...recent.slice(0, -1).map((c) => ({ role: "user" as const, content: c })),
    { role: "user", content: text },
  ];
  return withLlmRetry(
    "tutor reply",
    async () => {
      const raw = await provider.complete(messages, { json: true, maxTokens: 4000 });
      const parsed = TutorReplyJson.parse(extractJson(raw));
      if (!parsed.choices.length) parsed.choices = DEFAULT_CHOICES;
      return parsed;
    },
    () => null,
  );
}

const CourseJson = z.object({
  title: z.string().min(2).max(80),
  topics: z
    .array(
      z.object({
        title: z.string().min(2).max(120),
        description: z.string().min(10).max(600),
        sections: z
          .array(
            z.object({
              title: z.string().min(2).max(140),
              description: z.string().max(400).optional(),
            }),
          )
          .min(2)
          .max(6),
      }),
    )
    .min(4)
    .max(12),
});

async function generateCourse(goal: string): Promise<Course> {
  const fallback = () => buildCourse(goal);
  const provider = llm;
  if (!provider) return fallback();
  const messages: LlmChatMessage[] = [
    {
      role: "system",
      content:
        'You design personal courses. Return JSON only: {"title": string, "topics": [{"title": "Topic N: ...", "description": string, "sections": [{"title": string, "description": string}]}]}. 7-8 topics, each with 2-3 sections. Order from foundations to a capstone. Calibrate to the goal — no filler.',
    },
    { role: "user", content: `Learning goal: "${goal}"` },
  ];
  return withLlmRetry(
    "course generation",
    async () => {
      const raw = await provider.complete(messages, { json: true, maxTokens: 16000 });
      const parsed = CourseJson.parse(extractJson(raw));
      const course: Course = {
        id: `c_${randomUUID().slice(0, 12)}`,
        title: parsed.title,
        goal,
        topics: parsed.topics.map((t, i) => ({
          id: `t_${randomUUID().slice(0, 10)}`,
          number: i,
          title: t.title.startsWith("Topic") ? t.title : `Topic ${i}: ${t.title}`,
          description: t.description,
          sections: t.sections.map((s, j) => ({
            number: `${i}.${j + 1}`,
            title: s.title,
            description: s.description,
          })),
        })),
      };
      return course;
    },
    fallback,
  );
}

const LessonJson = z.object({
  title: z.string().min(2).max(120),
  parts: z
    .array(
      z.object({
        heading: z.string().min(2).max(120),
        paragraphs: z.array(z.string().min(20)).min(1).max(4),
      }),
    )
    .min(3)
    .max(5),
});

async function generateLesson(course: Course, topicIndex: number): Promise<LessonDoc> {
  const fallback = () => buildLesson(course, topicIndex);
  const provider = llm;
  if (!provider) return fallback();
  const topic = course.topics[topicIndex];
  const messages: LlmChatMessage[] = [
    {
      role: "system",
      content:
        'You write lesson documents for a personal tutor. Return JSON only: {"title": string, "parts": [{"heading": string, "paragraphs": string[]}]}. 4 parts; teach the topic against the learner\'s goal; prose only, no markdown; each part 2-3 substantial paragraphs.',
    },
    {
      role: "user",
      content: `Learner goal: "${course.goal}". Topic: "${topic.title}" — ${topic.description ?? ""}\nSections to cover: ${topic.sections.map((s) => s.title).join("; ")}`,
    },
  ];
  return withLlmRetry(
    "lesson generation",
    async () => {
      const raw = await provider.complete(messages, { json: true, maxTokens: 16000 });
      const parsed = LessonJson.parse(extractJson(raw));
      const rawBlocks: UnstampedDocBlock[] = [{ kind: "h1", text: parsed.title }];
      parsed.parts.forEach((p, i) => {
        rawBlocks.push({ kind: "h2", text: `Part ${i + 1}: ${p.heading}` });
        p.paragraphs.forEach((text) => rawBlocks.push({ kind: "p", runs: [{ text }] }));
      });
      // ADR-0002: stable block IDs are assigned here, at creation, before the
      // document is ever stored or cited.
      return { id: `l_${randomUUID().slice(0, 12)}`, title: parsed.title, blocks: stampBlockIds(rawBlocks) };
    },
    fallback,
  );
}

const NotesJson = z.object({
  groups: z
    .array(
      z.object({
        cards: z
          .array(
            z.object({
              title: z.string().min(2).max(60),
              body: z.string().min(10).max(400),
            }),
          )
          .min(2)
          .max(4),
        summary: z.string().min(20).max(400),
      }),
    )
    .min(1)
    .max(2),
});

async function generateNotes(course: Course, topicIndex: number): Promise<WhiteboardGroup[]> {
  const fallback = () => buildNotes(course, topicIndex);
  const provider = llm;
  if (!provider) return fallback();
  const topic = course.topics[topicIndex] ?? course.topics[0];
  const messages: LlmChatMessage[] = [
    {
      role: "system",
      content:
        'You condense a lesson into whiteboard note cards. Return JSON only: {"groups": [{"cards": [{"title": 2-4 words, "body": one-sentence summary}], "summary": string}]}. 1-2 groups of 3 cards each.',
    },
    {
      role: "user",
      content: `Lesson "${topic.title}" covered: ${topic.sections.map((s) => `${s.title} — ${s.description ?? ""}`).join(" | ")}`,
    },
  ];
  return withLlmRetry(
    "notes generation",
    async () => {
      const raw = await provider.complete(messages, { json: true, maxTokens: 8000 });
      const parsed = NotesJson.parse(extractJson(raw));
      const colors: WhiteboardGroup["color"][] = ["orange", "green"];
      return parsed.groups.map((g, gi) => {
        const label = `Lesson ${topicIndex + gi}`;
        return {
          id: `wg_${randomUUID().slice(0, 10)}`,
          label,
          color: colors[gi % 2],
          cards: g.cards.map((c, ci) => ({
            id: `wc_${randomUUID().slice(0, 10)}`,
            title: c.title,
            subtitle: `${label} · ${ci + 1}`,
            body: c.body,
          })),
          note: {
            id: `wn_${randomUUID().slice(0, 10)}`,
            title: `${label} note`,
            summary: g.summary,
            sectionTitle: topic.title.replace(/^Topic \d+:\s*/, ""),
            bullets: topic.sections.slice(0, 4).map((s) => s.title),
            highlight: gi === parsed.groups.length - 1,
          },
        };
      });
    },
    fallback,
  );
}

/* ------------------------------------------------------------- the turn */

export async function* tutorTurnStream(
  session: WorkingSession,
  userName: string,
  text: string,
  registerCourse: (course: Course) => void,
): AsyncGenerator<TurnEvent> {
  const t = text.trim();
  const lower = t.toLowerCase();

  /* 1 — first message becomes the learning goal */
  if (!session.courseId) {
    if (t.length < 12) {
      yield {
        type: "block",
        block: {
          kind: "text",
          text: `Hello ${userName}. Tell me what you'd like to learn — one honest sentence is enough ("I want to learn how to…" works well). I'll draft a full course around it.`,
        },
      };
      return;
    }
    yield { type: "block", block: { kind: "thought", summary: "Turning your goal into a course" } };
    const drafted = await generateCourse(t);
    registerCourse(drafted);
    session.courseId = drafted.id;
    session.title = drafted.title.length > 40 ? `${drafted.title.slice(0, 40)}…` : drafted.title;
    session.pane = "syllabus";
    session.currentTopic = 1;
    session.lessonProgress = { completed: 0, total: 4, items: [...PART_TITLES] };

    yield { type: "block", block: { kind: "course-chip", title: drafted.title, caption: "Course syllabus created" } };
    const intro = `Your personalized course is being set up. I'm organizing "${drafted.goal}" into a structured syllabus of ${drafted.topics.length} topics — starting from where you are, not from page one of a textbook.`;
    for (const delta of pace(intro)) {
      yield { type: "text-delta", delta };
    }
    yield {
      type: "block",
      block: {
        kind: "text",
        text: `The full syllabus is in the right pane. Say "Continue" whenever you're ready and I'll teach the first topic, one part at a time.`,
      },
    };
    yield { type: "block", block: { kind: "choices", options: DEFAULT_CHOICES, selected: "Continue" } };
    return;
  }

  const course = session.course!;

  /* 2 — notes / whiteboard */
  if (/\b(note|notes|summary|summarize|summarise|whiteboard|revision)\b/.test(lower)) {
    yield { type: "block", block: { kind: "thought", summary: "Condensing the lesson into notes" } };
    session.whiteboard = await generateNotes(course, session.currentTopic);
    session.pane = "whiteboard";
    const count = session.whiteboard.reduce((n, g) => n + g.cards.length, 0);
    const reply = `The lesson notes are ready — ${count} cards across ${session.whiteboard.length} groups, each linking back to the section it came from. They're on your whiteboard now; review should feel like a glance, not a reread.`;
    for (const delta of pace(reply)) yield { type: "text-delta", delta };
    yield { type: "block", block: { kind: "choices", options: DEFAULT_CHOICES } };
    return;
  }

  /* 3 — continue / advance the lesson */
  if (/^(continue|next|go on|keep going|start|begin|ready)\b/.test(lower) || lower === "start the lesson") {
    yield { type: "block", block: { kind: "thought", summary: "Drafting the next part" } };
    const progress = session.lessonProgress ?? { completed: 0, total: 4, items: [...PART_TITLES] };
    const topicDone = progress.completed >= progress.total - 1;
    let partLabel: string;
    let topicTitle: string;

    if (!session.lessonDoc || topicDone) {
      const nextIdx = session.lessonDoc
        ? Math.min(session.currentTopic + 1, course.topics.length - 1)
        : session.currentTopic;
      session.currentTopic = nextIdx;
      session.lessonDoc = await generateLesson(course, nextIdx);
      session.lessonProgress = { completed: 0, total: 4, items: [...PART_TITLES] };
      topicTitle = course.topics[nextIdx].title.replace(/^Topic \d+:\s*/, "");
      partLabel = `Topic ${nextIdx}, Part 1`;
    } else {
      session.lessonProgress = { ...progress, completed: Math.min(progress.completed + 1, progress.total) };
      topicTitle = course.topics[session.currentTopic].title.replace(/^Topic \d+:\s*/, "");
      partLabel = `Part ${session.lessonProgress.completed + 1}`;
    }
    session.pane = "lesson";

    const ack = `${partLabel} is ready — ${topicTitle}, drafted at your pace. Read along in the lesson pane; I'll keep the progress checklist honest as you go.`;
    for (const delta of pace(ack)) yield { type: "text-delta", delta };
    if (session.lessonProgress) {
      yield {
        type: "block",
        block: {
          kind: "lesson-progress",
          completed: session.lessonProgress.completed,
          total: session.lessonProgress.total,
          items: session.lessonProgress.items,
        },
      };
    }
    if (session.lessonDoc) {
      yield { type: "block", block: { kind: "citations", items: lessonCitations(session.lessonDoc, session.lessonProgress?.completed + 1) } };
    }
    yield { type: "block", block: { kind: "choices", options: DEFAULT_CHOICES, selected: "Continue" } };
    return;
  }

  /* 4 — feedback chips (deterministic acknowledgment + LLM voice if present) */
  if (/\btoo hard\b|\bsimpler\b|\beasier\b|slow down/.test(lower)) {
    const reply = await llmTutorReply(session, userName, `${t} (The learner says this part is too hard — recalibrate: simpler framing, less jargon, reassure briefly.)`);
    if (reply) {
      yield { type: "block", block: { kind: "thought", summary: "Recalibrating the difficulty" } };
      const joined = reply.texts.join("\n\n");
      for (const delta of pace(joined)) yield { type: "text-delta", delta };
      if (session.lessonDoc && reply.citeParts.length) {
        yield { type: "block", block: { kind: "citations", items: citationsForParts(session.lessonDoc, reply.citeParts) } };
      }
      yield { type: "block", block: { kind: "choices", options: reply.choices } };
      return;
    }
    const local = localTurn(session, userName, t, registerCourse);
    for (const b of local.blocks) {
      await delay(320);
      yield { type: "block", block: b };
    }
    return;
  }

  /* 5 — everything conversational: questions, feedback, chatter */
  const llmReply = await llmTutorReply(session, userName, t);
  if (llmReply) {
    yield { type: "block", block: { kind: "thought", summary: "Thinking through your question" } };
    const joined = llmReply.texts.join("\n\n");
    for (const delta of pace(joined)) yield { type: "text-delta", delta };
    if (session.lessonDoc && llmReply.citeParts.length) {
      yield { type: "block", block: { kind: "citations", items: citationsForParts(session.lessonDoc, llmReply.citeParts) } };
    }
    yield { type: "block", block: { kind: "choices", options: llmReply.choices } };
    return;
  }

  /* 6 — local engine fallback for the whole turn */
  const local = localTurn(session, userName, t, registerCourse);
  for (const b of local.blocks) {
    await delay(320);
    yield { type: "block", block: b };
  }
}

function citationsForParts(doc: NonNullable<WorkingSession["lessonDoc"]>, parts: number[]): Citation[] {
  const wanted = new Set(parts);
  return lessonCitations(doc).filter((c) => {
    const m = c.label.match(/^Part (\d+)/);
    return m ? wanted.has(Number(m[1])) : false;
  });
}

/** Split text into word-chunk deltas so the UI sees streaming pacing. */
function* pace(text: string): Generator<string> {
  const words = text.split(/(\s+)/);
  let buf = "";
  for (const w of words) {
    buf += w;
    if (buf.length >= 6) {
      yield buf;
      buf = "";
    }
  }
  if (buf) yield buf;
}

export { deriveSubject };
