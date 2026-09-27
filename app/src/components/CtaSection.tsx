import { Link } from 'react-router';

export default function CtaSection() {
  return (
    <section id="cta" className="flex justify-center pb-20 pt-2">
      <Link
        to="/app"
        className="inline-flex h-12 items-center rounded-[10px] bg-cta-bg px-6 text-[16px] font-medium leading-[20px] text-cta-ink shadow-[inset_0_0_0_1px_rgba(15,15,15,0.1),0_2px_4px_rgba(15,15,15,0.1)] transition-transform hover:scale-[1.02]"
      >
        Start learning today
      </Link>
    </section>
  );
}
