import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';

/** Handwritten margin note (drafting-sheet annotation, DESIGN.md motif). */
function HandNote({
  children,
  className = '',
  rotate = '-rotate-3',
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: string;
}) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute select-none font-hand text-[clamp(18px,2vw,26px)] font-semibold leading-none text-accent ${rotate} ${className}`}
    >
      {children}
    </span>
  );
}

export default function Hero() {
  return (
    <section className="relative flex flex-col items-center pb-10 pt-[150px]" id="top">
      {/* segmented pill toggle */}
      <div className="flex rounded-[4px] border-[1.5px] border-ink-strong bg-nav-bg p-[3px]">
        <a
          href="#learn"
          className="flex h-8 items-center rounded-[2px] px-3 font-mono text-[13px] text-ink-mute transition-colors hover:text-ink"
        >
          how it works
        </a>
        <span className="flex h-8 items-center rounded-[2px] bg-chip-solid-bg px-3 font-mono text-[13px] font-bold text-chip-solid-ink">
          AI Tutor
        </span>
      </div>

      <div className="relative mt-14 px-4 text-center">
        <HandNote className="left-[-52px] top-1 hidden sm:block">
          <span className="relative inline-block">
            PERSONALIZED
            <svg
              className="absolute -bottom-1 left-0 w-full"
              viewBox="0 0 120 8"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M3 5.5C40 2.5 84 2.5 117 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </span>
        </HandNote>
        <h1 className="font-heading text-[clamp(54px,7.4vw,96px)] font-medium leading-[0.95] tracking-[-0.025em] text-ink-strong">
          Your course,
          <br />
          drafted around you
        </h1>
        <HandNote className="-right-2 bottom-1 rotate-2 sm:-right-8">
          <span className="mr-1 inline-block align-middle">
            <svg width="34" height="12" viewBox="0 0 34 12" aria-hidden>
              <path
                d="M2 9C12 4 22 4 31 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M26 3l6 3-5.5 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </span>
          not another chatbot
        </HandNote>
      </div>

      <p className="mt-7 max-w-[520px] px-4 text-center text-[17px] leading-[1.55] text-ink-soft">
        Tell Defeyn what you want to learn. It drafts a real course around your level,
        your pace, and your materials, then teaches it with you, one session at a time.
      </p>

      <a
        href="#demo"
        className="mt-6 flex items-center gap-1 font-mono text-[14px] font-bold text-accent transition-colors hover:text-accent-hover"
      >
        WATCH IT TEACH
        <ArrowUpRight size={15} />
      </a>

      <Link
        to="/app"
        className="mt-9 inline-flex h-12 items-center rounded-[4px] border-[1.5px] border-ink-strong bg-cta-bg px-6 text-[16px] font-bold text-cta-ink shadow-[3px_3px_0_rgba(38,38,36,0.9)] transition-transform hover:-translate-y-[1px] hover:shadow-[4px_4px_0_rgba(38,38,36,0.9)]"
      >
        Start learning today
      </Link>
    </section>
  );
}
