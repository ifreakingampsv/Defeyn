import type { ExploreCoursePreview } from '../types';

/**
 * Content behind the nine "Explore what people are learning" cards.
 *
 * Domain-shaped (persona + goal + generated course topics) so a real backend
 * course-generation service can serve the same shape per slug, the cards will
 * link to /ai-tutor/<slug> course pages that are out of scope for the
 * frontend-only build (see BACKEND.md).
 */

export const exploreCourses: ExploreCoursePreview[] = [
  {
    slug: 'neural-networks-to-llms',
    persona: { id: 'maya', name: 'Maya', initials: 'M', role: 'Product Manager' },
    goal: 'I want to learn how to train an AI model like ChatGPT.',
    topics: [
      {
        id: 'nn-0',
        number: 0,
        title: 'Topic 0: Course Introduction',
        description:
          'Orientation to the full course arc: what ground will be covered, why the sequence is ordered the way it is, and how each major block connects to the next. Sets expectations for the balance of math, intuition, and code throughout.',
        sections: [
          {
            number: '0.1',
            title: 'Roadmap introduction: from perceptrons to ChatGPT',
            description: 'What you will learn, why the order matters, and how each topic sets up the next.',
          },
        ],
      },
      {
        id: 'nn-1',
        number: 1,
        title: 'Topic 1: ML Foundations and the Python/PyTorch Environment',
        description:
          'Before any architecture can be understood, you need a clear mental model of what machine learning actually is and a working environment to experiment in. This topic bridges math background into the ML framing and establishes the PyTorch primitives that every later topic will use.',
        sections: [
          {
            number: '1.1',
            title: 'What machine learning actually is',
            description: 'Distinguishing ML from classical programming: functions learned from data rather than written by hand.',
          },
          {
            number: '1.2',
            title: 'The core ML framing: data, model, loss, optimizer',
            description: 'A unified mental model that applies from linear regression all the way to GPT.',
          },
          { number: '1.3', title: 'Setting up a Python ML environment' },
        ],
      },
    ],
  },
  {
    slug: 'spanish-foundations-for-speaking',
    persona: { id: 'leo', name: 'Leo', initials: 'L', role: 'Software Engineer' },
    goal: 'I want to learn how to speak Spanish confidently.',
    topics: [
      {
        id: 'es-0',
        number: 0,
        title: 'Topic 0: Course Introduction',
        description:
          'Orientation to the full learning journey ahead: how the seven phases connect, why Castilian Spanish has its own distinctive identity, and how to get the most out of a course built around speaking from day one.',
        sections: [
          {
            number: '0.1',
            title: 'Roadmap introduction',
            description: 'What you will learn, why Castilian specifically, and how every topic builds toward real conversation.',
          },
        ],
      },
      {
        id: 'es-1',
        number: 1,
        title: 'Topic 1: Castilian Pronunciation Fundamentals',
        description:
          'Pronunciation is the foundation everything else is built on. Starting here before vocabulary floods in means building correct muscle memory from the start rather than unlearning bad habits later.',
        sections: [
          {
            number: '1.1',
            title: 'The Spanish alphabet: sounds, not letter names',
            description: '29 letters, each with one consistent sound, which is why Spanish is far more phonetically regular than English.',
          },
          {
            number: '1.2',
            title: 'Pure Spanish vowels: A, E, I, O, U',
            description: 'Each vowel has exactly one sound, held cleanly; contrasting with the English habit of diphthonging vowels.',
          },
          { number: '1.3', title: 'The Castilian ceceo: the iconic c/z th sound' },
        ],
      },
    ],
  },
  {
    slug: 'quantum-mechanics-foundations',
    persona: { id: 'sam', name: 'Sam', initials: 'S', role: 'Academic Researcher' },
    goal: 'I want to learn quantum mechanics rigorously from the ground up.',
    topics: [
      {
        id: 'qm-0',
        number: 0,
        title: 'Topic 0: Course Introduction',
        description:
          'Roadmap introduction: what you will learn, why the formalism is ordered this way, and how classical mechanics connects to every stage of the course.',
        sections: [
          {
            number: '0.1',
            title: 'Roadmap introduction',
            description: 'What you will learn, why the formalism is ordered this way, and how classical mechanics connects to every stage of the course.',
          },
        ],
      },
      {
        id: 'qm-1',
        number: 1,
        title: 'Topic 1: Complex Vector Spaces: Building the Mathematical Stage',
        description:
          'Build the mathematical arena for quantum states: complex numbers, complex vector spaces, inner products, Hilbert-space geometry, orthonormal bases, and function spaces.',
        sections: [
          {
            number: '1.1',
            title: 'Why complex numbers are not optional',
            description: 'The physical reasons QM demands ℂ rather than ℝ: interference, phase, and the failure of real-valued wave equations.',
          },
          {
            number: '1.2',
            title: 'Vector spaces over ℂ: axioms and first examples',
            description: 'Defining a complex vector space from the axioms; function spaces and column vectors as the two key examples.',
          },
          { number: '1.3', title: 'Inner products on complex vector spaces' },
        ],
      },
    ],
  },
  {
    slug: 'essay-and-argument-foundations',
    persona: { id: 'aisha', name: 'Aisha', initials: 'A', role: 'College Student' },
    goal: 'I want to learn how to write clearly and publish great essays, articles, or research papers.',
    topics: [
      {
        id: 'wr-0',
        number: 0,
        title: 'Topic 0: Course Introduction',
        description:
          'Orientation to the course arc, its core philosophy, and why each topic is sequenced the way it is. This session frames public writing as a craft distinct from academic or personal writing.',
        sections: [
          {
            number: '0.1',
            title: 'Roadmap introduction',
            description: 'What you will learn, why the sequence matters, and how school writing differs from public writing.',
          },
        ],
      },
      {
        id: 'wr-1',
        number: 1,
        title: 'Topic 1: The Gap Between School Writing and Public Writing',
        description:
          'Before building new skills, it helps to diagnose exactly what is not working. This topic examines how academic writing habits, including thesis-at-the-end structures, differ from what public writing demands.',
        sections: [
          { number: '1.1', title: 'What academic writing trained you to do' },
          { number: '1.2', title: 'What public writing actually demands' },
          { number: '1.3', title: 'The four gaps this course addresses' },
        ],
      },
    ],
  },
  {
    slug: 'personal-finance-foundations',
    persona: { id: 'omar', name: 'Omar', initials: 'O', role: 'Designer' },
    goal: 'I want to learn how to invest wisely and manage my personal finances with confidence.',
    topics: [
      {
        id: 'pf-0',
        number: 0,
        title: 'Topic 0: Course Introduction',
        description:
          'Orientation to the full learning journey ahead: why this sequence was designed the way it was, and how each topic builds directly on the last to take you from money anxiety to genuine financial confidence.',
        sections: [
          {
            number: '0.1',
            title: 'Roadmap introduction',
            description: "What you'll learn, why it matters, and how the topics connect, from budgeting basics to financial independence.",
          },
        ],
      },
      {
        id: 'pf-1',
        number: 1,
        title: 'Topic 1: The Financial Foundation',
        description:
          'Before a single dollar is invested, the financial ground has to be solid. This topic covers the mechanics and psychology of cash flow, budgeting, emergency funds, and debt.',
        sections: [
          { number: '1.1', title: 'Where does the money actually go? Understanding cash flow' },
          { number: '1.2', title: 'Budgeting that actually works' },
          { number: '1.3', title: 'The emergency fund: your financial shock absorber' },
        ],
      },
    ],
  },
  {
    slug: 'music-production-foundations',
    persona: { id: 'ravi', name: 'Ravi', initials: 'R', role: 'Game Developer' },
    goal: 'I want to learn music production and release my first original song.',
    topics: [
      {
        id: 'mu-0',
        number: 0,
        title: 'Topic 0: Course Introduction',
        description:
          'Orientation to the full journey ahead: what each topic covers, how they connect, and how every lesson builds toward one finished, released song.',
        sections: [
          {
            number: '0.1',
            title: 'Roadmap introduction',
            description: "What you'll learn across all ten topics, why the sequence matters, and how your finished song is the through-line.",
          },
        ],
      },
      {
        id: 'mu-1',
        number: 1,
        title: 'Topic 1: Choosing and Setting Up Your DAW',
        description:
          'Before making a single sound, you need the right tools and an understanding of why different DAWs suit different workflows. This topic builds confidence in the tools you will use for everything that follows.',
        sections: [
          { number: '1.1', title: 'What a DAW actually is' },
          { number: '1.2', title: 'Beginner-friendly DAW comparison' },
          { number: '1.3', title: 'Making your choice: matching the DAW to your goals' },
        ],
      },
    ],
  },
  {
    slug: 'relationship-foundations',
    persona: { id: 'priya', name: 'Priya', initials: 'P', role: 'Product Manager' },
    goal: 'I want to learn how to build a meaningful relationship with my partner.',
    topics: [
      {
        id: 'rl-0',
        number: 0,
        title: 'Topic 0: Course Introduction',
        description:
          "An orientation to the course's purpose, structure, and why starting proactively, before problems arise, is one of the most powerful things a person can do for a relationship.",
        sections: [
          { number: '0.1', title: 'Roadmap introduction' },
        ],
      },
      {
        id: 'rl-1',
        number: 1,
        title: 'Topic 1: Knowing Yourself in Relationship',
        description:
          'Before exploring how two people connect, we have to understand the one person you can never leave behind: yourself. This topic establishes self-awareness as the foundation of every relationship skill that follows.',
        sections: [
          { number: '1.1', title: 'Why self-awareness is a relational skill' },
          { number: '1.2', title: 'Your emotional patterns and default tendencies' },
          { number: '1.3', title: 'How personal history shapes relational style' },
        ],
      },
    ],
  },
  {
    slug: 'chinese-kitchen-foundations',
    persona: { id: 'nina', name: 'Nina', initials: 'N', role: 'Customer Success' },
    goal: 'I want to learn how to cook delicious Chinese meals at home without stress.',
    topics: [
      {
        id: 'ck-0',
        number: 0,
        title: 'Topic 0: Course Introduction',
        description:
          'Before the first clove of garlic is minced, this orientation sets up the mental model for the whole course: what Chinese home cooking actually is, why it can be simple, and how the topics build on each other.',
        sections: [
          { number: '0.1', title: 'Roadmap introduction' },
        ],
      },
      {
        id: 'ck-1',
        number: 1,
        title: 'Topic 1: The Chinese Pantry',
        description:
          'You cannot cook confidently from a pantry you do not understand. This topic front-loads the ingredient knowledge that unlocks every recipe in the course.',
        sections: [
          { number: '1.1', title: 'The five flavor pillars of Chinese cooking' },
          { number: '1.2', title: 'Soy sauce: light, dark, and when to use each' },
          { number: '1.3', title: 'The aromatic trio: ginger, garlic, and scallions' },
        ],
      },
    ],
  },
  {
    slug: 'vienna-trip-preparation',
    persona: { id: 'jonas', name: 'Jonas', initials: 'J', role: 'Software Engineer' },
    goal: 'I want to learn how to plan an unforgettable trip to Vienna.',
    topics: [
      {
        id: 'vi-0',
        number: 0,
        title: 'Topic 0: Course Introduction',
        description:
          'A brief orientation to how this course is structured, what you will learn in each topic, and how the pieces connect to your actual experience on the ground in Vienna.',
        sections: [
          { number: '0.1', title: 'Roadmap introduction' },
        ],
      },
      {
        id: 'vi-1',
        number: 1,
        title: 'Topic 1: Vienna in Context',
        description:
          "Before you can appreciate what you see in Vienna, you need to understand the forces that built it: the Habsburg Empire, Vienna's rise as a European capital, and the intellectual golden age around 1900.",
        sections: [
          { number: '1.1', title: 'The Habsburg Empire: who they were and why Vienna looks the way it does' },
          { number: '1.2', title: 'Maria Theresa and Joseph II: the reformers who shaped modern Vienna' },
          { number: '1.3', title: 'The Ringstrasse era (1857-1900): a city reinvents itself' },
        ],
      },
    ],
  },
];
