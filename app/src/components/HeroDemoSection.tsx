import { useState } from 'react';
import type { DemoScript } from '@/services/types';
import { useInView } from '@/hooks/useInView';
import HeroDemo from './demo/HeroDemo';

/** Hero demo container: gray-beige stage, reset control, autoplaying app demo. */
export default function HeroDemoSection({ script }: { script?: DemoScript }) {
  const { ref, inView } = useInView<HTMLDivElement>('200px');
  const [nonce, setNonce] = useState(0);

  return (
    <section className="mt-12">
      <div
        ref={ref}
        data-testid="hero-demo"
        className="relative h-[776px] overflow-hidden rounded-xl bg-hero-demo px-6 md:px-10 lg:px-16"
      >
        {script && <HeroDemo script={script} active={inView} nonce={nonce} />}
        {/* Floating quick-action buttons at container right edge (S4) */}
        <div className="absolute bottom-[52px] right-6 z-10 flex flex-col gap-2">
          <button
            type="button"
            aria-label="Focus demo"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-soft bg-card-surface text-[#6b6b68] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
              <circle cx="8" cy="8" r="5.2" />
              <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
              <path d="M8 1v2.4M8 12.6V15M1 8h2.4M12.6 8H15" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Open wiki"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-soft bg-card-surface text-[#6b6b68] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M8 3.3C7 2.4 5.6 2 4 2c-.9 0-1.7.1-2.5.4v10.2c.8-.3 1.6-.4 2.5-.4 1.6 0 3 .4 4 1.3 1-.9 2.4-1.3 4-1.3.9 0 1.7.1 2.5.4V2.4C13.7 2.1 12.9 2 12 2c-1.6 0-3 .4-4 1.3Zm0 0v10.2" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          aria-label="Reset demo"
          data-testid="demo-reset-hero"
          onClick={() => setNonce((n) => n + 1)}
          className="absolute right-2 top-2 z-30 flex h-7 w-7 items-center justify-center text-faint transition-colors hover:text-ink-soft"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M2.7 6.4A5.5 5.5 0 1 1 2.5 9.6" />
            <path d="M2.3 2.8v3.7H6" />
          </svg>
        </button>
      </div>
    </section>
  );
}
