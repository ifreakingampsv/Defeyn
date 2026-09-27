import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  House,
  PanelLeftClose,
  Plus,
} from 'lucide-react';
import type { DemoScript } from '@/services/types';
import { heroSidebarFixture } from '@/services/mock/demoData';
import { useLoopClock } from '@/hooks/useLoopClock';
import { DefeynGlyph } from '../icons';
import { ChatPanel } from './ChatPanel';
import { DocPanel } from './DocPanel';

const CADENCE = 1600;
const T0 = 800;
const LOOP = 32500;

/** Scroll beats: [time ms, document scroll fraction] */
const DOC_BEATS: Array<[number, number]> = [
  [6300, 0.1],
  [7900, 0.22],
  [9500, 0.35],
  [11100, 0.5],
  [12700, 0.62],
  [14300, 0.75],
  [15900, 0.88],
  [17500, 1],
];

interface HeroDemoProps {
  script: DemoScript;
  active: boolean;
  nonce: number;
}

function docFractionAt(elapsed: number): number {
  let target = 0;
  for (const [at, frac] of DOC_BEATS) {
    if (elapsed >= at) target = frac;
  }
  return target;
}

/** Hero product demo: sidebar + chat + lesson document, scripted conversation (D1). */
export default function HeroDemo({ script, active, nonce }: HeroDemoProps) {
  const elapsed = useLoopClock(LOOP, active, nonce);
  const visibleCount = script.messages.filter((_, i) => elapsed >= T0 + CADENCE * i).length;

  return (
    <div className="relative flex h-full items-center justify-center py-[60px]">
      <div className="relative flex h-[656px] w-[1050px] overflow-hidden rounded-[6px] border-[1.5px] border-ink-strong bg-card-surface shadow-[6px_6px_0_rgba(38,38,36,0.16)]">
        {/* Sidebar */}
        <div className="flex w-[220px] shrink-0 flex-col bg-app-grey px-3 pb-3 pt-2.5">
          <div className="flex h-7 items-center gap-0.5 px-1">
            <span className="flex items-center gap-1">
              <span className="h-[9px] w-[9px] rounded-full bg-chrome-dot" />
              <span className="h-[9px] w-[9px] rounded-full bg-chrome-dot" />
              <span className="h-[9px] w-[9px] rounded-full bg-chrome-dot" />
            </span>
            <span className="ml-3 flex items-center gap-0.5 text-faint">
              <ChevronLeft size={14} />
              <ChevronRight size={14} />
            </span>
            <span className="ml-auto flex h-[18px] w-[18px] items-center justify-center rounded-[4px] bg-avatar-bg text-[10px] font-semibold text-avatar-ink">
              D
            </span>
            <span className="ml-1 text-faint">
              <PanelLeftClose size={14} />
            </span>
          </div>

          <div className="mt-3 flex rounded-[7px] bg-pill-bg p-[2px]">
            <button type="button" className="flex h-6 flex-1 items-center justify-center gap-1.5 rounded-[5px] text-[12.5px] text-sub">
              <House size={12} />
              Home
            </button>
            <button
              type="button"
              className="flex h-6 flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-pill-active-bg text-[12.5px] font-medium text-ink-strong shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
            >
              <DefeynGlyph size={11} />
              AI Tutor
            </button>
          </div>

          <button
            type="button"
            className="mt-2.5 flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[13px] text-accent transition-colors hover:bg-pill-bg"
          >
            <Plus size={13} />
            New session
          </button>

          <div className="mt-3 px-2 text-[12px] text-sub">{heroSidebarFixture.workspace}</div>

          <div className="mt-1.5 flex flex-col gap-px">
            <button type="button" className="flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[13px] text-ink-body">
              <ChevronDown size={12} className="shrink-0 text-faint" />
              <BookOpen size={13} className="shrink-0 text-[#8e8e8b]" />
              <span className="truncate">History of Western P…</span>
              <span className="ml-auto text-[11px] text-faint">3</span>
            </button>
            {heroSidebarFixture.sessions.map((s) => (
              <button
                key={s.title}
                type="button"
                className={`flex h-8 items-center gap-1.5 rounded-[6px] pl-7 pr-2 text-left text-[13px] ${
                  s.active ? 'bg-sel-bg text-ink-strong' : 'text-ink-body'
                }`}
              >
                <BookOpen size={13} className="shrink-0 text-[#8e8e8b]" />
                <span className="truncate">{s.title}</span>
                <span className="ml-auto text-[11px] text-faint">{s.badge}</span>
              </button>
            ))}
            {heroSidebarFixture.collapsed.map((s) => (
              <button
                key={s.title}
                type="button"
                className="flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-left text-[13px] text-ink-body"
              >
                <ChevronRight size={12} className="shrink-0 text-faint" />
                <BookOpen size={13} className="shrink-0 text-[#8e8e8b]" />
                <span className="truncate">{s.title}</span>
                <span className="ml-auto text-[11px] text-faint">{s.badge}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat + lesson */}
        <div className="flex min-w-0 flex-1 gap-2 p-2">
          <ChatPanel
            title="Sophists and Socrates"
            messages={script.messages}
            visibleCount={visibleCount}
            inputPlaceholder="Message Defeyn..."
            className="w-[420px] shrink-0"
          />
          {script.lessonDoc && (
            <DocPanel
              doc={script.lessonDoc}
              scrollFraction={docFractionAt(elapsed)}
              showLock
              className="min-w-0 flex-1"
            />
          )}
        </div>
      </div>
    </div>
  );
}
