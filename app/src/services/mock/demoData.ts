import type { ChatMessage, DemoScript, LessonDoc, WhiteboardGroup } from '../types';

/**
 * Scripted demo content for the marketing page.
 *
 * Shape = what a real backend conversation stream would produce (ChatMessages +
 * generated Course/LessonDoc/Whiteboard artifacts). Presentation timing lives in
 * the demo components; this file only says WHAT is said. When the real AI
 * services land (BACKEND.md), these scripts are replaced by live streams with
 * the same message/block shapes.
 */

const TS_1 = '· 05/01/2026 3:47 PM';
const TS_2 = '· 05/01/2026 3:49 PM';
const TS_0 = '· 03/30/2026 2:03 AM';

let id = 0;
const mid = () => `m${id++}`;

/** Lesson-outline list rendered inside the hero welcome message. */
export const heroOutline: Array<{ head: string; rest: string }> = [
  { head: '2.1 The Sophists', rest: ': who they were and why relativism genuinely threatened philosophy' },
  { head: '2.2 Socrates vs. the Sophists', rest: ": what it means to know that you don't know" },
  { head: '2.3 The Socratic Method', rest: ': how elenchus works, with a deep dive into the Euthyphro' },
];

export const heroScript: DemoScript = {
  id: 'hero',
  messages: [
    {
      id: mid(),
      author: 'user',
      timestamp: TS_1,
      blocks: [{ kind: 'text', text: "I'd like to continue this course." }],
    },
    { id: mid(), author: 'tutor', timestamp: TS_1, blocks: [{ kind: 'thought', summary: 'Start planning the lesson' }] },
    {
      id: mid(),
      author: 'tutor',
      timestamp: TS_1,
      blocks: [
        {
          kind: 'text',
          text: "Welcome back, Maya. You've finished all of Topic 1, a full journey through the Pre-Socratics from Thales to the Atomists. This lesson picks up right where that ended and moves into Topic 2: Socrates and the Sophists.",
        },
      ],
    },
    {
      id: mid(),
      author: 'tutor',
      timestamp: TS_1,
      blocks: [{ kind: 'page-created', title: 'Sophists and Socrates', caption: 'Lesson page created' }],
    },
    {
      id: mid(),
      author: 'tutor',
      timestamp: TS_1,
      blocks: [
        {
          kind: 'text',
          rich: true,
          text: "After nine lessons of cosmology and metaphysics, this lesson marks the famous pivot: philosophy turns from the heavens to the human being. Here's what this lesson covers:",
        },
      ],
    },
    {
      id: mid(),
      author: 'tutor',
      timestamp: TS_1,
      blocks: [
        { kind: 'outline', items: heroOutline },
        {
          kind: 'text',
          text: "By the end, you'll have a firm grip on what Socrates was actually doing, and why it was controversial enough to get him killed.",
        },
      ],
    },
    {
      id: mid(),
      author: 'user',
      timestamp: TS_1,
      blocks: [{ kind: 'text', text: "Looks good, let's go!" }],
    },
    { id: mid(), author: 'tutor', timestamp: TS_1, blocks: [{ kind: 'thought', summary: 'Starting the lesson' }] },
    {
      id: mid(),
      author: 'tutor',
      timestamp: TS_1,
      blocks: [
        {
          kind: 'lesson-progress',
          completed: 0,
          total: 4,
          items: ["The Sophists' Challenge", 'Socrates vs. the Sophists', 'The Socratic Method', 'Review'],
        },
      ],
    },
    {
      id: mid(),
      author: 'tutor',
      timestamp: TS_1,
      blocks: [{ kind: 'page-created', title: "The Sophists' Challenge", caption: 'Lesson part created' }],
    },
    {
      id: mid(),
      author: 'tutor',
      timestamp: TS_1,
      blocks: [
        {
          kind: 'text',
          text: "Part 1 is ready. The Sophists appear in full: Protagoras's relativism, the threat it posed to the entire Pre-Socratic project, and Gorgias's three devastating propositions. The piece also treats the Sophists as genuine philosophical figures, not just foils for Socrates.",
        },
      ],
    },
    { id: mid(), author: 'user', timestamp: TS_2, blocks: [{ kind: 'text', text: 'Continue' }] },
    { id: mid(), author: 'tutor', timestamp: TS_2, blocks: [{ kind: 'thought', summary: '' }] },
    {
      id: mid(),
      author: 'tutor',
      timestamp: TS_2,
      blocks: [
        {
          kind: 'lesson-progress',
          completed: 1,
          total: 4,
          items: ["The Sophists' Challenge", 'Socrates vs. the Sophists', 'The Socratic Method', 'Review'],
        },
      ],
    },
    { id: mid(), author: 'tutor', timestamp: TS_2, blocks: [{ kind: 'step', label: 'Creating the next part' }] },
    {
      id: mid(),
      author: 'tutor',
      timestamp: TS_2,
      blocks: [
        {
          kind: 'text',
          text: 'Part 2 is ready, and it is Socrates in full: his background, the Socratic problem, his contrasts with the Sophists across money, knowledge, and purpose, the oracle story, the question of whether virtue is teachable, and his divine mission as gadfly. It also makes clear why he was threatening in a way the Sophists never were.',
        },
      ],
    },
    {
      id: mid(),
      author: 'tutor',
      timestamp: TS_2,
      blocks: [
        { kind: 'text', text: 'Next up is the Euthyphro, where all of this becomes concrete through a real dialogue.' },
      ],
    },
    {
      id: mid(),
      author: 'tutor',
      timestamp: TS_2,
      blocks: [{ kind: 'choices', options: ['Continue', 'I have questions', 'Too hard', 'Not what I want'], selected: 'Continue' }],
    },
  ],
  lessonDoc: {
    id: 'sophists-and-socrates',
    title: 'Socrates vs. the Sophists',
    blocks: [
      { kind: 'h1', text: 'Socrates vs. the Sophists' },
      { kind: 'h2', text: 'A Man Who Looked Like a Satyr and Thought Like No One Else' },
      {
        kind: 'p',
        runs: [
          {
            text: 'Here is a puzzle worth sitting with before we begin: if you had been an ordinary Athenian citizen in 420 BCE, you would have found it genuinely difficult to explain why Socrates was different from the Sophists you had already met. Both wandered the city asking questions. Both attracted young men hungry for intellectual excitement. Both were linked, in the popular mind, with clever argument and ideas that challenged received wisdom. In fact, the comic playwright Aristophanes wrote a play, ',
          },
          { text: 'The Clouds', italic: true },
          {
            text: ', first performed in 423 BCE, that lampooned Socrates as a typical Sophist: he runs a place called the "Thinkery," charges fees, teaches students how to make the weaker argument defeat the stronger, and generally embodies everything the conservative Athenian found alarming about the new intellectual culture.',
          },
        ],
      },
      {
        kind: 'p',
        runs: [
          {
            text: 'Aristophanes was wrong about almost every detail. But the fact that he could get away with the caricature, that Athenian audiences found it recognizable, tells us something important. The distinction between Socrates and the Sophists was not obvious. It took careful attention, and perhaps a long conversation, to see that beneath the superficial resemblances lay a difference in purpose.',
          },
        ],
      },
      { kind: 'h2', text: 'The Historical Figure and the Socratic Problem' },
      {
        kind: 'p',
        runs: [
          {
            text: 'Socrates was born around 470 BCE in Athens, the son of Sophroniscus, a stonemason. His mother, Phaenarete, was a midwife, an occupation Socrates would later claim (with characteristic irony) that he practiced in a different medium: helping men give birth to ideas.',
          },
        ],
      },
      {
        kind: 'p',
        runs: [
          {
            text: 'By physical standards, Socrates was a strange specimen. He was famously described as stocky, snub-nosed, with bulging eyes and a broad face, more satyr than Athenian ideal. He went barefoot in all seasons, wore the same rough cloak, and could stand lost in thought for hours.',
          },
        ],
      },
      {
        kind: 'p',
        runs: [
          { text: 'Then comes the most important fact: ' },
          { text: 'Socrates wrote nothing.', bold: true },
          {
            text: ' Not a single word. Everything we know about him comes from other people, primarily three: Plato, his devoted student; Xenophon, a more practically minded figure who left memoirs of Socrates; and Aristophanes, who saw him from the outside and mocked him. This gap is the famous ',
          },
          { text: 'Socratic problem', bold: true },
          {
            text: ': the difficulty, perhaps the impossibility, of separating the historical Socrates from the literary and philosophical constructions his followers built around him.',
          },
        ],
      },
    ],
  },
};

export const goalScript: DemoScript = {
  id: 'goal',
  typedInput:
    'I want to learn the entire history of Western philosophy from the Pre-Socratics to Postmodernism.',
  messages: [
    {
      id: mid(),
      author: 'user',
      timestamp: TS_0,
      blocks: [
        {
          kind: 'text',
          text: 'I want to learn the entire history of Western philosophy from the Pre-Socratics to Postmodernism.',
        },
      ],
    },
    {
      id: mid(),
      author: 'tutor',
      timestamp: TS_0,
      blocks: [
        {
          kind: 'text',
          text: "Your personalized course is being set up. I'm organizing the materials into a structured syllabus around your current level.",
        },
        { kind: 'course-chip', title: 'History of Western Philosophy', caption: 'Course syllabus created' },
      ],
    },
  ],
  course: {
    id: 'history-of-western-philosophy',
    title: 'History of Western Philosophy',
    goal: 'Learn the entire history of Western philosophy from the Pre-Socratics to Postmodernism.',
    topics: [
      {
        id: 'topic-15',
        number: 15,
        title: 'Topic 15: Postmodernism and Contemporary Thought',
        description:
          'Foucault, Derrida, Lyotard, and Rorty each question the very foundations of the Western philosophical project: universal reason, objective truth, and grand historical narratives.',
        sections: [
          { number: '15.1', title: 'What is postmodernism? The critique of the Enlightenment project' },
          { number: '15.2', title: 'Foucault I', description: 'knowledge, power, and archaeology of discourse' },
          { number: '15.3', title: 'Foucault II', description: 'discipline, surveillance, and the genealogy of the subject' },
          { number: '15.4', title: 'Foucault III', description: 'sexuality, the care of the self, and ethics' },
          { number: '15.5', title: 'Derrida', description: 'deconstruction and the instability of meaning' },
          { number: '15.6', title: 'Lyotard', description: 'the postmodern condition and the end of grand narratives' },
          { number: '15.7', title: 'Rorty', description: 'pragmatism, irony, and the end of epistemology' },
          { number: '15.8', title: 'Contemporary threads', description: 'feminism, critical theory, and analytic-continental rapprochement' },
          { number: '15.9', title: 'Where does Western philosophy stand today?' },
          { number: '15.10', title: 'Capstone', description: 'your own philosophical position' },
        ],
      },
    ],
  },
};

const curriculumLessonDoc: LessonDoc = {
  id: 'socrates-vs-the-sophists',
  title: 'Socrates vs. the Sophists',
  blocks: [
    { kind: 'h1', text: 'Socrates vs. the Sophists' },
    { kind: 'h2', text: 'A Man Who Looked Like a Satyr and Thought Like No One Else' },
    {
      kind: 'p',
      runs: [
        {
          text: "Here is a puzzle worth sitting with before we begin: if you had been an ordinary Athenian citizen in 420 BCE, you would have found it genuinely difficult to explain why Socrates was different from the Sophists you had already met. Both wandered the city asking questions. Both attracted young men hungry for intellectual excitement. Both were linked, in the popular mind, with clever argument and ideas that challenged received wisdom. In fact, the comic playwright Aristophanes wrote a play, ",
        },
        { text: 'The Clouds', italic: true },
        {
          text: ', first performed in 423 BCE, that lampooned Socrates as a typical Sophist: he runs a place called the "Thinkery," charges fees, teaches students how to make the weaker argument defeat the stronger, and generally embodies everything the conservative Athenian found alarming about the new intellectual culture.',
        },
      ],
    },
    {
      kind: 'p',
      runs: [
        {
          text: 'Aristophanes was wrong about almost every detail. But the fact that he could get away with the caricature, that Athenian audiences found it recognizable, tells us something important. The distinction between Socrates and the Sophists was not obvious. It took careful attention, and perhaps a long conversation, to see that beneath the superficial resemblances lay a difference in purpose.',
        },
      ],
    },
    { kind: 'h2', text: 'The Historical Figure and the Socratic Problem' },
    {
      kind: 'p',
      runs: [
        {
          text: 'Socrates was born around 470 BCE in Athens, the son of Sophroniscus, a stonemason. His mother, Phaenarete, was a midwife, an occupation Socrates would later claim (with characteristic irony) that he practiced in a different medium: while she helped women give birth, he helped young men give birth to ideas.',
        },
      ],
    },
    {
      kind: 'p',
      runs: [
        {
          text: 'By physical standards, Socrates was a strange specimen. He was famously described as stocky, snub-nosed, with bulging eyes and a broad face, more satyr than Athenian ideal. He went barefoot in all seasons, wore the same rough cloak, and was indifferent to comfort.',
        },
      ],
    },
    {
      kind: 'p',
      runs: [
        { text: 'Then comes the most important fact: ' },
        { text: 'Socrates wrote nothing.', bold: true },
        {
          text: ' Not a single word. Everything we know about him comes from other people, primarily three: Plato, his devoted student; Xenophon, a more practically minded figure who left memoirs of Socrates; and Aristophanes, who saw him from the outside and made him a comic character. This gap is the ',
        },
        { text: 'Socratic problem', bold: true },
        {
          text: ': the difficulty, perhaps the impossibility, of separating the historical Socrates from the literary and philosophical constructions his followers built around him.',
        },
      ],
    },
    {
      kind: 'p',
      runs: [
        {
          text: 'For this course, we work primarily with the Platonic portrait, especially in the early dialogues (the ',
        },
        { text: 'Apology', italic: true },
        { text: ', ' },
        { text: 'Euthyphro', italic: true },
        { text: ', ' },
        { text: 'Crito', italic: true },
        { text: ', and ' },
        { text: 'Meno', italic: true },
        {
          text: '), where most scholars believe we meet a Socrates closest to the historical original, before Plato began using the character as a mouthpiece for his own more elaborate theories.',
        },
      ],
    },
    { kind: 'h2', text: 'The Superficial Resemblances, and Why They Matter' },
    {
      kind: 'p',
      runs: [
        {
          text: 'The confusion between Socrates and the Sophists was not just a theatrical joke. It had real consequences. When Socrates stood trial in 399 BCE on charges of impiety and corrupting the youth, he acknowledged in the ',
        },
        { text: 'Apology', italic: true },
        {
          text: ' that the prejudice accumulated over decades, the popular image of Socrates as a clever talker who made the weaker argument stronger, was at least as dangerous to him as the formal accusations.',
        },
      ],
    },
    {
      kind: 'p',
      runs: [
        {
          text: 'What made the confusion plausible? At the surface level, the parallels are real. Socrates, like the Sophists, was a public intellectual who engaged strangers in conversation, questioned conventional wisdom, and attracted the young and ambitious.',
        },
      ],
    },
    {
      kind: 'p',
      runs: [
        {
          text: 'But the resemblances are like the resemblance between a doctor and a poisoner: both hand people things to drink, and the immediate experience might feel similar. The aims, the methods, and the effects are something else entirely.',
        },
      ],
    },
    { kind: 'h2', text: 'The Three Core Contrasts' },
    { kind: 'h3', text: 'Money: Wisdom Is Not a Commodity' },
    {
      kind: 'p',
      runs: [
        {
          text: "The Sophists charged fees, often substantial ones. Protagoras reportedly charged the equivalent of a craftsman's annual wages for a full course of instruction. Gorgias commanded extraordinary sums.",
        },
      ],
    },
    {
      kind: 'p',
      runs: [
        { text: 'Socrates refused to charge anything, ever. For him this was ' },
        { text: 'a principled philosophical stance', bold: true },
        { text: ', not a personal quirk.' },
      ],
    },
    { kind: 'h3', text: 'Claiming to Know: The Epistemology of Ignorance' },
    {
      kind: 'p',
      runs: [
        { text: 'This brings us to perhaps the most philosophically important contrast. The Sophists ' },
        { text: 'claimed to know', bold: true },
        {
          text: '. They offered courses in virtue, rhetoric, and practical wisdom. Protagoras explicitly claimed he could make people better, more virtuous and more effective, through instruction.',
        },
      ],
    },
    { kind: 'p', runs: [{ text: 'Socrates claimed to know virtually nothing.' }] },
    {
      kind: 'p',
      runs: [
        { text: 'But here is the twist, the move that separates him from the Sophists and opens a new kind of philosophy: Socrates recognized his ignorance, and they did not. He argued that ' },
        { text: "knowing that you don't know is itself a form of wisdom", bold: true },
        {
          text: ', perhaps the beginning of wisdom. You cannot seek what you think you already have.',
        },
      ],
    },
    { kind: 'h3', text: 'Purpose: The Care of the Soul' },
    {
      kind: 'p',
      runs: [
        { text: 'The Sophists had a clear aim: to make their students ' },
        { text: 'more effective', bold: true },
        {
          text: '. More persuasive in the assembly, more capable advocates in the courts, more successful in the competitions that Athenian life staged.',
        },
      ],
    },
    { kind: 'h2', text: 'The Delphic Oracle and What Wisdom Actually Is' },
    {
      kind: 'p',
      runs: [
        { text: 'The story Socrates tells in the ' },
        { text: 'Apology', italic: true },
        {
          text: " about how his philosophical mission began is one of the most important passages in all of philosophy. His friend Chaerephon went to the oracle at Delphi and asked whether anyone in the world was wiser than Socrates. The Pythia answered: no one.",
        },
      ],
    },
    { kind: 'h2', text: 'Is Virtue Teachable? The Problem That Would Not Go Away' },
    {
      kind: 'p',
      runs: [
        {
          text: 'One of the sharpest points of confrontation between Socrates and the Sophists concerns a question both sides took seriously: can virtue be taught?',
        },
      ],
    },
    { kind: 'h2', text: 'The Gadfly: A Religious Mission' },
    {
      kind: 'p',
      runs: [
        { text: 'There is one more element of the Socratic self-understanding that separates him fundamentally from the Sophists: Socrates believed he had a ' },
        { text: 'divine mission', bold: true },
        { text: '.' },
      ],
    },
    { kind: 'h2', text: 'What Comes Next' },
    {
      kind: 'p',
      runs: [
        {
          text: 'Socrates, then, is not a better Sophist. He is something categorically different: a figure who uses dialogue not to equip students with tools but to dismantle false certainty and pursue genuine understanding.',
        },
      ],
    },
  ],
};

export const curriculumScript: DemoScript = {
  id: 'curriculum',
  messages: [
    {
      id: mid(),
      author: 'user',
      blocks: [{ kind: 'text', text: 'Why is Socrates not just another Sophist?' }],
    },
    {
      id: mid(),
      author: 'tutor',
      blocks: [
        {
          kind: 'text',
          text: 'The Sophists taught people how to win arguments and succeed in public life. Socrates cared about something deeper: whether people actually understood justice, virtue, and the good life. He did not sell answers; he exposed false confidence so real inquiry could begin.',
        },
      ],
    },
  ],
};

export const whiteboardScript: DemoScript = {
  id: 'whiteboard',
  messages: [
    {
      id: mid(),
      author: 'tutor',
      blocks: [
        {
          kind: 'text',
          text: "Good work today, Maya. Would you like me to create lesson notes summarizing this session: the Parmenides argument, Zeno's paradoxes, the Atomists, and the full Pre-Socratic legacy?",
        },
      ],
    },
    { id: mid(), author: 'user', blocks: [{ kind: 'text', text: 'Yes, create notes' }] },
    { id: mid(), author: 'tutor', blocks: [{ kind: 'step', label: 'Creating Lesson 2 note' }] },
    {
      id: mid(),
      author: 'tutor',
      blocks: [
        {
          kind: 'text',
          text: 'The lesson notes are ready. They cover all four parts (Parmenides, Zeno, the Atomists, and the Pre-Socratic legacy) and link back to each lesson card.',
        },
      ],
    },
  ],
};

export const whiteboardGroups: WhiteboardGroup[] = [
  {
    id: 'lesson-1',
    label: 'Lesson 1',
    color: 'orange',
    cards: [
      {
        id: 'l1c1',
        title: 'Course Roadmap',
        subtitle: "A Question You Can't Escape",
        body: 'Here is a question: is it wrong to lie? Your first instinct is probably "yes, of course." But now consider: what if you are lying to protect someone from harm? That question is over two thousand years old.',
      },
      {
        id: 'l1c2',
        title: 'Myth to Reason',
        subtitle: 'A World Already Explained',
        body: 'Before you can appreciate what the ancient Greeks invented, you need to understand what they already had, because mythological explanation was already a complete, coherent system.',
      },
      {
        id: 'l1c3',
        title: 'Thales and Anaximander',
        subtitle: 'A Question Nobody Had Asked Before',
        body: 'Here is a strange fact: for most of human history, nobody asked what the world is made of. Not because people were uncurious, but because the question is harder than it looks.',
      },
      {
        id: 'l1c4',
        title: 'Pythagoras and Heraclitus',
        subtitle: 'A Fork in the Road',
        body: 'You have just watched two thinkers, Thales and Anaximander, ask a genuinely new kind of question: what is everything made of? Their answers differed, but their approach was the same.',
      },
    ],
    note: {
      id: 'l1n',
      title: 'Lesson 1 note',
      summary:
        'This lesson oriented Maya to the full arc of the course: what philosophy is, why its history is the best entry point, and how to engage with live questions.',
      sectionTitle: 'Course Roadmap',
      bullets: [
        'Philosophy resists easy definition but is best understood through its questions: metaphysics, epistemology, ethics.',
        'Why history is the essential entry point: philosophy is a conversation, and every major thinker responds to what came before.',
        'The right way to engage: treat every argument as a live question; ask whether it works, where it fails, and what it leaves open.',
        'The arc of the course spans six broad phases.',
      ],
    },
  },
  {
    id: 'lesson-2',
    label: 'Lesson 2',
    color: 'green',
    cards: [
      {
        id: 'l2c1',
        title: 'Being Cannot Change',
        subtitle: 'A Philosopher Who Looked Away from the World',
        body: 'Every Pre-Socratic before Parmenides shared a common orientation: they looked outward at the world and asked what it is made of. Parmenides looked inward instead.',
      },
      {
        id: 'l2c2',
        title: "Zeno's Paradoxes",
        subtitle: 'The Philosopher Who Turned Common Sense Against Itself',
        body: 'Here is something you have done ten thousand times without thinking: walked across a room. Zeno will not let you do it again so easily.',
      },
      {
        id: 'l2c3',
        title: 'Atoms in the Void',
        subtitle: 'A Philosophical Trap, and a Way Out',
        body: 'Here is the situation Parmenides left every later thinker in. He had argued, with seemingly airtight logic, that change is impossible. The Atomists found the way out.',
      },
      {
        id: 'l2c4',
        title: 'The Pre-Socratic Legacy',
        subtitle: 'A Tradition That Created Its Own Problems',
        body: "Here is a strange but important truth about intellectual progress: the most successful periods of inquiry don't just answer questions, they create better ones.",
      },
    ],
    note: {
      id: 'l2n',
      title: 'Lesson 2 note',
      summary:
        "This lesson completed the Pre-Socratic survey, moving from Parmenides's radical logical argument that change is impossible to the Atomists' escape route.",
      sectionTitle: 'Being Cannot Change',
      bullets: [
        'Parmenides made an unprecedented move: he turned away from observation entirely and argued from pure logic alone.',
        'The two paths: the Way of Truth ("it is, and cannot not-be") vs. the Way of Opinion (the path mortals follow).',
        'Consequences for Being: eternal, one and indivisible, unchanging.',
        'Why it matters methodologically: the first purely a priori deductive argument in Western philosophy.',
      ],
      highlight: true,
    },
  },
];

// Attached after declaration to avoid forward references at module init.
curriculumScript.lessonDoc = curriculumLessonDoc;
whiteboardScript.whiteboard = whiteboardGroups;

export const demoScripts: DemoScript[] = [heroScript, goalScript, curriculumScript, whiteboardScript];

/** Sidebar tree shown in the hero demo, a fixture for a future listSessions() call. */
export const heroSidebarFixture = {
  workspace: 'Master Western Philosophy',
  course: { title: 'History of Western Philosophy', badge: '3' },
  sessions: [
    { title: '3. Sophists and S…', badge: '1m', active: true, depth: 1 },
    { title: '2. Parmenides and…', badge: '3h', depth: 1 },
    { title: '1. Philosophy Begins', badge: '2d', depth: 1 },
  ],
  collapsed: [
    { title: 'The Search for Mat…', badge: '16' },
    { title: 'Ancient to Modern P…', badge: '3' },
  ],
};

export type { ChatMessage };
