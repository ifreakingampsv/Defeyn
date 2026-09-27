import { useEffect, useRef } from 'react';
import { ArrowUp, BookMarked, BookOpen, Check, LoaderCircle, Plus } from 'lucide-react';
import type { ChatMessage, Citation, MessageBlock } from '@/services/types';
import { DefeynGlyph } from '../icons';

/** Shared "artifact created" card (course chip / lesson page card). Clickable
 * in the workspace (opens the matching pane); static in the marketing demos. */
function ArtifactCard({
  icon,
  title,
  caption,
  onOpen,
}: {
  icon?: React.ReactNode;
  title: string;
  caption: string;
  onOpen?: () => void;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <div className="text-[13px] font-medium text-ink-body">{title}</div>
          <div className="mt-0.5 text-[12px] text-sub">{caption}</div>
        </div>
      </div>
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border-soft text-sub">
        <Plus size={12} />
      </span>
    </>
  );
  const cls =
    'flex items-center justify-between rounded-[8px] border border-panel-border bg-card-surface px-3 py-2.5 transition-colors';
  if (!onOpen) return <div className={cls}>{body}</div>;
  return (
    <button type="button" onClick={onOpen} className={`${cls} text-left hover:border-accent`}>
      {body}
    </button>
  );
}

function BlockView({
  block,
  onChoice,
  onCitation,
  onProgressItem,
  onOpenArtifact,
}: {
  block: MessageBlock;
  onChoice?: (option: string) => void;
  onCitation?: (citation: Citation) => void;
  onProgressItem?: (item: string) => void;
  onOpenArtifact?: (target: 'syllabus' | 'lesson') => void;
}) {
  switch (block.kind) {
    case 'text':
      return <p className="text-[15px] leading-[1.55] text-ink-body">{block.text}</p>;
    case 'outline':
      return (
        <ul className="flex flex-col gap-1.5">
          {block.items.map((it) => (
            <li key={it.head} className="text-[15px] leading-[1.55] text-ink-body">
              • <span className="font-semibold">{it.head}</span>
              {it.rest}
            </li>
          ))}
        </ul>
      );
    case 'thought':
      return (
        <div className="flex items-center gap-1.5 text-[13px] text-sub">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-avatar-bg">
            <Check size={10} strokeWidth={2.5} className="text-sub" />
          </span>
          <span>Thought completed</span>
          {block.summary ? (
            <>
              <span className="text-faint">·</span>
              <span>{block.summary}</span>
            </>
          ) : null}
        </div>
      );
    case 'step':
      return (
        <div className="flex items-center gap-1.5 text-[13px] text-sub">
          <LoaderCircle size={13} className="animate-[spin_1.6s_linear_infinite]" />
          <span>{block.label}</span>
        </div>
      );
    case 'page-created':
      return (
        <ArtifactCard title={block.title} caption={block.caption} onOpen={() => onOpenArtifact?.('lesson')} />
      );
    case 'course-chip':
      return (
        <ArtifactCard
          icon={<BookOpen size={15} className="text-[#6b6b68]" />}
          title={block.title}
          caption={block.caption}
          onOpen={() => onOpenArtifact?.('syllabus')}
        />
      );
    case 'lesson-progress':
      return (
        <div className="rounded-[8px] border border-panel-border bg-card-surface px-3 py-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-medium text-ink-body">Lesson progress</span>
            <span className="text-[12px] text-sub">
              {block.completed}/{block.total} completed
            </span>
          </div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {block.items.map((item, i) => {
              const done = i < block.completed;
              const inner = (
                <>
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      done ? 'border-chip-solid-bg bg-chip-solid-bg' : 'border-border-soft bg-card-surface'
                    }`}
                  >
                    {done && <Check size={10} strokeWidth={3} className="text-white" />}
                  </span>
                  <span className={done ? 'text-sub line-through' : 'text-ink-body'}>{item}</span>
                </>
              );
              if (!onProgressItem) {
                return (
                  <li key={item} className="flex items-center gap-2 text-[13px]">
                    {inner}
                  </li>
                );
              }
              return (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => onProgressItem(item)}
                    className="flex w-full items-center gap-2 rounded-[5px] px-1 py-0.5 text-left text-[13px] transition-colors hover:bg-pill-bg"
                  >
                    {inner}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      );
    case 'citations':
      return (
        <div className="flex flex-wrap gap-1.5">
          {block.items.map((c, i) => (
            <button
              key={`${c.docId}-${c.blockIndex}-${i}`}
              type="button"
              onClick={onCitation ? () => onCitation(c) : undefined}
              title={c.quote ? `“${c.quote}”` : c.label}
              className="flex items-center gap-1.5 rounded-[7px] border border-border-soft bg-card-surface px-2.5 py-1 text-[12.5px] text-ink-body transition-colors hover:border-accent hover:text-accent"
            >
              <BookMarked size={11} className="text-accent" />
              {c.label}
            </button>
          ))}
        </div>
      );
    case 'choices':
      return (
        <div className="flex flex-wrap gap-1.5">
          {block.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={onChoice ? () => onChoice(opt) : undefined}
              className={`rounded-[7px] px-2.5 py-1 text-[13px] transition-colors ${
                opt === block.selected
                  ? 'bg-chip-solid-bg text-chip-solid-ink'
                  : 'border border-border-soft bg-card-surface text-ink-body hover:bg-pill-bg'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      );
  }
}

function MessageRow({
  msg,
  userName = 'Maya',
  userInitials = 'M',
  onChoice,
  onCitation,
  onProgressItem,
  onOpenArtifact,
  trailing,
}: {
  msg: ChatMessage;
  userName?: string;
  userInitials?: string;
  onChoice?: (option: string) => void;
  onCitation?: (citation: Citation) => void;
  onProgressItem?: (item: string) => void;
  onOpenArtifact?: (target: 'syllabus' | 'lesson') => void;
  /** optional affordance rendered beside the author name (e.g. regenerate) */
  trailing?: React.ReactNode;
}) {
  const isUser = msg.author === 'user';
  return (
    <div className="msg-in flex gap-2.5">
      {isUser ? (
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-avatar-user-bg text-[10px] font-semibold text-avatar-user-ink">
          {userInitials}
        </span>
      ) : (
        <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center text-ink-strong">
          <DefeynGlyph size={13} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[13px] font-semibold text-ink-strong">
            {isUser ? userName : 'Defeyn AI Tutor'}
          </span>
          {msg.timestamp && <span className="text-[12px] text-sub">{msg.timestamp}</span>}
          {!isUser && trailing}
        </div>
        <div className="mt-1 flex flex-col gap-2.5">
          {msg.blocks.map((b, i) => (
            <BlockView
              key={i}
              block={b}
              onChoice={onChoice}
              onCitation={onCitation}
              onProgressItem={onProgressItem}
              onOpenArtifact={onOpenArtifact}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export { BlockView, MessageRow };

export interface ChatPanelProps {
  title: string;
  messages: ChatMessage[];
  /** number of messages revealed so far */
  visibleCount: number;
  /** ms offset before a message's blocks appear (used for intra-message reveals) */
  blockRevealAt?: (msgIndex: number, blockIdx: number) => number | undefined;
  elapsed?: number;
  typedText?: string;
  inputPlaceholder?: string;
  sendActive?: boolean;
  className?: string;
}

export function ChatPanel({
  title,
  messages,
  visibleCount,
  typedText = '',
  inputPlaceholder = 'Message Defeyn...',
  sendActive,
  className = '',
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [visibleCount]);

  const hasTyped = typedText.length > 0;
  const active = sendActive ?? hasTyped;

  return (
    <div className={`flex min-h-0 flex-col rounded-[8px] border border-panel-border bg-card-surface ${className}`}>
      <div className="flex h-10 shrink-0 items-center justify-center border-b border-panel-border text-[13px] text-sub">
        {title}
      </div>
      <div ref={scrollRef} className="smooth-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-5">
          {messages.slice(0, visibleCount).map((m) => (
            <MessageRow key={m.id} msg={m} />
          ))}
        </div>
      </div>
      <div className="shrink-0 p-3">
        <div className="rounded-[12px] bg-app-input px-3 pb-2.5 pt-3">
          <div className="min-h-[22px] text-[15px] leading-[1.45]">
            {hasTyped ? (
              <span className="text-ink-body">
                {typedText}
                <span className="ml-px inline-block h-[15px] w-[1.5px] translate-y-[2px] animate-pulse bg-ink-soft" />
              </span>
            ) : (
              <span className="text-[#b3b3b0]">{inputPlaceholder}</span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              aria-label="Add attachment"
              className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] border border-border-soft text-sub"
            >
              <Plus size={13} />
            </button>
            <span className="flex h-[22px] items-center rounded-[5px] border border-border-soft bg-card-surface px-2 text-[12px] text-ink-body">
              AI Tutor
            </span>
            <button
              type="button"
              aria-label="Send message"
              className={`ml-auto flex h-8 w-8 items-center justify-center rounded-full ${
                active ? 'bg-chip-solid-bg text-chip-solid-ink' : 'border border-border-soft bg-card-surface text-sub'
              }`}
            >
              <ArrowUp size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
