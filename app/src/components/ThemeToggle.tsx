import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/** Theme toggle: persists to localStorage, defaults to dark (DESIGN.md).
 * Shared by the landing NavBar, the login page and the app workspace. */
export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('defeyn-theme', dark ? 'dark' : 'light');
    } catch {
      /* storage unavailable: theme still applies for the session */
    }
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((v) => !v)}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="flex h-8 w-8 items-center justify-center rounded-[6px] text-ink-soft transition-colors hover:bg-pill-bg hover:text-ink-strong"
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
