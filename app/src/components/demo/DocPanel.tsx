import { useEffect, useRef, useState } from 'react';
import { BookMarked, Lock, X } from 'lucide-react';
import type { Citation, Course, LessonDoc } from '@/services/types';

interface PanelFrameProps {
  title: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Shared white panel with centered 13px header bar. */
export function PanelFrame({ title, right, className = '', children }: PanelFrameProps) {
  return (
    <div className={`flex min-h-0 flex-col overflow-hidden rounded-[8px] border border-panel-border bg-card-surface ${className}`}>
      <div className="relative flex h-10 shrink-0 items-center justify-center border-b border-panel-border text-[13px] text-sub">
        <span>{title}</span>
        {right && <div className="absolute right-3 flex items-center gap-2">{right}</div>}
      </div>
      {children}
    </div>
  );
}

/** Highlight flash for a block the user jumped to via a citation/link. */
const FOCUS_MS = 1800;

export interface DocFocus {
  index: number;
  /** bump to re-trigger focus on the same index */
  nonce: number;
}

interface DocPanelProps {
  doc: LessonDoc;
  /** target scroll fraction (0..1); scrolls smoothly on change (demo autoplay) */
  scrollFraction?: number;
  /** scroll to a specific block and flash it (citation/link navigation) */
  focusBlock?: DocFocus | null;
  /** citations listed in the doc header; clicking one scrolls to its block */
  citations?: Citation[];
  showLock?: boolean;
  className?: string;
}

/** Scrollable lesson document (hero + curriculum demos + workspace lesson pane). */
export function DocPanel({ doc, scrollFraction, focusBlock, citations, showLock, className = '' }: DocPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [showCitations, setShowCitations] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el && scrollFraction != null) {
      el.scrollTo({ top: (el.scrollHeight - el.clientHeight) * scrollFraction, behavior: 'smooth' });
    }
  }, [scrollFraction]);

  useEffect(() => {
    if (!focusBlock || !ref.current) return;
    const target = ref.current.querySelector<HTMLElement>(`[data-block-index="${focusBlock.index}"]`);
    if (!target) return;
    const raf = requestAnimationFrame(() => {
      setShowCitations(false);
      elScrollToBlock(ref.current!, target);
      setFocused(focusBlock.index);
      window.setTimeout(() => setFocused(null), FOCUS_MS);
    });
    return () => cancelAnimationFrame(raf);
  }, [focusBlock]);

  return (
    <PanelFrame
      title={doc.title}
      className={className}
      right={
        <>
          {citations && citations.length > 0 && (
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
          )}
          {showLock && <Lock size={13} className="text-faint" />}
        </>
      }
    >
      <div className="relative flex min-h-0 flex-1">
        <div ref={ref} className="smooth-scroll min-h-0 flex-1 overflow-y-auto px-9 py-6">
          <h1 data-block-index={0} className="font-heading text-[26px] font-bold leading-[1.25] tracking-[-0.01em] text-ink-strong">
            {doc.blocks[0]?.kind === 'h1' ? doc.blocks[0].text : doc.title}
          </h1>
          {doc.blocks.map((b, i) => {
            if (i === 0 && b.kind === 'h1') return null;
            const anchor = { 'data-block-index': i };
            if (b.kind === 'h2')
              return (
                <h2
                  key={i}
                  {...anchor}
                  className={`mt-6 rounded-[4px] font-heading text-[19px] font-bold leading-[1.3] text-ink-strong transition-colors ${
                    focused === i ? 'bg-pill-bg ring-1 ring-accent/60' : ''
                  }`}
                >
                  {b.text}
                </h2>
              );
            if (b.kind === 'h3')
              return (
                <h3
                  key={i}
                  {...anchor}
                  className={`mt-5 rounded-[4px] text-[16px] font-semibold text-ink-strong transition-colors ${
                    focused === i ? 'bg-pill-bg ring-1 ring-accent/60' : ''
                  }`}
                >
                  {b.text}
                </h3>
              );
            if (b.kind === 'h1') return null;
            return (
              <p
                key={i}
                {...anchor}
                className={`mt-3.5 rounded-[4px] text-[14.5px] leading-[1.65] text-ink-body transition-colors ${
                  focused === i ? 'bg-pill-bg px-1.5 -mx-1.5 ring-1 ring-accent/60' : ''
                }`}
              >
                {b.runs.map((r, j) => (
                  <span key={j} className={r.bold ? 'font-semibold' : r.italic ? 'italic' : ''}>
                    {r.text}
                  </span>
                ))}
              </p>
            );
          })}
          <div className="h-6" />
        </div>

        {/* citations drawer */}
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
                // longer exists renders muted and non-clickable. Demo fixtures
                // never set `unavailable`, so their rendering is unchanged.
                const unavailable = c.unavailable === true;
                return (
                  <li key={`${c.docId}-${c.blockIndex}-${i}`}>
                    <button
                      type="button"
                      disabled={unavailable || undefined}
                      onClick={() => {
                        setShowCitations(false);
                        if (c.blockIndex === undefined) return;
                        const target = ref.current?.querySelector<HTMLElement>(`[data-block-index="${c.blockIndex}"]`);
                        if (target && ref.current) {
                          elScrollToBlock(ref.current, target);
                          setFocused(c.blockIndex);
                          window.setTimeout(() => setFocused(null), FOCUS_MS);
                        }
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
                        <span className="mt-0.5 block line-clamp-2 text-[11px] leading-[1.4] text-faint">“{c.quote}”</span>
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

function elScrollToBlock(container: HTMLElement, target: HTMLElement) {
  const top = target.offsetTop - container.offsetTop;
  container.scrollTo({ top: Math.max(0, top - 16), behavior: 'smooth' });
}

interface SyllabusPanelProps {
  course: Course;
  scrollFraction?: number;
  className?: string;
}

/** Course syllabus document (goal demo). */
export function SyllabusPanel({ course, scrollFraction, className = '' }: SyllabusPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && scrollFraction != null) {
      el.scrollTo({ top: (el.scrollHeight - el.clientHeight) * scrollFraction, behavior: 'smooth' });
    }
  }, [scrollFraction]);

  return (
    <PanelFrame title="Course syllabus" className={className}>
      <div ref={ref} className="smooth-scroll min-h-0 flex-1 overflow-y-auto px-7 py-6">
        {course.topics.map((topic) => (
          <div key={topic.id} className="[&:not(:first-child)]:mt-10">
            <h1 className="font-heading text-[17px] font-bold leading-[1.35] text-ink-strong">{topic.title}</h1>
            {topic.description && (
              <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-soft">{topic.description}</p>
            )}
            <ul className="mt-4 flex flex-col gap-3.5">
              {topic.sections.map((s) => (
                <li key={s.number} className="flex gap-2.5">
                  <span className="mt-[2px] h-[15px] w-[15px] shrink-0 rounded-full border border-border-soft" />
                  <span className="w-9 shrink-0 pt-px text-[13px] text-sub">{s.number}</span>
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold leading-[1.4] text-ink-strong">{s.title}</div>
                    {s.description && <div className="mt-0.5 text-[13px] leading-[1.5] text-sub">{s.description}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="h-6" />
      </div>
    </PanelFrame>
  );
}
