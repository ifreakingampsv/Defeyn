import type { DemoScript } from '@/services/types';
import { useLoopClock } from '@/hooks/useLoopClock';
import { ChatPanel } from './ChatPanel';
import { DocPanel } from './DocPanel';

const LOOP = 11000;

const SCROLL_BEATS: Array<[number, number]> = [
  [2000, 0.12],
  [3600, 0.3],
  [5000, 0.5],
  [6400, 0.7],
  [7800, 0.88],
  [9200, 1],
];

/** Curriculum demo: Q&A in chat while the lesson article scrolls (D3). */
export default function CurriculumDemo({
  script,
  active,
  nonce,
}: {
  script: DemoScript;
  active: boolean;
  nonce: number;
}) {
  const elapsed = useLoopClock(LOOP, active, nonce);
  const visibleCount = elapsed >= 1500 ? 2 : elapsed >= 500 ? 1 : 0;

  let scrollFraction = 0;
  for (const [at, frac] of SCROLL_BEATS) {
    if (elapsed >= at) scrollFraction = frac;
  }

  return (
    <div className="flex h-full items-center justify-center" data-testid="curriculum-demo-window">
      <div className="flex h-[560px] w-[984px] gap-3">
        <ChatPanel title="AI Tutor" messages={script.messages} visibleCount={visibleCount} className="w-[360px] shrink-0" />
        {script.lessonDoc && <DocPanel doc={script.lessonDoc} scrollFraction={scrollFraction} className="min-w-0 flex-1" />}
      </div>
    </div>
  );
}
