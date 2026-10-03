import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, LoaderCircle, Plus, RotateCcw } from 'lucide-react';
import type { ChatMessage, Citation, MessageBlock } from '@/services/types';
import { getCurrentUser } from '@/services/auth';
import { DefeynGlyph } from '@/components/icons';
import { MessageRow } from '@/components/demo/ChatPanel';

interface WorkspaceChatProps {
  className?: string;
  title: string;
  messages: ChatMessage[];
  /** blocks of the tutor reply currently streaming in (not yet persisted) */
  streamBlocks: MessageBlock[] | null;
  sending: boolean;
  onSend: (text: string) => void;
  /** display-time citation resolution against the open lesson doc (ADR-0002),
   * owned by Workspace: annotates chips whose block is gone as `unavailable`
   * and pins resolved block indexes for DocPanel's drawer. */
  annotateCitation: (citation: Citation) => Citation;
  onCitation: (citation: Citation) => void;
  onProgressItem: (item: string) => void;
  onOpenArtifact: (target: 'syllabus' | 'lesson' | 'whiteboard') => void;
  onRegenerate: () => void;
}

/**
 * The live tutor chat: real input, streaming replies, clickable citations and
 * choice chips. Renders the same message/block shapes the marketing demos use
 * (ChatPanel's MessageRow), plus a thinking indicator and a regenerate
 * affordance on the last tutor reply.
 */
export default function WorkspaceChat({
  className = '',
  title,
  messages,
  streamBlocks,
  sending,
  onSend,
  annotateCitation,
  onCitation,
  onProgressItem,
  onOpenArtifact,
  onRegenerate,
}: WorkspaceChatProps) {
  const [draft, setDraft] = useState('');
  const user = getCurrentUser();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
  }, [messages.length, streamBlocks?.length, sending]);

  const submit = () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    onSend(text);
  };

  const lastTutorId = [...messages].reverse().find((m) => m.author === 'tutor')?.id;

  // Display-time citation resolution (ADR-0002): messages and the in-flight
  // stream are mapped through Workspace's annotateCitation so a chip whose
  // block is gone renders unavailable and resolvable ones carry a concrete
  // block index for the lesson pane.
  const resolvedMessages = useMemo(
    () =>
      messages.map((m) =>
        m.blocks.some((b) => b.kind === 'citations')
          ? {
              ...m,
              blocks: m.blocks.map((b) =>
                b.kind === 'citations' ? { ...b, items: b.items.map(annotateCitation) } : b,
              ),
            }
          : m,
      ),
    [messages, annotateCitation],
  );

  const resolvedStreamBlocks = useMemo(
    () =>
      streamBlocks
        ? streamBlocks.map((b) =>
            b.kind === 'citations' ? { ...b, items: b.items.map(annotateCitation) } : b,
          )
        : null,
    [streamBlocks, annotateCitation],
  );

  return (
    <section className={`flex min-h-0 flex-col rounded-[8px] border border-panel-border bg-card-surface ${className}`}>
      <div className="flex h-10 shrink-0 items-center justify-center border-b border-panel-border px-3">
        <span className="truncate text-[13px] text-sub" title={title}>
          {title}
        </span>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-5">
          {resolvedMessages.map((m) => (
            <MessageRow
              key={m.id}
              msg={m}
              userName={user?.name ?? 'You'}
              userInitials={user?.initials ?? 'Y'}
              onChoice={sending ? undefined : onSend}
              onCitation={onCitation}
              onProgressItem={onProgressItem}
              onOpenArtifact={onOpenArtifact}
              trailing={
                m.id === lastTutorId && !sending ? (
                  <button
                    type="button"
                    aria-label="Regenerate reply"
                    title="Regenerate"
                    onClick={onRegenerate}
                    className="ml-1 text-faint transition-colors hover:text-accent"
                  >
                    <RotateCcw size={12} />
                  </button>
                ) : undefined
              }
            />
          ))}
          {resolvedStreamBlocks && resolvedStreamBlocks.length > 0 && (
            <MessageRow
              msg={{ id: '__streaming', author: 'tutor', blocks: resolvedStreamBlocks }}
              userName={user?.name ?? 'You'}
              userInitials={user?.initials ?? 'Y'}
              onCitation={onCitation}
              onProgressItem={onProgressItem}
              onOpenArtifact={onOpenArtifact}
            />
          )}
          {sending && (!streamBlocks || streamBlocks.length === 0) && (
            <div className="msg-in flex gap-2.5">
              <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center text-ink-strong">
                <DefeynGlyph size={13} />
              </span>
              <div className="flex items-center gap-2 pt-0.5 text-[13px] text-sub">
                <LoaderCircle size={13} className="animate-[spin_1.6s_linear_infinite]" />
                <span>Defeyn is thinking…</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 p-3">
        <div className="rounded-[12px] bg-app-input px-3 pb-2.5 pt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Message Defeyn…"
            className="max-h-[120px] min-h-[22px] w-full resize-none bg-transparent text-[15px] leading-[1.45] text-ink-body outline-none placeholder:text-faint"
          />
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
              onClick={submit}
              disabled={!draft.trim() || sending}
              className={`ml-auto flex h-8 w-8 items-center justify-center rounded-full transition-opacity ${
                draft.trim() && !sending
                  ? 'bg-chip-solid-bg text-chip-solid-ink'
                  : 'border border-border-soft bg-card-surface text-sub opacity-70'
              }`}
            >
              <ArrowUp size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
