import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, LoaderCircle, PanelLeft } from 'lucide-react';
import { getTutorApi } from '@/services/api';
import { getCurrentUser, signOut } from '@/services/auth';
import type { Citation, MessageBlock, SessionDetail, SessionPane, SessionSummary } from '@/services/types';
import type { DocFocus } from '@/components/demo/DocPanel';
import { DefeynMark, DefeynGlyph } from '@/components/icons';
import { ThemeToggle } from '@/components/ThemeToggle';
import SessionSidebar from './SessionSidebar';
import WorkspaceChat from './WorkspaceChat';
import WorkspacePane from './WorkspacePane';

/**
 * The Defeyn workspace: sessions on the left, tutor chat in the middle,
 * the active artifact (syllabus / lesson / whiteboard) on the right.
 * All data flows through the TutorApi seam — the mock today, the real
 * backend later without UI changes (BACKEND.md).
 */

const api = getTutorApi();

/** goal prompt shown when no session is open */
function EmptyState({ onStart }: { onStart: (goal: string) => void }) {
  const [goal, setGoal] = useState('');
  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <span className="text-ink-strong">
        <DefeynGlyph size={30} />
      </span>
      <h1 className="mt-5 text-center font-heading text-[clamp(28px,3.4vw,40px)] font-medium leading-[1.1] tracking-[-0.02em] text-ink-strong">
        What do you want to learn?
      </h1>
      <p className="mt-3 max-w-[460px] text-center text-[15px] leading-[1.55] text-ink-soft">
        One honest sentence is enough. Defeyn drafts a full course around it —
        syllabus, lessons, and notes — and teaches it with you, one session at a time.
      </p>
      <form
        className="mt-7 flex w-full max-w-[560px] items-center gap-2 rounded-[10px] border border-panel-border bg-app-input p-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
        onSubmit={(e) => {
          e.preventDefault();
          if (goal.trim().length >= 12) onStart(goal.trim());
        }}
      >
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="I want to learn how to…"
          className="h-10 min-w-0 flex-1 bg-transparent px-3 text-[15px] text-ink-body outline-none placeholder:text-faint"
        />
        <button
          type="submit"
          disabled={goal.trim().length < 12}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-[7px] bg-cta-bg px-4 text-[14px] font-medium text-cta-ink transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          Draft my course
        </button>
      </form>
      <p className="mt-3 font-mono text-[11.5px] text-ink-mute">
        MOCK TUTOR — REPLIES ARE RULE-BASED UNTIL THE AI SERVICE LANDS (BACKEND.MD)
      </p>
    </div>
  );
}

export default function Workspace() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(!!sessionId);
  const [sending, setSending] = useState(false);
  const [streamBlocks, setStreamBlocks] = useState<MessageBlock[] | null>(null);
  const [paneOverride, setPaneOverride] = useState<SessionPane | null>(null);
  const [docFocus, setDocFocus] = useState<DocFocus | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const focusNonce = useRef(0);
  /** sessions whose seedGoal auto-send already fired (StrictMode-safe) */
  const seededRef = useRef<Set<string>>(new Set());

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await api.listSessions());
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  const applyDetail = useCallback((d: SessionDetail) => {
    setDetail(d);
    setPaneOverride(null);
  }, []);

  // load (or clear) the active session whenever the route changes
  useEffect(() => {
    setPaneOverride(null);
    setDocFocus(null);
    if (!sessionId) {
      setDetail(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    api
      .getSession(sessionId)
      .then((d) => {
        if (!alive) return;
        setDetail(d);
        // a course page seeded this session with its goal: send it once
        if (d.seedGoal && !seededRef.current.has(d.session.id)) {
          seededRef.current.add(d.session.id);
          void send(d.seedGoal, d.session.id);
        }
      })
      .catch((e) => {
        console.error(e);
        if (alive) setDetail(null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const openPane = useCallback((pane: SessionPane) => setPaneOverride(pane), []);

  const focusLessonBlock = useCallback((index: number) => {
    setPaneOverride('lesson');
    focusNonce.current += 1;
    setDocFocus({ index, nonce: focusNonce.current });
  }, []);

  /** citation chip / doc-header citation → open lesson at the cited block */
  const openCitation = useCallback(
    (c: Citation) => {
      focusLessonBlock(c.blockIndex);
    },
    [focusLessonBlock],
  );

  /** progress checklist item → the "Part N: <item>" heading in the lesson */
  const openProgressItem = useCallback(
    (item: string) => {
      const doc = detail?.lessonDoc;
      if (!doc) return;
      const idx = doc.blocks.findIndex((b) => b.kind === 'h2' && b.text.includes(item));
      focusLessonBlock(idx >= 0 ? idx : 0);
    },
    [detail, focusLessonBlock],
  );

  const send = useCallback(
    async (text: string, forId?: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setSending(true);
      setStreamBlocks(null);
      try {
        let id = forId ?? sessionId;
        if (!id) {
          const created = await api.createSession();
          id = created.sessionId;
          navigate(`/app/s/${id}`, { replace: true });
        }
        await api.sendMessageStream(id, trimmed, (ev) => {
          if (ev.type === 'block') setStreamBlocks((prev) => [...(prev ?? []), ev.block]);
        });
        const fresh = await api.getSession(id);
        applyDetail(fresh);
        void refreshSessions();
      } catch (e) {
        console.error(e);
      } finally {
        setSending(false);
        setStreamBlocks(null);
      }
    },
    [sessionId, sending, navigate, refreshSessions, applyDetail],
  );

  const regenerate = useCallback(async () => {
    if (!sessionId || sending) return;
    setSending(true);
    setStreamBlocks(null);
    try {
      await api.regenerateLast(sessionId);
      const fresh = await api.getSession(sessionId);
      applyDetail(fresh);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
      setStreamBlocks(null);
    }
  }, [sessionId, sending, applyDetail]);

  const renameSession = useCallback(
    async (id: string, title: string) => {
      await api.renameSession(id, title);
      void refreshSessions();
      if (id === sessionId) {
        try {
          applyDetail(await api.getSession(id));
        } catch (e) {
          console.error(e);
        }
      }
    },
    [sessionId, refreshSessions, applyDetail],
  );

  const deleteSession = useCallback(
    async (id: string) => {
      await api.deleteSession(id);
      void refreshSessions();
      if (id === sessionId) navigate('/app');
    },
    [sessionId, navigate, refreshSessions],
  );

  const newSession = async () => {
    const { sessionId: id } = await api.createSession();
    await refreshSessions();
    setSidebarOpen(false);
    navigate(`/app/s/${id}`);
  };

  const effectivePane: SessionPane = paneOverride ?? detail?.pane ?? 'syllabus';

  /** citations of the open lesson, taken from the most recent message that has them */
  const citations: Citation[] = useMemo(() => {
    const docId = detail?.lessonDoc?.id;
    if (!docId || !detail) return [];
    for (let i = detail.messages.length - 1; i >= 0; i--) {
      const block = detail.messages[i].blocks.find((b) => b.kind === 'citations');
      if (block && block.kind === 'citations') {
        const items = block.items.filter((c) => c.docId === docId);
        if (items.length) return items;
      }
    }
    return [];
  }, [detail]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* slim product header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-panel-border bg-nav-bg px-3">
        <button
          type="button"
          aria-label="Toggle sessions"
          onClick={() => setSidebarOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-[6px] text-ink-soft transition-colors hover:bg-pill-bg hover:text-ink-strong md:hidden"
        >
          <PanelLeft size={16} />
        </button>
        <Link to="/" className="flex items-center gap-1.5 text-ink-strong">
          <DefeynMark size={20} />
          <span className="font-heading text-[15px] font-bold tracking-[-0.01em]">Defeyn</span>
        </Link>
        <span className="ml-1 hidden font-mono text-[11px] text-ink-mute sm:inline">/ WORKSPACE</span>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <button
              type="button"
              onClick={() => {
                signOut();
                navigate('/');
              }}
              className="flex h-8 items-center gap-2 rounded-[6px] px-2 text-[13px] text-ink-body transition-colors hover:bg-pill-bg"
              title="Sign out"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-avatar-user-bg text-[11px] font-semibold text-avatar-user-ink">
                {user.initials}
              </span>
              <span className="hidden sm:inline">{user.name}</span>
            </button>
          )}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* sidebar: persistent ≥md, overlay on small screens */}
        <div className="hidden md:flex">
          <SessionSidebar
            sessions={sessions}
            activeId={sessionId}
            onNew={newSession}
            onOpen={(id) => {
              setSidebarOpen(false);
              navigate(`/app/s/${id}`);
            }}
            onRename={renameSession}
            onDelete={deleteSession}
          />
        </div>
        {sidebarOpen && (
          <div className="absolute inset-0 z-40 flex md:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="h-full shadow-[6px_0_24px_rgba(0,0,0,0.18)]" onClick={(e) => e.stopPropagation()}>
              <SessionSidebar
                sessions={sessions}
                activeId={sessionId}
                onNew={newSession}
                onOpen={(id) => {
                  setSidebarOpen(false);
                  navigate(`/app/s/${id}`);
                }}
                onRename={renameSession}
                onDelete={deleteSession}
              />
            </div>
            <div className="min-w-0 flex-1 bg-black/20" />
          </div>
        )}

        {/* main area */}
        <main className="flex min-w-0 flex-1 flex-col bg-page/60">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sub">
              <LoaderCircle size={22} className="animate-spin" />
            </div>
          ) : detail ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 lg:flex-row lg:gap-3 lg:p-3">
              <WorkspaceChat
                className="min-h-[320px] lg:w-[400px] lg:shrink-0 xl:w-[440px]"
                title={detail.session.title}
                messages={detail.messages}
                streamBlocks={streamBlocks}
                sending={sending}
                onSend={send}
                onCitation={openCitation}
                onProgressItem={openProgressItem}
                onOpenArtifact={openPane}
                onRegenerate={regenerate}
              />
              <WorkspacePane
                className="min-h-[360px] min-w-0 flex-1"
                detail={detail}
                pane={effectivePane}
                onPaneChange={openPane}
                focusBlock={docFocus}
                citations={citations}
                onOpenArtifact={openPane}
              />
            </div>
          ) : sessionId ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-[15px] text-ink-soft">This session doesn't exist (or was cleared).</p>
              <button
                type="button"
                onClick={() => navigate('/app')}
                className="flex h-9 items-center gap-1.5 rounded-[7px] border border-border-soft bg-card-surface px-3.5 text-[13.5px] text-ink-body transition-colors hover:bg-pill-bg"
              >
                <ArrowLeft size={14} /> Back to workspace
              </button>
            </div>
          ) : (
            <EmptyState onStart={(goal) => void send(goal)} />
          )}
        </main>
      </div>
    </div>
  );
}
