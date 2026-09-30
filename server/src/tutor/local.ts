import { randomUUID } from "node:crypto";
import exploreCourses from "../data/exploreCourses.json" with { type: "json" };
import type {
  ChatMessage,
  Citation,
  Course,
  LessonDoc,
  MessageBlock,
  WhiteboardCard,
  WhiteboardGroup,
  WorkingSession,
} from "./domain.js";

/**
 * Deterministic rule-based tutor — the port of the frontend's fakeTutor.
 * This is the always-available fallback provider: with no LLM configured the
 * product still works end to end. It is also the behavioral spec the LLM
 * prompts are written against (see engine.ts).
 */

export function newMessage(author: "user" | "tutor", blocks: MessageBlock[]): ChatMessage {
  return { id: `m_${randomUUID().slice(0, 12)}`, author, timestamp: timestampNow(), blocks };
}

export function timestampNow(): string {
  const d = new Date();
  const p2 = (n: number) => String(n).padStart(2, "0");
  let h = d.getHours() % 12;
  if (h === 0) h = 12;
  return `· ${p2(d.getMonth() + 1)}/${p2(d.getDate())}/${d.getFullYear()} ${h}:${p2(d.getMinutes())} ${d.getHours() < 12 ? "AM" : "PM"}`;
}

export function lessonCitations(doc: LessonDoc, part?: number): Citation[] {
  const items: Citation[] = [];
  doc.blocks.forEach((b, i) => {
    if (b.kind !== "h2") return;
    const m = b.text.match(/^Part (\d+): (.+)$/);
    if (part && m && Number(m[1]) !== part) return;
    items.push({ docId: doc.id, blockIndex: i, label: b.text });
  });
  return items;
}

export function deriveSubject(goal: string): string {
  let s = goal.trim().replace(/[.!?]+$/, "");
  s = s.replace(/^i\s+(?:want|would like|'d like)\s+to\s+learn\s+(?:how\s+to\s+)?/i, "");
  s = s.replace(/^i\s+want\s+to\s+/i, "");
  s = s.replace(/^(?:learn|study|master|understand)\s+(?:how\s+to\s+)?/i, "");
  s = s.trim() || goal.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const GENERIC_TOPICS: Array<{ title: string; description: string; sections: string[] }> = [
  {
    title: "Foundations and First Principles",
    description:
      "The base layer of the whole course: what {subject} actually is, the vocabulary everything later assumes, and why it works the way it works.",
    sections: ["Why this comes first", "The essential terms, in plain language", "Your first hands-on pass"],
  },
  {
    title: "Core Concepts and Vocabulary",
    description:
      "The ideas you will meet again and again in {subject}, organized once, properly, so they stop feeling like jargon and start feeling like tools.",
    sections: ["The mental model that ties it together", "Terms worth memorizing vs. terms worth looking up", "How the concepts connect to each other"],
  },
  {
    title: "Methods and Techniques",
    description:
      "The working methods of {subject}: the repeatable procedures people actually use, and when each one is the right tool.",
    sections: ["The standard method, step by step", "Variations and when to use them", "A worked example from start to finish"],
  },
  {
    title: "Guided Practice",
    description:
      "Doing {subject} yourself, with training wheels on. Every exercise here is chosen to make one earlier concept click.",
    sections: ["Exercise set 1: foundations in use", "Exercise set 2: putting two ideas together", "Checking your work like a practitioner"],
  },
  {
    title: "Common Obstacles and How to Get Past Them",
    description:
      "Where most people stall in {subject}, why, and the specific moves that unstick them — so a bad hour does not become a bad month.",
    sections: ["The four classic sticking points", "What to do when nothing makes sense", "How to tell a hard problem from a wrong approach"],
  },
  {
    title: "Intermediate Applications",
    description:
      "{subject} outside the practice room: real, recognizable situations where the foundations pay off, and what changes at this level.",
    sections: ["Three applications, from everyday to ambitious", "What intermediate actually means", "Choosing your next depth"],
  },
  {
    title: "Capstone — Putting It All Together",
    description:
      "A final project that requires the whole course, done your way. This is where {subject} stops being a course and becomes something you can do.",
    sections: ["Designing your capstone", "Building it with the tutor alongside", "Reviewing what the course changed"],
  },
];

const SECTION_DESCRIPTIONS: Array<(s: string) => string> = [
  (s) => `What it means, why it matters for ${s}, and the shortest honest explanation we can give before doing it yourself.`,
  () => `The core idea in plain language first, then with the proper terminology, so both versions are available when you need them.`,
  () => `A worked mini-example you can follow in a minute, chosen to make this specific idea stick.`,
  () => `How this connects back to what you already know, and forward to the section that follows.`,
  () => `The one mistake almost everyone makes here first, and how to sidestep it from the start.`,
];

function sectionDescription(kind: string, subject: string, i = 0): string {
  if (kind === "intro") {
    return i % 2 === 0
      ? `What you will learn, why the sequence is ordered this way, and how each topic sets up the next in your study of ${subject}.`
      : `The shape of the whole course, what it deliberately leaves out, and how to work with the tutor session by session.`;
  }
  return SECTION_DESCRIPTIONS[i % SECTION_DESCRIPTIONS.length](subject);
}

export function buildCourse(goal: string): Course {
  const subject = deriveSubject(goal);
  const known = exploreCourses.find((c) => c.goal === goal) as unknown as { topics: Course["topics"] } | undefined;

  const topics: Course["topics"] = [];
  if (known) {
    topics.push(...known.topics.map((t) => ({ ...t })));
  } else {
    topics.push({
      id: `t_${randomUUID().slice(0, 10)}`,
      number: 0,
      title: "Topic 0: Course Introduction",
      description: sectionDescription("intro", subject, 0),
      sections: [
        {
          number: "0.1",
          title: "Roadmap introduction",
          description: sectionDescription("intro", subject, 1),
        },
      ],
    });
  }

  const startAt = topics.length;
  let descIndex = 0;
  GENERIC_TOPICS.slice(known ? 1 : 0, 8 - startAt).forEach((t, i) => {
    const n = startAt + i;
    topics.push({
      id: `t_${randomUUID().slice(0, 10)}`,
      number: n,
      title: `Topic ${n}: ${t.title}`,
      description: t.description.replace("{subject}", subject.toLowerCase()),
      sections: t.sections.map((st, j) => ({
        number: `${n}.${j + 1}`,
        title: st,
        description: sectionDescription("generic", subject, descIndex++ + j),
      })),
    });
  });

  return { id: `c_${randomUUID().slice(0, 12)}`, title: subject, goal, topics };
}

const PART_TITLES = ["First principles", "Core mechanics", "A guided example", "Review and practice"];

function topicShortTitle(topic: Course["topics"][number]): string {
  return topic.title.replace(/^Topic \d+:\s*/, "");
}

export function buildLesson(course: Course, topicIndex: number): LessonDoc {
  const topic = course.topics[Math.min(topicIndex, course.topics.length - 1)];
  const subject = deriveSubject(course.goal).toLowerCase();
  const title = topicShortTitle(topic);

  return {
    id: `l_${randomUUID().slice(0, 12)}`,
    title,
    blocks: [
      { kind: "h1", text: title },
      {
        kind: "p",
        runs: [
          {
            text: `This is the part of the course where ${topic.sections[0]?.title.toLowerCase() ?? title.toLowerCase()} stops being a syllabus line and starts being something you can actually use. Everything here is written against your stated goal — ${subject} — so each idea arrives with a reason to exist.`,
          },
        ],
      },
      { kind: "h2", text: `Part 1: ${PART_TITLES[0]}` },
      {
        kind: "p",
        runs: [
          { text: `Start with the one-sentence version: ` },
          { text: `${title} is the layer of ${subject} that everything later stands on`, bold: true },
          { text: `. If you can explain that sentence to someone at your kitchen table, you already have most of what this part is for.` },
        ],
      },
      {
        kind: "p",
        runs: [
          {
            text: `The rest of the detail is genuinely easier to remember once the sentence is solid, because it stops being trivia and becomes structure. That is the whole trick this course keeps repeating.`,
          },
        ],
      },
      { kind: "h2", text: `Part 2: ${PART_TITLES[1]}` },
      {
        kind: "p",
        runs: [
          {
            text: `Now the machinery. Each piece below does one job, and the job is named before the piece — that ordering is deliberate, and it is how practitioners actually hold this material in their heads.`,
          },
        ],
      },
      { kind: "h3", text: "The moving parts, in the order you will meet them" },
      {
        kind: "p",
        runs: [
          { text: `Work through them slowly. In ${subject}, the classic beginner mistake is not skipping steps — ` },
          { text: `it is doing the steps without knowing which question each one answers`, italic: true },
          { text: `. Keep the questions attached.` },
        ],
      },
      { kind: "h2", text: `Part 3: ${PART_TITLES[2]}` },
      {
        kind: "p",
        runs: [
          {
            text: `Here is a complete worked example, chosen because it trips over every important idea above exactly once. Try to predict each step before reading it; the gap between your prediction and the answer is the actual lesson.`,
          },
        ],
      },
      { kind: "h2", text: `Part 4: ${PART_TITLES[3]}` },
      {
        kind: "p",
        runs: [
          {
            text: `Close the loop: three short exercises, one per idea, then check your work. When one feels shaky, that is not a failure — it is the pointer to what to ask about next session.`,
          },
        ],
      },
      { kind: "h3", text: "What to try before continuing" },
      {
        kind: "p",
        runs: [
          {
            text: `Do the smallest real version of this topic you can manage — not the exercise-sheet version, the real one — and bring whatever confused you back to the chat. The tutor drafts the next part around exactly that.`,
          },
        ],
      },
    ],
  };
}

function cardFrom(section: { title: string; description?: string }, i: number, label: string): WhiteboardCard {
  const words = section.title.split(" ");
  return {
    id: `wc_${randomUUID().slice(0, 10)}`,
    title: words.slice(0, 3).join(" "),
    subtitle: `${label} · ${i + 1}`,
    body: section.description ?? `The core of "${section.title}" in note form.`,
  };
}

export function buildNotes(course: Course, fromTopic = 1): WhiteboardGroup[] {
  const colors: WhiteboardGroup["color"][] = ["orange", "green"];
  const groups: WhiteboardGroup[] = [];

  for (let g = 0; g < 2; g++) {
    const topic = course.topics[Math.min(fromTopic + g, course.topics.length - 1)];
    if (!topic) break;
    const label = `Lesson ${fromTopic + g}`;
    const cards = topic.sections.slice(0, 4).map((s, i) => cardFrom(s, i, label));
    groups.push({
      id: `wg_${randomUUID().slice(0, 10)}`,
      label,
      color: colors[g % 2],
      cards: cards.length
        ? cards
        : [
            {
              id: `wc_${randomUUID().slice(0, 10)}`,
              title: topicShortTitle(topic),
              subtitle: label,
              body: topic.description ?? "Core ideas of this lesson.",
            },
          ],
      note: {
        id: `wn_${randomUUID().slice(0, 10)}`,
        title: `${label} note`,
        summary: `One page tying ${label} together: what it added to the course and what to revisit before the next lesson.`,
        sectionTitle: topicShortTitle(topic),
        bullets: topic.sections.slice(0, 4).map((s) => s.title),
        highlight: g === 1,
      },
    });
  }
  return groups;
}

const DEFAULT_CHOICES = ["Continue", "I have questions", "Too hard", "Not what I want"];

const QUESTION_ANSWERS = [
  (subject: string) => [
    `Good question — it is exactly the right thing to be puzzled by at this stage.`,
    `The short version: in ${subject}, the answer people usually reach for is a shortcut, and it works until it doesn't. The honest version takes one more step, and that step is what makes the rest of the course click.`,
  ],
  (subject: string) => [
    `Let me take that in two passes — the useful answer first, then the precise one.`,
    `Usefully: think of it as ${subject} keeping two books, one for what is happening and one for why it is allowed to happen. Most confusion here is reading one book's answer in the other book. Precisely: bring up the syllabus pane and look at how the previous section ended — this question is the exact hinge into the next one.`,
  ],
  (subject: string) => [
    `That question is a sign the lesson is doing its job.`,
    `Here is the framing I'd offer: strip the question down to what you already accept as true, and notice how little is left over. In ${subject}, that residue is usually one definition away from resolving — and it's a definition we'll meet two sections from now, so hold the tension; it pays off.`,
  ],
];

const CONTINUE_ACK = [
  (part: string, topic: string) => `${part} is ready — ${topic}, drafted at your pace. Read along in the lesson pane; I'll keep the progress checklist honest as you go.`,
  (part: string, topic: string) => `${part} is ready. ${topic} continues exactly where the last part stopped — no reruns, no gaps. The lesson pane is already scrolled to the new section.`,
];

const GENERIC_REPLIES = [
  (subject: string) => `Noted — I'll fold that into how the rest of ${subject} is paced. If it changes what you want out of the course, say so plainly and I'll redraft the syllabus around it.`,
  (subject: string) => `Understood. Keep going the way you are: ask when something itches, continue when it doesn't, and ${subject} will get drafted around you rather than around a template.`,
];

function isQuestion(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.endsWith("?")) return true;
  return /^(why|how|what|when|who|where|which|can|could|should|does|do|is|are)\b/.test(t);
}

/** One tutor turn against the hydrated session. Mutates session artifacts in
 * place (course link, lesson doc, whiteboard, progress) and returns the reply. */
export function localTurn(session: WorkingSession, userName: string, text: string, registerCourse: (c: Course) => void): ChatMessage {
  const t = text.trim();
  const lower = t.toLowerCase();

  if (!session.courseId) {
    if (t.length < 12) {
      return newMessage("tutor", [
        {
          kind: "text",
          text: `Hello ${userName}. Tell me what you'd like to learn — one honest sentence is enough ("I want to learn how to…" works well). I'll draft a full course around it.`,
        },
      ]);
    }
    const drafted = buildCourse(t);
    registerCourse(drafted);
    session.courseId = drafted.id;
    session.title = drafted.title.length > 40 ? `${drafted.title.slice(0, 40)}…` : drafted.title;
    session.pane = "syllabus";
    session.currentTopic = 1;
    session.lessonProgress = { completed: 0, total: 4, items: [...PART_TITLES] };
    return newMessage("tutor", [
      { kind: "thought", summary: "Turning your goal into a course" },
      {
        kind: "text",
        text: `Your personalized course is being set up. I'm organizing "${drafted.goal}" into a structured syllabus of ${drafted.topics.length} topics — starting from where you are, not from page one of a textbook.`,
      },
      { kind: "course-chip", title: drafted.title, caption: "Course syllabus created" },
      {
        kind: "text",
        text: `The full syllabus is in the right pane. Say "Continue" whenever you're ready and I'll teach the first topic, one part at a time.`,
      },
      { kind: "choices", options: DEFAULT_CHOICES, selected: "Continue" },
    ]);
  }

  const course = session.course!;
  const subject = deriveSubject(course.goal).toLowerCase();

  if (/\b(note|notes|summary|summarize|summarise|whiteboard|revision)\b/.test(lower)) {
    session.whiteboard = buildNotes(course, session.currentTopic);
    session.pane = "whiteboard";
    const count = session.whiteboard.reduce((n, g) => n + g.cards.length, 0);
    return newMessage("tutor", [
      { kind: "thought", summary: "Condensing the lesson into notes" },
      {
        kind: "text",
        text: `The lesson notes are ready — ${count} cards across ${session.whiteboard.length} groups, each linking back to the section it came from. They're on your whiteboard now; review should feel like a glance, not a reread.`,
      },
      { kind: "choices", options: DEFAULT_CHOICES },
    ]);
  }

  if (/^(continue|next|go on|keep going|start|begin|ready)\b/.test(lower) || lower === "start the lesson") {
    const progress = session.lessonProgress ?? { completed: 0, total: 4, items: [...PART_TITLES] };
    const topicDone = progress.completed >= progress.total - 1;
    let partLabel: string;
    let topicTitle: string;

    if (!session.lessonDoc || topicDone) {
      const nextIdx = session.lessonDoc ? Math.min(session.currentTopic + 1, course.topics.length - 1) : session.currentTopic;
      session.currentTopic = nextIdx;
      session.lessonDoc = buildLesson(course, nextIdx);
      session.lessonProgress = { completed: 0, total: 4, items: [...PART_TITLES] };
      topicTitle = topicShortTitle(course.topics[nextIdx]);
      partLabel = `Topic ${nextIdx}, Part 1`;
    } else {
      session.lessonProgress = { ...progress, completed: Math.min(progress.completed + 1, progress.total) };
      topicTitle = topicShortTitle(course.topics[session.currentTopic]);
      partLabel = `Part ${session.lessonProgress.completed + 1}`;
    }
    session.pane = "lesson";
    const ack = CONTINUE_ACK[Math.floor(Math.random() * CONTINUE_ACK.length)](partLabel, topicTitle);
    const citePart = session.lessonProgress.completed + 1;
    return newMessage("tutor", [
      { kind: "thought", summary: "Drafting the next part" },
      { kind: "text", text: ack },
      {
        kind: "lesson-progress",
        completed: session.lessonProgress.completed,
        total: session.lessonProgress.total,
        items: session.lessonProgress.items,
      },
      ...(session.lessonDoc
        ? [{ kind: "citations", items: lessonCitations(session.lessonDoc, citePart) } as MessageBlock]
        : []),
      { kind: "choices", options: DEFAULT_CHOICES, selected: "Continue" },
    ]);
  }

  if (/\btoo hard\b|\bsimpler\b|\beasier\b|slow down/.test(lower)) {
    return newMessage("tutor", [
      { kind: "thought", summary: "Recalibrating the difficulty" },
      {
        kind: "text",
        text: `No problem — that feedback is half of what makes this work. Let me try the same ground with less machinery: forget the terminology for a moment. In ${subject}, the one thing this part is really saying is: start from what you already trust, and add exactly one new idea at a time. That's it. The vocabulary is only there so we can refer to that move quickly.`,
      },
      {
        kind: "text",
        text: `When you say "Continue" I'll go slower through the next part and spend longer on the worked example.`,
      },
      { kind: "choices", options: DEFAULT_CHOICES },
    ]);
  }

  if (/not what i want|wrong direction|this isn'?t/.test(lower)) {
    return newMessage("tutor", [
      {
        kind: "text",
        text: `Then let's redraft rather than push through. Tell me what you actually want out of ${subject} — one sentence, in your own words — and I'll rebuild the syllabus around that instead. Starting over is cheap here; that's the point of a drafted course.`,
      },
      { kind: "choices", options: ["Redraft the course", "I have questions"] },
    ]);
  }

  if (/^i have questions?\b/.test(lower)) {
    return newMessage("tutor", [
      {
        kind: "text",
        text: `Ask away — the fuzzy part is usually the important part. One question at a time works best; I'll answer against where you are in the course, not against the textbook.`,
      },
    ]);
  }

  if (isQuestion(t)) {
    const answer = QUESTION_ANSWERS[session.messages.length % QUESTION_ANSWERS.length](subject);
    return newMessage("tutor", [
      { kind: "thought", summary: "Thinking through your question" },
      { kind: "text", text: answer[0] },
      { kind: "text", text: answer[1] },
      ...(session.lessonDoc
        ? [{ kind: "citations", items: lessonCitations(session.lessonDoc) } as MessageBlock]
        : []),
      { kind: "choices", options: DEFAULT_CHOICES },
    ]);
  }

  const reply = GENERIC_REPLIES[session.messages.length % GENERIC_REPLIES.length](subject);
  return newMessage("tutor", [
    { kind: "text", text: reply },
    { kind: "choices", options: DEFAULT_CHOICES },
  ]);
}
