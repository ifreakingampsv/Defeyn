import { useCallback, useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import type { Citation, LessonDoc, SessionDetail, SessionPane } from '@/services/types';
import type { DocFocus } from '@/components/demo/DocPanel';
import { SyllabusPanel } from '@/components/demo/DocPanel';
import { getTutorApi } from '@/services/api';
import BoardPanel from './BoardPanel';
import LessonEditor from './LessonEditor';

const api = getTutorApi();

/** The version-checked lesson save (ticket 06): stale saves answer
 * `{ ok: false, doc }` — the server's current doc rides back and is synced
 * into the workspace so the editor reconciles instead of clobbering. */
type SaveCapableApi = ReturnType<typeof getTutorApi> & {
  saveLessonDoc?: (
    sessionId: string,
    doc: LessonDoc,
    baseVersion?: number,
  ) => Promise<{ ok: boolean; doc: LessonDoc }>;
};
const savableApi = api as SaveCapableApi;

/** Debounce window for lesson autosave (a per-object write, never a
 * whole-session save). */
const LESSON_SAVE_DEBOUNCE_MS = 600;

/** Ticket 07: naive Markdown export — the learner's work leaves the app as
 * plain text, straight from the export endpoints (pure reads). */
type ExportCapableApi = ReturnType<typeof getTutorApi> & {
  exportCourseMd?: (courseId: string) => Promise<string>;
  exportLessonMd?: (courseId: string, topicIndex: number) => Promise<string>;
  exportBoardMd?: (courseId: string) => Promise<string>;
};
const exportableApi = api as ExportCapableApi;

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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
  onOpenArtifact: (target: 'syllabus' | 'lesson' | 'whiteboard') => void;
  /** the server's authoritative doc after each save (echo, or the current
   * doc on a 409) — Workspace merges it so the editor reconciles */
  onLessonDocSynced?: (doc: LessonDoc) => void;
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
 * Syllabus reuses the demo product panel; the lesson is the live v2 editor
 * (ticket 06) and the Board is the live v2 canvas. The pane VALUE
 * 'whiteboard' is the internal key shared with the mock/server — only the
 * label changed (v2: Whiteboard tab → Board). */
export default function WorkspacePane({
  className = '',
  detail,
  pane,
  onPaneChange,
  focusBlock,
  citations,
  onLessonDocSynced,
}: WorkspacePaneProps) {
  /** pending lesson write — carries its own sessionId, so a flush after a
   * pane/tab switch or session change still lands on the right session */
  const saveTimerRef = useRef<number | null>(null);
  const pendingSaveRef = useRef<{ sessionId: string; doc: LessonDoc; baseVersion?: number } | null>(null);

  const flushLessonSave = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pending = pendingSaveRef.current;
    pendingSaveRef.current = null;
    if (!pending || typeof savableApi.saveLessonDoc !== 'function') return;
    void savableApi
      .saveLessonDoc(pending.sessionId, pending.doc, pending.baseVersion)
      .then((result) => {
        // echo (ok) or reconciliation (409): the server's doc is the truth —
        // syncing it lets the editor adopt server-stamped ids / fresh parts
        onLessonDocSynced?.(result.doc);
      })
      .catch((e) => console.error('Lesson autosave failed', e));
  }, [onLessonDocSynced]);

  /** lesson edits → debounced per-object save via the TutorApi seam */
  const onLessonDocChange = useCallback(
    (doc: LessonDoc) => {
      pendingSaveRef.current = {
        sessionId: detail.session.id,
        doc,
        baseVersion: detail.lessonDoc?.version,
      };
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(flushLessonSave, LESSON_SAVE_DEBOUNCE_MS);
    },
    [detail.session.id, detail.lessonDoc?.version, flushLessonSave],
  );

  // an in-flight lesson edit flushes when the pane goes away (the pending
  // write outlives the tab it was typed in — see pendingSaveRef above)
  useEffect(() => {
    return () => flushLessonSave();
  }, [flushLessonSave]);

  const has = {
    syllabus: !!detail.course,
    lesson: !!detail.lessonDoc,
    // the Board auto-creates with the Course, so the tab is live with it
    whiteboard: !!detail.course,
  };

  const [exportOpen, setExportOpen] = useState(false);
  const slug = (detail.course?.title ?? 'course')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'course';

  const exportMd = async (kind: 'course' | 'lesson' | 'board') => {
    setExportOpen(false);
    if (!detail.course) return;
    const courseId = detail.course.id;
    try {
      let text: string;
      let file: string;
      if (kind === 'lesson') {
        text = (await exportableApi.exportLessonMd?.(courseId, detail.currentTopic ?? 0)) ?? '';
        file = `${slug}-lesson.md`;
      } else if (kind === 'board') {
        text = (await exportableApi.exportBoardMd?.(courseId)) ?? '';
        file = `${slug}-board.md`;
      } else {
        text = (await exportableApi.exportCourseMd?.(courseId)) ?? '';
        file = `${slug}-syllabus.md`;
      }
      if (text) downloadText(file, text);
    } catch (e) {
      console.error('Export failed', e);
    }
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
        <span className="relative ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Export as Markdown"
            title="Export as Markdown"
            disabled={!detail.course}
            onClick={() => setExportOpen((v) => !v)}
            className="flex h-6 items-center gap-1 rounded-[5px] border border-border-soft bg-card-surface px-1.5 font-mono text-[11px] text-sub transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={11} />
            .md
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 top-7 z-20 w-[190px] rounded-[8px] border border-panel-border bg-card-surface p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
                {(
                  [
                    { id: 'course', label: 'Course syllabus', enabled: !!detail.course },
                    { id: 'lesson', label: 'This lesson', enabled: !!detail.lessonDoc && !!detail.course },
                    { id: 'board', label: 'Board with cards', enabled: !!detail.course },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.enabled}
                    onClick={() => void exportMd(item.id)}
                    className="w-full rounded-[6px] px-2 py-1.5 text-left text-[12.5px] text-ink-body transition-colors hover:bg-pill-bg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {detail.session.courseTitle && (
            <span className="hidden truncate font-mono text-[11px] text-ink-mute sm:inline">
              {detail.session.courseTitle.toUpperCase()}
            </span>
          )}
        </span>
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
            <LessonEditor
              doc={detail.lessonDoc}
              className="h-full"
              focusBlock={focusBlock}
              citations={citations}
              onDocChange={onLessonDocChange}
            />
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
