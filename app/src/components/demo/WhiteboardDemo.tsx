import type { DemoScript } from '@/services/types';
import { useLoopClock } from '@/hooks/useLoopClock';
import { ChatPanel } from './ChatPanel';
import { WhiteboardPanel } from './WhiteboardPanel';

const LOOP = 12000;

const REVEAL_AT: Record<string, number> = {
  'g:lesson-1': 3400,
  'c:l1c1': 3700,
  'c:l1c2': 3950,
  'c:l1c3': 4200,
  'c:l1c4': 4450,
  'n:l1n': 4900,
  'g:lesson-2': 5700,
  'c:l2c1': 5950,
  'c:l2c2': 6200,
  'c:l2c3': 6450,
  'c:l2c4': 6700,
  'n:l2n': 7150,
};

/** Whiteboard demo: chat exchange, then lesson note cards pop onto the board (D4). */
export default function WhiteboardDemo({
  script,
  active,
  nonce,
}: {
  script: DemoScript;
  active: boolean;
  nonce: number;
}) {
  const elapsed = useLoopClock(LOOP, active, nonce);
  const times = [400, 1200, 2000, 2800];
  const visibleCount = times.filter((t) => elapsed >= t).length;

  return (
    <div className="flex h-full items-center justify-center" data-testid="whiteboard-demo-window">
      <div className="flex h-[560px] w-[984px] gap-3">
        <ChatPanel title="AI Tutor" messages={script.messages} visibleCount={visibleCount} className="w-[360px] shrink-0" />
        {script.whiteboard && (
          <WhiteboardPanel groups={script.whiteboard} elapsed={elapsed} revealAt={REVEAL_AT} className="min-w-0 flex-1" />
        )}
      </div>
    </div>
  );
}
