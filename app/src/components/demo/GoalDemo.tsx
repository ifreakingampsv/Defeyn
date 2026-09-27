import type { DemoControls } from '../FeatureSection';
import type { DemoScript } from '@/services/types';
import { useLoopClock } from '@/hooks/useLoopClock';
import { ChatPanel } from './ChatPanel';
import { SyllabusPanel } from './DocPanel';

const LOOP = 13500;
const TYPING_START = 300;
const TYPING_END = 3000;
const SEND_AT = 3100;
const REPLY_AT = 3900;

/** Goal → syllabus demo: types the learning goal, sends, syllabus builds (D2). */
export default function GoalDemo({ script, active, nonce }: { script: DemoScript; active: boolean; nonce: number }) {
  const elapsed = useLoopClock(LOOP, active, nonce);
  const full = script.typedInput ?? '';

  let typed = '';
  if (elapsed >= TYPING_START && elapsed < SEND_AT) {
    typed = full.slice(0, Math.floor((elapsed - TYPING_START) / 27));
  }

  const visibleCount = elapsed >= REPLY_AT ? 2 : elapsed >= SEND_AT ? 1 : 0;

  let scrollFraction = 0;
  if (elapsed >= 6800) scrollFraction = 1;
  else if (elapsed >= 4300) scrollFraction = 0.5;

  return (
    <div className="flex h-full items-center justify-center" data-testid="goal-demo-window">
      <div className="flex h-[560px] w-[984px] gap-3">
        <ChatPanel
          title="AI Tutor"
          messages={script.messages}
          visibleCount={visibleCount}
          typedText={typed}
          className="w-[360px] shrink-0"
        />
        {script.course && <SyllabusPanel course={script.course} scrollFraction={scrollFraction} className="min-w-0 flex-1" />}
      </div>
    </div>
  );
}

export type { DemoControls };
