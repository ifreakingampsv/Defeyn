import type { Board, BoardCard, BoardEdge, Course, LessonDoc } from "./tutor/domain.js";

/**
 * Naive Markdown serializer (ticket 07): structured text out, readable in any
 * plain editor. Pure functions over domain objects — no I/O, no mutation.
 * Lesson blocks keep their stable ids out of the output; citations render as
 * the quoted label so a Board export still shows where material came from.
 */

/** Collapse whitespace in generated headings (Markdown needs no escaping here). */
function mdHeading(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function runsToMd(runs: Array<{ text: string; bold?: boolean; italic?: boolean }>): string {
  return runs
    .map((r) => {
      const t = r.text;
      if (r.bold) return `**${t}**`;
      if (r.italic) return `*${t}*`;
      return t;
    })
    .join("");
}

/** Course syllabus → Markdown (title, goal, topics with sections). */
export function courseToMarkdown(course: Course): string {
  const lines: string[] = [`# ${mdHeading(course.title)}`, "", `> Goal: ${course.goal}`, ""];
  for (const topic of course.topics) {
    lines.push(`## ${mdHeading(topic.title)}`);
    if (topic.description) lines.push("", topic.description);
    for (const s of topic.sections) {
      lines.push("", `- **${s.number} ${mdHeading(s.title)}**${s.description ? ` — ${s.description}` : ""}`);
    }
    lines.push("");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

/** Lesson document → Markdown (stable to the block shapes the editor keeps). */
export function lessonToMarkdown(doc: LessonDoc): string {
  const lines: string[] = [];
  for (const b of doc.blocks) {
    if (b.kind === "h1") lines.push(`# ${mdHeading(b.text)}`, "");
    else if (b.kind === "h2") lines.push(`## ${mdHeading(b.text)}`, "");
    else if (b.kind === "h3") lines.push(`### ${mdHeading(b.text)}`, "");
    else lines.push(runsToMd(b.runs), "");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

/** Board → Markdown: every Card (with creator and source citation) plus its
 * connections rendered as text arrows between card titles. */
export function boardToMarkdown(board: Board, cards: BoardCard[], edges: BoardEdge[]): string {
  const lines: string[] = [`# ${mdHeading(board.title)}`, ""];
  const titleOf = new Map(cards.map((c) => [c.id, c.content.title || "Untitled card"]));
  if (edges.length) {
    lines.push("## Connections", "");
    for (const e of edges) {
      const from = titleOf.get(e.sourceCardId) ?? "(deleted card)";
      const to = titleOf.get(e.targetCardId) ?? "(deleted card)";
      lines.push(`- ${from} → ${to}`);
    }
    lines.push("");
  }
  if (cards.length) {
    lines.push("## Cards", "");
    for (const c of cards) {
      lines.push(`### ${mdHeading(c.content.title || "Untitled card")}`, "");
      const meta: string[] = [c.creator === "tutor" ? "from the Tutor" : "your card"];
      if (c.citation) meta.push(`cites "${c.citation.label}"`);
      lines.push(`*${meta.join(" · ")}*`, "");
      if (c.content.body) lines.push(c.content.body, "");
      if (c.content.bullets?.length) {
        for (const b of c.content.bullets) lines.push(`- ${b}`);
        lines.push("");
      }
    }
  } else {
    lines.push("(no cards yet)", "");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
