import { useState } from 'react';
import { BookOpen, BookX, Check, House, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Link } from 'react-router';
import type { SessionSummary } from '@/services/types';
import { DefeynGlyph } from '@/components/icons';

interface SessionSidebarProps {
  sessions: SessionSummary[];
  activeId?: string;
  onNew: () => void;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  /** ticket 08: cascade-delete the session's Course (naming what goes) */
  onDeleteCourse?: (courseId: string) => void;
}

type Editing = { id: string; title: string } | { id: string; confirm: true } | null;

/** Sessions rail: Home link, new session, session history with rename/delete. */
export default function SessionSidebar({ sessions, activeId, onNew, onOpen, onRename, onDelete, onDeleteCourse }: SessionSidebarProps) {
  const [editing, setEditing] = useState<Editing>(null);

  const reset = () => setEditing(null);

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-panel-border bg-app-grey px-3 pb-3 pt-2.5">
      <Link
        to="/"
        className="flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[13px] text-ink-body transition-colors hover:bg-pill-bg"
      >
        <House size={13} className="text-ink-mute" />
        Home
      </Link>

      <button
        type="button"
        onClick={onNew}
        data-testid="new-session"
        className="mt-2 flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[13px] text-accent transition-colors hover:bg-pill-bg"
      >
        <Plus size={13} />
        New session
      </button>

      <div className="mt-4 px-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-mute">Sessions</div>

      <div className="mt-1.5 flex min-h-0 flex-1 flex-col gap-px overflow-y-auto pb-2">
        {sessions.length === 0 && (
          <p className="px-2 pt-2 text-[12.5px] leading-[1.5] text-faint">
            No sessions yet. Draft your first course to get started.
          </p>
        )}
        {sessions.map((s) => {
          const isActive = s.id === activeId;
          if (editing && editing.id === s.id && 'title' in editing) {
            return (
              <form
                key={s.id}
                className="flex h-8 items-center gap-1 rounded-[6px] bg-pill-active-bg px-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  onRename(s.id, editing.title);
                  reset();
                }}
              >
                <input
                  autoFocus
                  value={editing.title}
                  onChange={(e) => setEditing({ id: s.id, title: e.target.value })}
                  onBlur={() => reset()}
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-ink-strong outline-none"
                />
                <button
                  type="submit"
                  aria-label="Save title"
                  /* keep input focus on mousedown so onBlur-reset doesn't kill the submit */
                  onMouseDown={(e) => e.preventDefault()}
                  className="text-accent"
                >
                  <Check size={13} />
                </button>
              </form>
            );
          }
          if (editing && editing.id === s.id && 'confirm' in editing) {
            return (
              <div key={s.id} className="flex h-8 items-center gap-1 rounded-[6px] bg-pill-active-bg px-2 text-[12.5px] text-ink-body">
                <span className="min-w-0 flex-1 truncate">Delete?</span>
                <button
                  type="button"
                  aria-label="Confirm delete"
                  onClick={() => {
                    onDelete(s.id);
                    reset();
                  }}
                  className="text-accent"
                >
                  <Check size={13} />
                </button>
                <button type="button" aria-label="Cancel" onClick={reset} className="text-faint">
                  <X size={13} />
                </button>
              </div>
            );
          }
          return (
            <div
              key={s.id}
              className={`group flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] px-2 transition-colors ${
                isActive ? 'bg-sel-bg text-ink-strong' : 'text-ink-body hover:bg-pill-bg'
              }`}
            >
              <button
                type="button"
                onClick={() => onOpen(s.id)}
                className="flex h-8 min-w-0 flex-1 items-center gap-1.5 text-left text-[13px]"
              >
                {s.courseTitle ? (
                  <BookOpen size={13} className="shrink-0 text-ink-mute" />
                ) : (
                  <DefeynGlyph size={11} />
                )}
                <span className="min-w-0 flex-1 truncate">{s.title}</span>
                <span className="shrink-0 font-mono text-[11px] text-faint group-hover:opacity-0">{s.updatedLabel}</span>
              </button>
              {isActive && (
                <span className="hidden shrink-0 items-center gap-1 text-faint group-hover:flex">
                  <button
                    type="button"
                    aria-label="Rename session"
                    onClick={() => setEditing({ id: s.id, title: s.title })}
                    className="transition-colors hover:text-accent"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete session"
                    onClick={() => setEditing({ id: s.id, confirm: true })}
                    className="transition-colors hover:text-accent"
                  >
                    <Trash2 size={12} />
                  </button>
                  {s.courseId && onDeleteCourse && (
                    <button
                      type="button"
                      aria-label="Delete course"
                      title="Delete this course, its Board and its Cards"
                      onClick={() => onDeleteCourse(s.courseId!)}
                      className="transition-colors hover:text-accent"
                    >
                      <BookX size={12} />
                    </button>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
