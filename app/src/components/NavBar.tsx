import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { DefeynMark, DiscordIcon, XIcon, RedditIcon } from './icons';
import { ThemeToggle } from './ThemeToggle';

/** Live cursor coordinates in the page corner: the drafting-tool detail.
 * Motion purpose: responds to the pointer, part of the sheet identity. */
function CursorCoords() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    let frame = 0;
    const onMove = (e: MouseEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        setPos({ x: Math.round(e.pageX), y: Math.round(e.pageY) });
        frame = 0;
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div
      aria-hidden
      className="fixed left-4 top-4 z-50 hidden font-mono text-[11px] leading-[1.3] text-ink-mute lg:block"
    >
      X: {pos.x}
      <br />
      Y: {pos.y}
    </div>
  );
}

const navLinks = [
  { label: 'AI Tutor', href: '#demo' },
  { label: 'How it works', href: '#learn' },
  { label: 'Courses', href: '#explore' },
];

const communityItems = [
  { label: 'Discord Community', href: 'https://discord.com' },
  { label: 'Official X', href: 'https://x.com' },
  { label: 'Reddit', href: 'https://reddit.com' },
];

export default function NavBar() {
  const [communityOpen, setCommunityOpen] = useState(false);

  return (
    <>
      <CursorCoords />
      <a
        href="mailto:hello@defeyn.app"
        className="fixed right-5 top-4 z-50 hidden font-mono text-[12px] tracking-[0.02em] text-ink-body transition-colors hover:text-accent lg:block"
      >
        HELLO@DEFYN.APP
      </a>

      {/* Floating nav card, top center (drafting-sheet header) */}
      <nav data-testid="site-nav" className="fixed inset-x-0 top-3.5 z-50 flex justify-center px-4">
        <div className="flex h-[52px] w-full max-w-[760px] items-center gap-1 rounded-[4px] border-[1.5px] border-ink-strong bg-nav-bg pl-3 pr-2 shadow-[3px_3px_0_rgba(38,38,36,0.9)]">
          <a href="#top" className="mr-2 flex items-center gap-1.5 text-ink-strong">
            <DefeynMark size={22} />
            <span className="font-heading text-[16px] font-bold tracking-[-0.01em]">Defeyn</span>
          </a>

          <div className="hidden items-center font-mono text-[13px] md:flex">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="whitespace-nowrap px-3 py-1.5 text-ink-body transition-colors hover:text-accent"
              >
                {l.label}
              </a>
            ))}

            {/* Community dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setCommunityOpen(true)}
              onMouseLeave={() => setCommunityOpen(false)}
            >
              <button
                type="button"
                data-testid="nav-community"
                aria-expanded={communityOpen}
                aria-haspopup="menu"
                onClick={() => setCommunityOpen((v) => !v)}
                className="whitespace-nowrap px-3 py-1.5 text-ink-body transition-colors hover:text-accent"
              >
                Community
              </button>
              {communityOpen && (
                <div
                  role="menu"
                  aria-label="Community"
                  data-testid="nav-community-menu"
                  className="dropdown-in absolute left-0 top-full z-50 w-[190px] rounded-[4px] border-[1.5px] border-ink-strong bg-nav-bg p-1.5 shadow-[3px_3px_0_rgba(38,38,36,0.9)]"
                >
                  {communityItems.map((item) => (
                    <a
                      key={item.label}
                      role="menuitem"
                      href={item.href}
                      className="flex items-center gap-2.5 whitespace-nowrap rounded-[3px] px-3 py-2 text-[13px] text-ink-body transition-colors hover:bg-pill-bg hover:text-accent"
                    >
                      {item.label === 'Discord Community' && <DiscordIcon size={16} />}
                      {item.label === 'Official X' && <XIcon size={14} />}
                      {item.label === 'Reddit' && <RedditIcon size={16} />}
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/login"
              className="hidden whitespace-nowrap font-mono text-[13px] text-ink-body transition-colors hover:text-accent sm:block"
            >
              Log in
            </Link>
            <Link
              to="/app"
              className="flex h-8 whitespace-nowrap items-center rounded-[4px] bg-cta-bg px-3.5 text-[13px] font-bold text-cta-ink transition-colors hover:bg-accent-hover"
            >
              Start learning
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}
