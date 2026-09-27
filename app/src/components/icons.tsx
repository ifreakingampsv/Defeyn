/** Defeyn brand marks and small UI icons lucide-react doesn't cover
 * (brand/social icons). The mark is a Feynman-diagram nod: a particle
 * stroke that bends and ends in an accent vertex dot (see DESIGN.md). */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

/** Defeyn mark: "D" stem + open particle bowl ending in an accent vertex dot. */
export function DefeynMark({ size = 26, ...props }: P & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" {...props}>
      <path
        d="M5.5 3.5v19"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M5.5 4.2c9.8-.4 14.9 2.9 14.9 8.8 0 5.9-5.1 9.2-14.9 8.8"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <circle cx="23" cy="4.6" r="2.9" fill="var(--accent, #0e7a5f)" />
    </svg>
  );
}

/** Tiny tutor glyph: just the bent track + vertex dot, for 13-16px rows. */
export function DefeynGlyph({ size = 13, ...props }: P & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" {...props}>
      <path
        d="M3 12V2.6c4.6-.2 7 1.3 7 4.3 0 2-1.4 3.4-4.2 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="12.2" cy="2.6" r="1.9" fill="var(--accent, #0e7a5f)" />
    </svg>
  );
}

/** Hand-drawn chalk underline for the key phrase of a heading (DESIGN.md motif). */
export function ChalkUnderline({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute -bottom-[0.12em] left-0 h-[0.16em] w-full ${className}`}
      viewBox="0 0 200 9"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M2.5 6.5C48 2.5 152 2.5 197.5 6"
        stroke="var(--accent, #0e7a5f)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
    </svg>
  );
}

export function DiscordIcon({ size = 20, ...props }: P & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.27 5.33A16.4 16.4 0 0 0 15.4 4.1a.06.06 0 0 0-.07.03c-.17.3-.36.7-.5 1.01a15.2 15.2 0 0 0-4.55 0c-.14-.32-.33-.7-.5-1.01a.06.06 0 0 0-.07-.03A16.4 16.4 0 0 0 5.83 5.33a.06.06 0 0 0-.03.02C3.4 8.99 2.75 12.6 3.08 16.16c0 .02.01.04.03.05a16.5 16.5 0 0 0 4.94 2.5c.03 0 .05-.01.07-.03.38-.52.72-1.06 1.01-1.64a.06.06 0 0 0-.03-.09 10.9 10.9 0 0 1-1.53-.73.06.06 0 0 1 0-.1l.3-.24a.06.06 0 0 1 .07 0 11.7 11.7 0 0 0 9.94 0 .06.06 0 0 1 .07 0l.3.24a.06.06 0 0 1 0 .1c-.49.28-1 .53-1.53.73a.06.06 0 0 0-.03.09c.3.57.63 1.12 1 1.63.02.03.05.04.08.03a16.4 16.4 0 0 0 4.95-2.5.06.06 0 0 0 .03-.05c.4-4.11-.66-7.69-2.8-10.81a.05.05 0 0 0-.03-.02ZM9.68 13.96c-.98 0-1.79-.9-1.79-2s.8-2 1.8-2c1 0 1.8.9 1.8 2s-.81 2-1.81 2Zm6.72 0c-.98 0-1.79-.9-1.79-2s.79-2 1.8-2c1 0 1.8.9 1.8 2s-.8 2-1.8 2Z" />
    </svg>
  );
}

export function XIcon({ size = 20, ...props }: P & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.9 3h3.1l-6.8 7.8L22.2 21h-6.3l-4.9-6.4L5.4 21H2.3l7.3-8.3L2 3h6.4l4.4 5.9L17.9 3Zm-1.1 16.1h1.7L7.5 4.7H5.7l11.1 14.4Z" />
    </svg>
  );
}

export function RedditIcon({ size = 20, ...props }: P & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 11.8c0-1.1-.9-2-2-2-.5 0-1 .2-1.4.6a9.8 9.8 0 0 0-5.1-1.6l.9-2.9 2.5.6a1.4 1.4 0 1 0 .1-.9l-2.8-.7a.5.5 0 0 0-.6.3l-1.1 3.6a9.8 9.8 0 0 0-5.1 1.6 2 2 0 1 0-2.2 3.2c0 .2-.1.4-.1.6 0 3 3.3 5.5 7.4 5.5s7.4-2.5 7.4-5.5v-.6c.7-.3 1.1-1 1.1-1.8Zm-13.5 1.4a1.4 1.4 0 1 1 2.8 0 1.4 1.4 0 0 1-2.8 0Zm7.9 3.9c-1 1-2.8 1-4.4 1s-3.5 0-4.4-1a.4.4 0 0 1 .6-.6c.6.6 1.9.9 3.8.9s3.2-.3 3.8-.9a.4.4 0 1 1 .6.6Zm-.4-2.5a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z" />
    </svg>
  );
}

export function CrosshairIcon({ size = 16, ...props }: P & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" {...props}>
      <circle cx="8" cy="8" r="5.2" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
      <path d="M8 1v2.4M8 12.6V15M1 8h2.4M12.6 8H15" />
    </svg>
  );
}

export function BookIcon({ size = 16, ...props }: P & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" {...props}>
      <path d="M8 3.3C7 2.4 5.6 2 4 2c-.9 0-1.7.1-2.5.4v10.2c.8-.3 1.6-.4 2.5-.4 1.6 0 3 .4 4 1.3 1-.9 2.4-1.3 4-1.3.9 0 1.7.1 2.5.4V2.4C13.7 2.1 12.9 2 12 2c-1.6 0-3 .4-4 1.3Zm0 0v10.2" />
    </svg>
  );
}

export function ResetIcon({ size = 16, ...props }: P & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" {...props}>
      <path d="M2.7 6.4A5.5 5.5 0 1 1 2.5 9.6" />
      <path d="M2.3 2.8v3.7H6" />
    </svg>
  );
}

export function ArrowUpRight({ size = 14, ...props }: P & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3.5 10.5 10.5 3.5M4.5 3.5h6v6" />
    </svg>
  );
}
