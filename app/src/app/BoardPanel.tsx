/**
 * The live Board (v2): a React Flow canvas where the Course's Cards are
 * dragged, edited, created and deleted — everything autosaved per-object
 * through the TutorApi seam (mock today, real backend via VITE_API_BASE_URL).
 *
 * Forked from the demo WhiteboardPanel's visual language (PanelFrame frame,
 * small bordered cards on the app-grey surface); the demo replay itself is
 * untouched. Connections render if present, but creating them is ticket 04.
 */

import '@xyflow/react/dist/style.css';
import './board.css';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import { BookMarked, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { getTutorApi } from '@/services/api';
import type { BoardCard, BoardEdge, BoardState, CardContent } from '@/services/types';
import { PanelFrame } from '@/components/demo/DocPanel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const api = getTutorApi();

/* Approximate new-Card footprint, used to center creations on a point. */
const CARD_WIDTH = 224;
const CARD_HEIGHT = 120;

/** Content edits a CardNode can commit (position autosaves on drag stop). */
type CardPatch = { title?: string; body?: string; bullets?: string[] };

type CardNodeData = {
  card: BoardCard;
  /** open the title editor focused on mount (freshly created Card) */
  autoFocus?: boolean;
};

type CardFlowNode = Node<CardNodeData, 'card'>;

interface BoardActions {
  commitCard: (cardId: string, patch: CardPatch) => void;
  requestDelete: (card: BoardCard) => void;
}

const BoardActionsContext = createContext<BoardActions | null>(null);

function useBoardActions(): BoardActions {
  const actions = useContext(BoardActionsContext);
  if (!actions) throw new Error('useBoardActions must be used inside BoardPanel');
  return actions;
}

/** The editable text of a Card: bullet lines if it is a bullet Card, else the body. */
function cardTextOf(card: BoardCard): string {
  if (card.content.bullets) return card.content.bullets.join('\n');
  return card.content.body ?? '';
}

function toNode(card: BoardCard, autoFocus = false): CardFlowNode {
  return {
    id: card.id,
    type: 'card',
    position: { x: card.x, y: card.y },
    data: { card, ...(autoFocus ? { autoFocus: true } : {}) },
  };
}

function toEdge(e: BoardEdge): Edge {
  return { id: e.id, source: e.sourceCardId, target: e.targetCardId };
}

/* ---- CardNode: one Card on the Board ---- */

function CardNode({ data, selected }: NodeProps<CardFlowNode>) {
  const { commitCard, requestDelete } = useBoardActions();
  const card = data.card;
  const isBullets = !!card.content.bullets;

  const [editing, setEditing] = useState<'title' | 'text' | null>(null);
  const [title, setTitle] = useState(card.content.title);
  const [text, setText] = useState(cardTextOf(card));

  const titleRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // fresh Card from "+ Card" / double-click: open the title editor focused
  useEffect(() => {
    if (data.autoFocus) setEditing('title');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep focus/selection in sync with the open editor
  useEffect(() => {
    if (editing === 'title') {
      titleRef.current?.focus();
      titleRef.current?.select();
    } else if (editing === 'text') {
      const el = textRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }
  }, [editing]);

  // sync drafts when the Card changes from outside (board reload) — never
  // while the user is editing
  useEffect(() => {
    if (editing !== 'title') setTitle(card.content.title);
  }, [card.content.title, editing]);
  useEffect(() => {
    if (editing !== 'text') setText(cardTextOf(card));
  }, [card, editing]);

  const cancelEdit = () => {
    if (editing === 'title') setTitle(card.content.title);
    else if (editing === 'text') setText(cardTextOf(card));
    setEditing(null);
  };

  const commitTitle = () => {
    const next = title.trim();
    setEditing(null);
    if (!next || next === card.content.title) return; // refuse empty titles
    commitCard(card.id, { title: next });
  };

  const commitText = () => {
    setEditing(null);
    if (text === cardTextOf(card)) return;
    if (isBullets) {
      // bullet Cards edit as plain lines; tolerate copied "• " markers
      const bullets = text
        .split('\n')
        .map((l) => l.replace(/^\s*[•*-]\s+/, '').trim())
        .filter((l) => l.length > 0);
      commitCard(card.id, { bullets });
    } else {
      commitCard(card.id, { body: text.trim() });
    }
  };

  return (
    <div
      className={`board-card group relative w-[224px] rounded-[8px] border bg-card-surface p-2.5 ${
        selected ? 'board-card--selected border-accent' : 'border-panel-border'
      }`}
    >
      {/* edges attach here; drag-to-connect arrives in ticket 04 */}
      <Handle type="target" position={Position.Left} className="board-handle" isConnectable={false} />
      <Handle type="source" position={Position.Right} className="board-handle" isConnectable={false} />

      {!editing && (
        <button
          type="button"
          aria-label={`Delete card ${card.content.title}`}
          onClick={() => requestDelete(card)}
          className={`nodrag absolute right-1.5 top-1.5 z-10 h-5 w-5 items-center justify-center rounded-[4px] text-faint transition-colors hover:bg-pill-bg hover:text-destructive group-hover:flex ${
            selected ? 'flex' : 'hidden'
          }`}
        >
          <Trash2 size={11} />
        </button>
      )}

      {editing === 'title' ? (
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitTitle();
            if (e.key === 'Escape') cancelEdit();
          }}
          className="nodrag w-full rounded-[4px] border border-accent/60 bg-app-input px-1.5 py-0.5 text-[12.5px] font-bold leading-[1.3] text-ink-strong outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing('title')}
          title="Click to edit the title"
          className="nodrag block w-full truncate pr-5 rounded-[4px] text-left text-[12.5px] font-bold leading-[1.3] text-ink-strong hover:bg-pill-bg"
        >
          {card.content.title}
        </button>
      )}

      {editing === 'text' ? (
        <textarea
          ref={textRef}
          value={text}
          placeholder="Write here…"
          rows={isBullets ? Math.max(3, text.split('\n').length + 1) : 4}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancelEdit();
            if (e.key === 'Enter' && e.shiftKey) {
              e.preventDefault();
              commitText();
            }
          }}
          className="nodrag nowheel mt-1.5 w-full resize-none rounded-[4px] border border-accent/60 bg-app-input px-1.5 py-1 text-[11px] leading-[1.5] text-ink-soft outline-none"
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setEditing('text')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setEditing('text');
          }}
          title="Click to edit"
          className="nodrag mt-1.5 min-h-[18px] cursor-text rounded-[4px] text-left hover:bg-pill-bg"
        >
          {isBullets ? (
            (card.content.bullets?.length ?? 0) > 0 ? (
              <ul className="flex flex-col gap-0.5">
                {card.content.bullets!.map((b, i) => (
                  <li key={i} className="line-clamp-4 text-[11px] leading-[1.5] text-ink-soft">
                    • {b}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] leading-[1.5] text-faint">Click to add bullets…</p>
            )
          ) : (
            <p
              className={`line-clamp-6 text-[11px] leading-[1.5] ${
                card.content.body ? 'text-ink-soft' : 'text-faint'
              }`}
            >
              {card.content.body || 'Click to add text…'}
            </p>
          )}
        </div>
      )}

      {card.citation && (
        <div
          title={card.citation.quote || card.citation.label}
          className="mt-2 flex items-center gap-1 self-start rounded-[4px] border border-border-soft bg-pill-bg px-1.5 py-[2px] font-mono text-[9px] text-ink-mute"
        >
          <BookMarked size={9} className="shrink-0" />
          <span className="truncate">{card.citation.label}</span>
        </div>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = { card: CardNode };

/* ---- BoardCanvas: the React Flow surface (inside the provider) ---- */

interface BoardCanvasProps {
  state: BoardState;
  className?: string;
  /** hard re-fetch, used when a mutation fails and local state may drift */
  reload: () => void;
}

function BoardCanvas({ state, className = '', reload }: BoardCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<CardFlowNode>(state.cards.map((c) => toNode(c)));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(state.edges.map(toEdge));
  const [pendingDelete, setPendingDelete] = useState<BoardCard | null>(null);

  // a reloaded Board (courseId change / panel remount / failed mutation)
  // resets the canvas — positions come from the store
  useEffect(() => {
    setNodes(state.cards.map((c) => toNode(c)));
    setEdges(state.edges.map(toEdge));
  }, [state, setNodes, setEdges]);

  /** per-object content autosave: optimistic locally, then the API write */
  const commitCard = useCallback(
    (cardId: string, patch: CardPatch) => {
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id !== cardId) return n;
          const content: CardContent = { ...n.data.card.content };
          if (patch.title !== undefined) content.title = patch.title;
          if (patch.body !== undefined) content.body = patch.body;
          if (patch.bullets !== undefined) content.bullets = patch.bullets;
          return { ...n, data: { ...n.data, card: { ...n.data.card, content, updatedAt: Date.now() } } };
        }),
      );
      void api.updateCard(cardId, patch).catch((e) => console.error('Card autosave failed', e));
    },
    [setNodes],
  );

  const actions = useMemo<BoardActions>(
    () => ({ commitCard, requestDelete: setPendingDelete }),
    [commitCard],
  );

  /** drag → per-object position autosave (no full-board write) */
  const onNodeDragStop = useCallback((_: unknown, node: CardFlowNode) => {
    void api
      .updateCard(node.id, { x: node.position.x, y: node.position.y })
      .catch((e) => console.error('Card position autosave failed', e));
  }, []);

  const createCardAt = useCallback(
    async (clientX: number, clientY: number) => {
      const point = screenToFlowPosition({ x: clientX, y: clientY });
      try {
        const card = await api.createCard(state.board.id, {
          title: 'New card',
          x: Math.round(point.x - CARD_WIDTH / 2),
          y: Math.round(point.y - CARD_HEIGHT / 2),
        });
        setNodes((ns) => [...ns, toNode(card, true)]);
      } catch (e) {
        console.error('Card creation failed', e);
        reload();
      }
    },
    [state.board.id, screenToFlowPosition, setNodes, reload],
  );

  const createCardCentered = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    void createCardAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [createCardAt]);

  // double-click on empty canvas creates a Card at that point (zoom-on-
  // double-click is disabled so the two gestures don't fight)
  const onCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target || !target.classList.contains('react-flow__pane')) return;
      void createCardAt(e.clientX, e.clientY);
    },
    [createCardAt],
  );

  /** deletion is explicit-confirmed; its Edges go with the Card */
  const confirmDelete = useCallback(() => {
    const card = pendingDelete;
    if (!card) return;
    setPendingDelete(null);
    setNodes((ns) => ns.filter((n) => n.id !== card.id));
    setEdges((es) => es.filter((e) => e.source !== card.id && e.target !== card.id));
    void api.deleteCard(card.id).catch((e) => {
      console.error('Card deletion failed', e);
      reload();
    });
  }, [pendingDelete, setNodes, setEdges, reload]);

  return (
    <>
      <PanelFrame
        title="Board"
        className={className}
        right={
          <button
            type="button"
            onClick={createCardCentered}
            className="flex h-6 items-center gap-1 rounded-[5px] border border-border-soft bg-card-surface px-1.5 text-[11.5px] text-sub transition-colors hover:border-accent hover:text-accent"
            title="Add a Card at the center of the view"
          >
            <Plus size={11} />
            Card
          </button>
        }
      >
        <div ref={wrapperRef} className="relative min-h-0 flex-1" onDoubleClick={onCanvasDoubleClick}>
          <ReactFlow<CardFlowNode>
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeDragStop={onNodeDragStop}
            defaultEdgeOptions={{ type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }}
            fitView
            fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
            minZoom={0.15}
            maxZoom={2}
            deleteKeyCode={null}
            multiSelectionKeyCode={null}
            selectionOnDrag={false}
            nodesConnectable={false}
            zoomOnDoubleClick={false}
            className="defeyn-board h-full w-full"
          >
            <Background gap={24} size={1.4} />
            <Controls showInteractive={false} />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 px-8 text-center">
              <p className="text-[14.5px] font-medium text-ink-soft">Board empty</p>
              <p className="max-w-[320px] text-[13px] leading-[1.55] text-faint">
                Generated notes and Cards you write land here. Use “+ Card” above, or double-click
                the canvas.
              </p>
            </div>
          )}
        </div>
      </PanelFrame>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.content.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This Card is permanently deleted — its connections go with it. The Board has no undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ---- BoardPanel: data loading + provider ---- */

interface BoardPanelProps {
  courseId?: string;
  className?: string;
}

/** The workspace's live Board pane: the Course's canvas of draggable,
 * editable Cards. Loads through the TutorApi seam; states for no course,
 * load error, and empty Board. */
export default function BoardPanel({ courseId, className = '' }: BoardPanelProps) {
  const [state, setState] = useState<BoardState | null>(null);
  const [loading, setLoading] = useState(!!courseId);
  const [error, setError] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    setState(null);
    setError(false);
    if (!courseId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    api
      .getBoard(courseId)
      .then((b) => {
        if (alive) setState(b);
      })
      .catch((e) => {
        console.error(e);
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [courseId, reloadNonce]);

  const reload = useCallback(() => setReloadNonce((n) => n + 1), []);

  if (loading) {
    return (
      <PanelFrame title="Board" className={className}>
        <div className="flex min-h-0 flex-1 items-center justify-center text-sub">
          <LoaderCircle size={20} className="animate-spin" />
        </div>
      </PanelFrame>
    );
  }

  if (error) {
    return (
      <PanelFrame title="Board" className={className}>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 px-8 text-center">
          <p className="text-[14.5px] font-medium text-ink-soft">The Board couldn’t be loaded</p>
          <p className="max-w-[340px] text-[13px] leading-[1.55] text-faint">
            Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={reload}
            className="mt-1 flex h-8 items-center rounded-[7px] border border-border-soft bg-card-surface px-3 text-[13px] text-ink-body transition-colors hover:bg-pill-bg"
          >
            Try again
          </button>
        </div>
      </PanelFrame>
    );
  }

  if (!courseId || !state) {
    return (
      <PanelFrame title="Board" className={className}>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
          <p className="text-[14.5px] font-medium text-ink-soft">No course yet</p>
          <p className="max-w-[340px] text-[13px] leading-[1.55] text-faint">
            The Board appears with your course — draft one in the chat.
          </p>
        </div>
      </PanelFrame>
    );
  }

  return (
    <ReactFlowProvider>
      <BoardCanvas state={state} className={className} reload={reload} />
    </ReactFlowProvider>
  );
}
