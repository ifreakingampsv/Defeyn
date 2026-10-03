/**
 * The live editable Lesson pane (v2, ticket 06): the workspace lesson doc
 * rendered as a TipTap rich-text editor — plain rich text only (bold/italic,
 * headings, lists, links; image/math blocks are v2.1+ and the block schema
 * already reserves room for them). Forked from the demo DocPanel's visual
 * language (PanelFrame, identical reading typography, citation drawer); the
 * scripted demo replay itself is untouched.
 *
 * Block fidelity (ADR-0002): pre-existing blocks carry server-owned ids that
 * ride along as `blockId` attrs on the editor nodes (rendered as
 * `data-block-id`, the anchor citation focus targets) and are preserved
 * verbatim on the way back to DocBlocks. The editor never mints ids — blocks
 * the learner creates are id-less; the server stamps them on save.
 */

import './lesson-editor.css';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { Extension, type Editor, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Bold, BookMarked, Heading2, Heading3, Italic, Link2, List, ListOrdered, X } from 'lucide-react';
import type { Citation, DocBlock, DocRun, LessonDoc } from '@/services/types';
import type { DocFocus } from '@/components/demo/DocPanel';
import { PanelFrame } from '@/components/demo/DocPanel';

/* ---- LessonDoc.blocks ↔ TipTap JSON ---- */

/** Runs → inline text nodes with bold/italic marks. 1:1 mapping, no run
 * merging (the ticket's sanctioned simplification). */
function runsToInline(runs: DocRun[]): JSONContent[] | undefined {
  const children: JSONContent[] = [];
  for (const run of runs) {
    if (!run.text) continue;
    const marks: Array<{ type: string }> = [];
    if (run.bold) marks.push({ type: 'bold' });
    if (run.italic) marks.push({ type: 'italic' });
    children.push(marks.length > 0 ? { type: 'text', text: run.text, marks } : { type: 'text', text: run.text });
  }
  return children.length > 0 ? children : undefined;
}

/** Blocks → TipTap document content. Every block's server-owned id rides
 * along as a `blockId` node attr; id-less blocks stay id-less. */
function blocksToTiptapContent(blocks: DocBlock[]): JSONContent[] {
  return blocks.map((block): JSONContent => {
    if (block.kind !== 'p') {
      return {
        type: 'heading',
        attrs: { level: Number(block.kind[1]), ...(block.id ? { blockId: block.id } : {}) },
        content: runsToInline([{ text: block.text }]),
      };
    }
    return {
      type: 'paragraph',
      ...(block.id ? { attrs: { blockId: block.id } } : {}),
      content: runsToInline(block.runs),
    };
  });
}

function textOf(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(textOf).join('');
}

/** Inline editor content → runs (hard breaks serialize as "\n"). */
function inlineToRuns(node: JSONContent): DocRun[] {
  const runs: DocRun[] = [];
  for (const child of node.content ?? []) {
    if (child.type === 'hardBreak') {
      runs.push({ text: '\n' });
      continue;
    }
    if (child.type !== 'text' || !child.text) continue;
    const marks = child.marks ?? [];
    runs.push({
      text: child.text,
      ...(marks.some((m) => m.type === 'bold') ? { bold: true } : {}),
      ...(marks.some((m) => m.type === 'italic') ? { italic: true } : {}),
    });
  }
  return runs;
}

/** The DocBlock contract has no list kind (h1|h2|h3|p only), so list items
 * flatten to paragraphs with their visible marker kept ("• ", "1. ") — no
 * learner text is lost on the round trip. */
function listToBlocks(node: JSONContent, marker: (index: number) => string, indent: string, out: DocBlock[]): void {
  let counter = 1;
  for (const item of node.content ?? []) {
    if (item.type !== 'listItem') continue;
    const prefix = `${indent}${marker(counter)}`;
    let first = true;
    for (const child of item.content ?? []) {
      if (child.type === 'paragraph') {
        const runs = inlineToRuns(child);
        out.push({ kind: 'p', runs: first ? [{ text: prefix }, ...runs] : runs });
        first = false;
      } else if (child.type === 'bulletList' || child.type === 'orderedList') {
        listToBlocks(child, marker, `${indent}  `, out);
      }
    }
    counter += 1;
  }
}

/** One top-level editor node → the DocBlock(s) it serializes to (a list
 * node flattens to many; everything else is 1:1). */
function nodeToBlocks(node: JSONContent): DocBlock[] {
  const id = typeof node.attrs?.blockId === 'string' ? (node.attrs.blockId as string) : undefined;
  if (node.type === 'heading') {
    const level = node.attrs?.level;
    const kind = level === 2 ? 'h2' : level === 3 ? 'h3' : 'h1';
    return [{ kind, text: textOf(node), ...(id ? { id } : {}) }];
  }
  if (node.type === 'bulletList' || node.type === 'orderedList') {
    const out: DocBlock[] = [];
    listToBlocks(node, node.type === 'orderedList' ? (i) => `${i}. ` : () => '• ', '', out);
    return out;
  }
  return [{ kind: 'p', runs: inlineToRuns(node), ...(id ? { id } : {}) }];
}

/** Editor JSON → DocBlocks, preserving every carried block id. */
function tiptapToBlocks(json: JSONContent): DocBlock[] {
  return (json.content ?? []).flatMap(nodeToBlocks);
}

/** Editor JSON → the sanitized LessonDoc emitted upward. The first h1 stays
 * blocks[0], so editing the heading retitles the document; otherwise the
 * existing title is kept. */
function tiptapToDoc(base: LessonDoc, json: JSONContent): LessonDoc {
  const blocks = tiptapToBlocks(json);
  const first = blocks[0];
  const title = first && first.kind === 'h1' && first.text.trim().length > 0 ? first.text : base.title;
  return { id: base.id, title, blocks };
}

function sameRuns(a: DocRun[], b: DocRun[]): boolean {
  return (
    a.length === b.length &&
    a.every((r, i) => r.text === b[i].text && !!r.bold === !!b[i].bold && !!r.italic === !!b[i].italic)
  );
}

/** True when `incoming` is content-identical to what we last emitted, except
 * that the server may have stamped ids onto previously id-less blocks (it
 * never rewrites existing ones). Save echoes pass this check and are
 * swallowed instead of resetting the editor. */
function isEchoOfEmitted(emitted: DocBlock[], incoming: DocBlock[]): boolean {
  if (emitted.length !== incoming.length) return false;
  return incoming.every((block, i) => {
    const prev = emitted[i];
    if (prev.kind !== block.kind) return false;
    if (block.id && block.id !== prev.id) return false;
    if (block.kind === 'p' && prev.kind === 'p') return sameRuns(prev.runs, block.runs);
    if (block.kind !== 'p' && prev.kind !== 'p') return prev.text === block.text;
    return false;
  });
}

/** `data-block-id` on top-level blocks (ADR-0002): the DOM anchor citation
 * focus targets while the learner edits. Ids are server-owned — this only
 * carries them, never assigns one. */
const BlockIdAnchor = Extension.create({
  name: 'blockIdAnchor',
  addGlobalAttributes() {
    return [
      {
        types: ['heading', 'paragraph'],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-block-id'),
            renderHTML: (attributes) =>
              attributes.blockId ? { 'data-block-id': attributes.blockId as string } : {},
          },
        },
      },
    ];
  },
});

/* ---- toolbar ---- */

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      // keep the editor's text selection when a tool is clicked
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-6 min-w-[26px] items-center justify-center rounded-[5px] border px-1.5 transition-colors ${
        active
          ? 'border-accent bg-pill-bg text-accent'
          : 'border-transparent text-sub hover:bg-pill-bg hover:text-ink-strong'
      }`}
    >
      {children}
    </button>
  );
}

function ToolDivider() {
  return <span className="mx-1 h-4 w-px bg-panel-border" aria-hidden />;
}

/* ---- the pane ---- */

/** Flash duration for a block the user jumped to via a citation/link. */
const FOCUS_MS = 1800;

export interface LessonEditorProps {
  doc: LessonDoc;
  className?: string;
  /** scroll-to-block request for the lesson pane (citations, progress items) */
  focusBlock?: DocFocus | null;
  /** citations listed in the doc header; clicking one scrolls to its block */
  citations?: Citation[];
  /** the sanitized LessonDoc after every edit — the parent owns debounced
   * per-object persistence */
  onDocChange?: (doc: LessonDoc) => void;
}

/** The workspace's live lesson pane: a TipTap document the learner edits in
 * place (the pane IS the editor — no view/edit toggle). Undo/redo is the
 * editor's built-in history. */
export default function LessonEditor({ doc, className = '', focusBlock, citations, onDocChange }: LessonEditorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showCitations, setShowCitations] = useState(false);
  /** blocks of the doc we last loaded/emitted — echo detection */
  const lastEmittedRef = useRef<DocBlock[]>(doc.blocks);
  const docIdRef = useRef(doc.id);
  /** latest props for editor-event callbacks (avoid stale closures) */
  const docRef = useRef(doc);
  const onDocChangeRef = useRef(onDocChange);
  useEffect(() => {
    docRef.current = doc;
    onDocChangeRef.current = onDocChange;
  });
  /** last focus request served ("index:nonce") — identical re-runs are no-ops */
  const servedFocusRef = useRef<string | null>(null);

  const handleUpdate = useCallback((ed: Editor) => {
    const emitted = tiptapToDoc(docRef.current, ed.getJSON());
    lastEmittedRef.current = emitted.blocks;
    onDocChangeRef.current?.(emitted);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // plain rich text only (spec): bold/italic, headings, lists, links.
        // undoRedo (history) stays — the editor's built-in undo is in scope.
        blockquote: false,
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        horizontalRule: false,
        // configured below from the standalone package
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      BlockIdAnchor,
    ],
    content: { type: 'doc', content: blocksToTiptapContent(doc.blocks) },
    editorProps: {
      attributes: {
        'aria-label': 'Lesson document',
      },
    },
    onUpdate: ({ editor: ed }) => handleUpdate(ed),
  });

  /** Scroll a block into view and flash it: by `data-block-id` when the block
   * carries a server-owned id (ADR-0002 — survives any amount of editing),
   * falling back to the block's position for id-less demo fixtures. */
  const scrollFlashToIndex = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    let target = container.querySelector<HTMLElement>(
      `[data-block-id="${CSS.escape(docRef.current.blocks[index]?.id ?? '')}"]`,
    );
    if (!target) {
      // id-less fixtures: the block's position among the editor's blocks
      target = container.querySelectorAll<HTMLElement>('.ProseMirror > *')[index] ?? null;
    }
    if (!target) return;
    const el = target;
    setShowCitations(false);
    container.scrollTo({ top: Math.max(0, el.offsetTop - container.offsetTop - 16), behavior: 'smooth' });
    el.classList.add('lesson-flash');
    window.setTimeout(() => el.classList.remove('lesson-flash'), FOCUS_MS);
  }, []);

  useEffect(() => {
    if (!focusBlock || !editor) return;
    const key = `${focusBlock.index}:${focusBlock.nonce}`;
    if (servedFocusRef.current === key) return;
    servedFocusRef.current = key;
    const raf = requestAnimationFrame(() => scrollFlashToIndex(focusBlock.index));
    return () => cancelAnimationFrame(raf);
  }, [focusBlock, editor, scrollFlashToIndex]);

  // Keep the editor in step with the incoming doc prop: load a different
  // document outright; on a same-id update swallow save echoes (adopting any
  // server-stamped ids in place) and reload only for real outside changes —
  // the Tutor appending the next Part must appear, our own saves must not
  // reset the caret.
  useEffect(() => {
    if (!editor) return;
    const sameDoc = doc.id === docIdRef.current;
    docIdRef.current = doc.id;
    if (sameDoc && isEchoOfEmitted(lastEmittedRef.current, doc.blocks)) {
      lastEmittedRef.current = doc.blocks;
      // the save echo may carry newly stamped ids for blocks the learner
      // added — write them onto the matching nodes (1:1 nodes only; a list
      // node flattens to several blocks and cannot adopt one id)
      let touched = false;
      let blockIndex = 0;
      const tr = editor.state.tr;
      editor.state.doc.forEach((node, offset) => {
        const at = blockIndex;
        blockIndex += nodeToBlocks(node.toJSON() as JSONContent).length;
        if (blockIndex - at !== 1) return;
        const id = doc.blocks[at]?.id;
        if (id && !node.attrs.blockId) {
          tr.setNodeMarkup(offset, undefined, { ...node.attrs, blockId: id });
          touched = true;
        }
      });
      if (touched) editor.view.dispatch(tr);
      return;
    }
    lastEmittedRef.current = doc.blocks;
    const { from, to } = editor.state.selection;
    editor.commands.setContent({ type: 'doc', content: blocksToTiptapContent(doc.blocks) }, { emitUpdate: false });
    // keep the caret roughly where it was across an external reload
    const size = Math.max(0, editor.state.doc.content.size - 1);
    editor.commands.setTextSelection({ from: Math.min(from, size), to: Math.min(to, size) });
  }, [doc, editor]);

  // Toolbar active states — useEditorState keeps them live without
  // re-rendering the document on every transaction.
  const tools = useEditorState({
    editor,
    selector: ({ editor: ed }) =>
      ed
        ? {
            bold: ed.isActive('bold'),
            italic: ed.isActive('italic'),
            h2: ed.isActive('heading', { level: 2 }),
            h3: ed.isActive('heading', { level: 3 }),
            bulletList: ed.isActive('bulletList'),
            orderedList: ed.isActive('orderedList'),
            link: ed.isActive('link'),
          }
        : null,
  });

  // Frame header title: the first h1 while it exists (editing the heading
  // retitles the document, blocks[0] on save), else the doc's own title.
  const headerTitle =
    useEditorState({
      editor,
      selector: ({ editor: ed }) => {
        if (!ed) return null;
        const first = ed.state.doc.firstChild;
        return first && first.type.name === 'heading' && first.attrs.level === 1 && first.textContent.trim()
          ? first.textContent
          : null;
      },
    }) ?? doc.title;

  const promptForLink = useCallback(() => {
    if (!editor) return;
    const current = (editor.getAttributes('link').href as string | undefined) ?? '';
    const next = window.prompt('Link URL (leave empty to remove)', current);
    if (next === null) return;
    const url = next.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  return (
    <PanelFrame
      title={headerTitle}
      className={className}
      right={
        citations && citations.length > 0 && (
          <button
            type="button"
            onClick={() => setShowCitations((v) => !v)}
            aria-label="Show citations"
            className={`flex h-6 items-center gap-1 rounded-[5px] border px-1.5 text-[11.5px] transition-colors ${
              showCitations
                ? 'border-accent bg-pill-bg text-accent'
                : 'border-border-soft bg-card-surface text-sub hover:text-accent'
            }`}
          >
            <BookMarked size={11} />
            {citations.length}
          </button>
        )
      }
    >
      {/* compact formatting toolbar — plain rich text only */}
      <div className="flex shrink-0 items-center gap-0.5 border-b border-panel-border px-3 py-1.5">
        {editor && tools && (
          <>
            <ToolButton label="Bold" active={tools.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold size={13} />
            </ToolButton>
            <ToolButton
              label="Italic"
              active={tools.italic}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic size={13} />
            </ToolButton>
            <ToolDivider />
            <ToolButton
              label="Heading 2"
              active={tools.h2}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 size={13} />
            </ToolButton>
            <ToolButton
              label="Heading 3"
              active={tools.h3}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <Heading3 size={13} />
            </ToolButton>
            <ToolDivider />
            <ToolButton
              label="Bullet list"
              active={tools.bulletList}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List size={13} />
            </ToolButton>
            <ToolButton
              label="Numbered list"
              active={tools.orderedList}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered size={13} />
            </ToolButton>
            <ToolDivider />
            <ToolButton label="Link" active={tools.link} onClick={promptForLink}>
              <Link2 size={13} />
            </ToolButton>
          </>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div ref={scrollRef} className="smooth-scroll min-h-0 flex-1 overflow-y-auto px-9 py-6">
          {editor && <EditorContent editor={editor} className="lesson-editor" />}
          <div className="h-4" />
        </div>

        {/* citations drawer (DocPanel affordance) */}
        {showCitations && citations && citations.length > 0 && (
          <div className="absolute right-3 top-2 z-10 w-[240px] rounded-[8px] border border-panel-border bg-card-surface p-2 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between px-1.5 pb-1.5">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-mute">Citations</span>
              <button
                type="button"
                aria-label="Close citations"
                onClick={() => setShowCitations(false)}
                className="text-faint transition-colors hover:text-ink-strong"
              >
                <X size={13} />
              </button>
            </div>
            <ul className="flex max-h-[280px] flex-col gap-1 overflow-y-auto">
              {citations.map((c, i) => {
                // Display-time resolution (ADR-0002): a citation whose block no
                // longer exists renders muted and non-clickable.
                const unavailable = c.unavailable === true;
                return (
                  <li key={`${c.docId}-${c.blockIndex ?? 'x'}-${i}`}>
                    <button
                      type="button"
                      disabled={unavailable || undefined}
                      onClick={() => {
                        if (c.blockIndex === undefined) return;
                        scrollFlashToIndex(c.blockIndex);
                      }}
                      className={
                        unavailable
                          ? 'w-full cursor-default rounded-[6px] px-2 py-1.5 text-left'
                          : 'w-full rounded-[6px] px-2 py-1.5 text-left transition-colors hover:bg-pill-bg'
                      }
                    >
                      <span
                        className={`block text-[12.5px] font-medium leading-[1.35] ${
                          unavailable ? 'text-faint' : 'text-ink-body'
                        }`}
                      >
                        {c.label}
                      </span>
                      {unavailable && (
                        <span className="mt-0.5 block text-[11px] leading-[1.4] text-faint">unavailable</span>
                      )}
                      {c.quote && (
                        <span className="mt-0.5 block line-clamp-2 text-[11px] leading-[1.4] text-faint">
                          “{c.quote}”
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </PanelFrame>
  );
}
