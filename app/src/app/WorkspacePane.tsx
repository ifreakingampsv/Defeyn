import type { Citation, SessionDetail, SessionPane } from '@/services/types';
import type { DocFocus } from '@/components/demo/DocPanel';
import { DocPanel, SyllabusPanel } from '@/components/demo/DocPanel';
import BoardPanel from './BoardPanel';

interface WorkspacePaneProps {
  className?: string;
  detail: SessionDetail;
  pane: SessionPane;
  onPaneChange: (pane: SessionPane) => void;
  /** scroll-to-block request for the lesson pane (citations, progress items) */
  focusBlock: DocFocus | null;
  /** citations for the open lesson, shown in the doc header */
  citations: Citation[];
  /** course-chip / page-created cards in the chat open the matching pane */
  onOpenArtifact: (target: 'syllabus' | 'lesson') => void;
}

const TABS: Array<{ id: SessionPane; label: string }> = [
  { id: 'syllabus', label: 'Syllabus' },
  { id: 'lesson', label: 'Lesson' },
  { id: 'whiteboard', label: 'Board' },
];

function PaneEmpty({ what, hint }: { what: string; hint: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
      <p className="text-[14.5px] font-medium text-ink-soft">{what}</p>
      <p className="max-w-[340px] text-[13px] leading-[1.55] text-faint">{hint}</p>
    </div>
  );
}

/** Right pane of the workspace: syllabus / lesson / Board with a tab rail.
 * Syllabus and lesson reuse the demo product panels; the Board is the live
 * v2 canvas. The pane VALUE 'whiteboard' is the internal key shared with the
 * mock/server — only the label changed (v2: Whiteboard tab → Board). */
export default function WorkspacePane({
  className = '',
  detail,
  pane,
  onPaneChange,
  focusBlock,
  citations,
  onOpenArtifact,
}: WorkspacePaneProps) {
  const has = {
    syllabus: !!detail.course,
    lesson: !!detail.lessonDoc,
    // the Board auto-creates with the Course, so the tab is live with it
    whiteboard: !!detail.course,
  };

  return (
    <section className={`flex min-h-0 flex-col gap-2 ${className}`}>
      <div className="flex shrink-0 items-center gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!has[t.id]}
            onClick={() => onPaneChange(t.id)}
            className={`rounded-[6px] px-2.5 py-1 font-mono text-[12px] transition-colors ${
              pane === t.id
                ? 'bg-chip-solid-bg text-chip-solid-ink'
                : has[t.id]
                  ? 'text-ink-body hover:bg-pill-bg'
                  : 'cursor-not-allowed text-faint opacity-50'
            }`}
          >
            {t.label}
          </button>
        ))}
        {detail.session.courseTitle && (
          <span className="ml-auto hidden truncate pl-3 font-mono text-[11px] text-ink-mute sm:inline">
            {detail.session.courseTitle.toUpperCase()}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {pane === 'syllabus' &&
          (detail.course ? (
            <SyllabusPanel course={detail.course} className="h-full" />
          ) : (
            <div className="h-full rounded-[8px] border border-panel-border bg-card-surface">
              <PaneEmpty
                what="No course yet"
                hint="Share your learning goal in the chat — one sentence — and the drafted syllabus appears here."
              />
            </div>
          ))}

        {pane === 'lesson' &&
          (detail.lessonDoc ? (
            <DocPanel doc={detail.lessonDoc} className="h-full" focusBlock={focusBlock} citations={citations} />
          ) : (
            <div className="h-full rounded-[8px] border border-panel-border bg-card-surface">
              <PaneEmpty
                what="No lesson open"
                hint='Say "Continue" in the chat and the tutor drafts the next topic here, one part at a time.'
              />
            </div>
          ))}

        {pane === 'whiteboard' &&
          (detail.course ? (
            <BoardPanel courseId={detail.course.id} className="h-full" />
          ) : (
            <div className="h-full rounded-[8px] border border-panel-border bg-card-surface">
              <PaneEmpty
                what="No course yet"
                hint="Draft one in the chat and its Board appears here."
              />
            </div>
          ))}
      </div>
    </section>
  );
}
