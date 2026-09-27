import { ArrowRight } from 'lucide-react';
import type { WhiteboardGroup } from '@/services/types';
import { PanelFrame } from './DocPanel';

interface WhiteboardPanelProps {
  groups: WhiteboardGroup[];
  elapsed: number;
  /** reveal time (ms) per key: `g:<id>` group frame, `c:<id>` card, `n:<id>` note */
  revealAt: Record<string, number>;
  /** when provided, cards/notes are clickable and open the lesson they cite */
  onOpenLesson?: () => void;
  className?: string;
}

const badgeClass: Record<WhiteboardGroup['color'], string> = {
  orange: 'bg-badge-orange',
  green: 'bg-badge-green',
};
const groupBorder: Record<WhiteboardGroup['color'], string> = {
  orange: 'border-[#e8c894]',
  green: 'border-[#9fdbae]',
};

/** Whiteboard with lesson groups of note cards + summary notes (whiteboard demo
 * + workspace whiteboard pane). */
export function WhiteboardPanel({ groups, elapsed, revealAt, onOpenLesson, className = '' }: WhiteboardPanelProps) {
  const shown = (key: string) => elapsed >= (revealAt[key] ?? 0);

  return (
    <PanelFrame title="Whiteboard" className={className}>
      <div className="min-h-0 flex-1 overflow-hidden bg-app-grey p-5">
        <div className="flex flex-col gap-8">
          {groups.map((group) => {
            if (!shown(`g:${group.id}`)) return <div key={group.id} className="h-[150px]" />;
            return (
              <div key={group.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <span
                    className={`card-in inline-block rounded-[4px] px-1.5 py-[3px] text-[11px] font-medium text-white ${badgeClass[group.color]}`}
                    style={{ animationDuration: '0.3s' }}
                  >
                    {group.label}
                  </span>
                  <div className={`card-in mt-1.5 rounded-[6px] border bg-card-surface/60 p-2 ${groupBorder[group.color]}`}>
                    <div className="flex gap-1.5">
                      {group.cards.map((card) =>
                        shown(`c:${card.id}`) ? (
                          <div
                            key={card.id}
                            role={onOpenLesson ? 'button' : undefined}
                            tabIndex={onOpenLesson ? 0 : undefined}
                            onClick={onOpenLesson}
                            onKeyDown={onOpenLesson ? (e) => e.key === 'Enter' && onOpenLesson() : undefined}
                            title={onOpenLesson ? 'Open the lesson this note came from' : undefined}
                            className={`card-in w-[97px] shrink-0 rounded-[5px] border border-panel-border bg-card-surface p-2 ${
                              onOpenLesson ? 'cursor-pointer transition-shadow hover:shadow-[0_0_0_2px_rgba(77,142,247,0.25)]' : ''
                            }`}
                          >
                            <div className="text-[10px] font-bold leading-[1.25] text-ink-strong">{card.title}</div>
                            <div className="mt-1 text-[9px] font-semibold leading-[1.3] text-ink-strong">
                              {card.subtitle}
                            </div>
                            <p className="mt-1 line-clamp-6 text-[7.5px] leading-[1.45] text-[#6b6b68]">{card.body}</p>
                          </div>
                        ) : (
                          <div key={card.id} className="w-[97px] shrink-0" />
                        ),
                      )}
                    </div>
                  </div>
                </div>
                {shown(`n:${group.note.id}`) ? (
                  <>
                    <ArrowRight size={17} className="card-in shrink-0 text-[#2e2e2b]" strokeWidth={2} />
                    <div
                      className={`card-in w-[84px] shrink-0 self-start rounded-[5px] border-border-soft bg-card-surface p-2 ${
                        group.note.highlight ? 'border-[#4d8ef7] shadow-[0_0_0_2px_rgba(77,142,247,0.15)]' : 'border-panel-border'
                      } ${onOpenLesson ? 'cursor-pointer transition-shadow hover:shadow-[0_0_0_2px_rgba(77,142,247,0.25)]' : ''}`}
                      role={onOpenLesson ? 'button' : undefined}
                      tabIndex={onOpenLesson ? 0 : undefined}
                      onClick={onOpenLesson}
                      onKeyDown={onOpenLesson ? (e) => e.key === 'Enter' && onOpenLesson() : undefined}
                      title={onOpenLesson ? 'Open the lesson this note came from' : undefined}
                    >
                      <div className="text-[10px] font-bold text-ink-strong">{group.note.title}</div>
                      <p className="mt-1 line-clamp-5 text-[7.5px] leading-[1.5] text-[#6b6b68]">{group.note.summary}</p>
                      <div className="mt-1.5 text-[8px] font-semibold text-ink-strong">{group.note.sectionTitle}</div>
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {group.note.bullets.slice(0, 3).map((b, i) => (
                          <li key={i} className="line-clamp-2 text-[7px] leading-[1.4] text-[#6b6b68]">
                            • {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="w-[110px] shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PanelFrame>
  );
}
