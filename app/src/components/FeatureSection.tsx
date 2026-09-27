import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useInView } from '@/hooks/useInView';

export interface DemoControls {
  active: boolean;
  nonce: number;
}

interface FeatureSectionProps {
  /** Heading accepts a <span className="relative inline-block"> + ChalkUnderline
   * fragment so one key phrase per section carries the brand motif (DESIGN.md). */
  heading: ReactNode;
  /** Drafting-sheet section number, e.g. "01" (mono kicker above the heading). */
  kicker: string;
  /** Handwritten chapter annotation, e.g. "GOALS, DRAFTED!" (illoca-style). */
  hand?: string;
  /** Flip puts the sticky text on the right (alternating chapters). */
  flip?: boolean;
  testid: string;
  children: (controls: DemoControls) => ReactNode;
}

/** Scales fixed-size demo windows to fit narrower stages, pixel-perfect. */
function ScaleToFit({
  children,
  naturalW = 984,
  naturalH = 560,
}: {
  children: ReactNode;
  naturalW?: number;
  naturalH?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setScale(Math.min(1, el.clientWidth / naturalW));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [naturalW]);
  return (
    <div ref={ref} className="w-full" style={{ height: naturalH * scale }}>
      <div
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: naturalW, height: naturalH }}
      >
        {children}
      </div>
    </div>
  );
}

/** Reveal-on-scroll wrapper: fades/slides content in the first time it appears. */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>('-60px', true);
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out will-change-transform ${
        inView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Feature chapter, illoca-style: sticky text column + full demo media block
 * that scales to fit. Text column alternates sides via `flip`. */
export default function FeatureSection({
  heading,
  kicker,
  hand,
  flip = false,
  testid,
  children,
}: FeatureSectionProps) {
  const { ref, inView } = useInView<HTMLDivElement>('120px');
  const [nonce, setNonce] = useState(0);

  const textCol = (
    <Reveal className="lg:sticky lg:top-28 lg:w-[330px] lg:shrink-0">
      <p className="font-mono text-[13px] font-bold text-accent">{kicker}</p>
      {hand && (
        <p className="mt-1 font-hand text-[24px] font-semibold leading-none text-ink-body">
          {hand}
          <span aria-hidden className="ml-1 align-middle font-mono text-[14px]">
            →
          </span>
        </p>
      )}
      <h3 className="mt-2 max-w-[420px] font-heading text-[36px] font-medium leading-[1.15] tracking-[-0.015em] text-ink">
        {heading}
      </h3>
      <a
        href="#demo"
        className="mt-5 inline-flex items-center gap-2 rounded-[4px] border border-border-soft bg-card-surface px-3 py-2 font-mono text-[13px] text-ink-body transition-colors hover:border-ink-strong hover:text-ink-strong"
      >
        <span aria-hidden className="inline-block h-3.5 w-3.5 rounded-[2px] bg-[#e04b3a]" />
        Watch the demo
      </a>
    </Reveal>
  );

  const mediaCol = (
    <div
      ref={ref}
      data-testid={testid}
      className="feature-gradient relative min-h-[520px] w-full flex-1 overflow-hidden rounded-[4px] p-6 lg:p-10"
    >
      <div className="flex min-h-[480px] items-center justify-center">
        <ScaleToFit>{children({ active: inView, nonce })}</ScaleToFit>
      </div>
      <button
        type="button"
        aria-label="Replay animation"
        data-testid={`${testid}-replay`}
        onClick={() => setNonce((n) => n + 1)}
        className="absolute right-2 top-2 z-30 flex h-7 w-7 items-center justify-center text-faint transition-colors hover:text-ink-soft"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <path d="M2.7 6.4A5.5 5.5 0 1 1 2.5 9.6" />
          <path d="M2.3 2.8v3.7H6" />
        </svg>
      </button>
    </div>
  );

  return (
    <section className="mt-[130px]">
      <div className={`flex flex-col gap-10 lg:gap-12 lg:items-start ${flip ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}>
        {textCol}
        {mediaCol}
      </div>
    </section>
  );
}
