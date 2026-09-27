import { Link } from 'react-router';
import { DefeynMark } from './icons';
import { ThemeToggle } from './ThemeToggle';

/**
 * Shared header for sub-pages (course file, login): the same drafting-sheet
 * nav card as the landing — bordered, hard offset shadow, mono micro-copy —
 * statically placed instead of fixed, with an optional mono crumb.
 */
export default function PageNav({ crumb }: { crumb?: string }) {
  return (
    <div className="flex justify-center px-4 pt-5">
      <nav className="flex h-[52px] w-full max-w-[820px] items-center gap-1 rounded-[4px] border-[1.5px] border-ink-strong bg-nav-bg pl-3 pr-2 shadow-[3px_3px_0_rgba(38,38,36,0.9)]">
        <Link to="/" className="mr-2 flex items-center gap-1.5 text-ink-strong">
          <DefeynMark size={22} />
          <span className="font-heading text-[16px] font-bold tracking-[-0.01em]">Defeyn</span>
        </Link>
        {crumb && (
          <span className="hidden font-mono text-[12px] text-ink-mute sm:inline">{crumb}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/app"
            className="flex h-8 whitespace-nowrap items-center rounded-[4px] bg-cta-bg px-3.5 text-[13px] font-bold text-cta-ink transition-colors hover:bg-accent-hover"
          >
            Start learning
          </Link>
        </div>
      </nav>
    </div>
  );
}
