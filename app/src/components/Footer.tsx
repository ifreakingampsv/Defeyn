import { DefeynMark, DiscordIcon, XIcon, RedditIcon } from './icons';

const columns = [
  {
    heading: 'Product',
    links: [
      { label: 'Changelog', href: '#top' },
      { label: 'Roadmap', href: '#learn' },
      { label: 'Wiki', href: '#demo' },
      { label: 'Pricing', href: '#cta' },
    ],
  },
  {
    heading: 'Download',
    links: [
      { label: 'Mac', href: '#cta' },
      { label: 'Mac (Apple Silicon)', href: '#cta' },
      { label: 'Windows', href: '#cta' },
      { label: 'Linux', href: '#cta' },
      { label: 'iOS', href: '#cta' },
      { label: 'Android', href: '#cta' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Privacy Policy', href: '#top' },
      { label: 'Terms of Service', href: '#top' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Blog', href: '#explore' },
      { label: 'Discord Community', href: 'https://discord.com' },
      { label: 'Contact Support', href: 'mailto:hello@defeyn.app' },
      { label: 'Email Us', href: 'mailto:hello@defeyn.app' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-panel-border bg-card-surface-2">
      <div className="mx-auto max-w-[1440px] px-6 pb-[104px] pt-[72px] lg:px-12">
        <div className="flex flex-col gap-12 lg:flex-row lg:gap-0">
          <div className="flex flex-col lg:w-[384px] lg:min-h-[340px]">
            <a href="#top" className="flex items-center gap-2 text-ink-strong">
              <DefeynMark size={27} />
              <span className="font-heading text-[17px] font-semibold tracking-[-0.01em]">Defeyn</span>
            </a>
            <div className="mt-5 flex items-center gap-4 text-ink-soft">
              <a href="https://discord.com" aria-label="Discord" className="hover:text-ink">
                <DiscordIcon size={19} />
              </a>
              <a href="https://x.com" aria-label="X" className="hover:text-ink">
                <XIcon size={17} />
              </a>
              <a href="https://reddit.com" aria-label="Reddit" className="hover:text-ink">
                <RedditIcon size={19} />
              </a>
            </div>
            <p className="mt-auto pt-10 text-[13px] text-sub">© 2026 Defeyn Labs, Inc.</p>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-8 md:grid-cols-4 lg:gap-0">
            {columns.map((col, i) => (
              <div key={col.heading} className={i > 0 ? 'lg:pl-[52px]' : ''}>
                <h2 className="text-[15px] font-medium text-ink-soft">{col.heading}</h2>
                <ul className="mt-4 flex flex-col gap-[30px]">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-[15px] text-ink-mute hover:text-ink">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
