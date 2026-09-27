import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { getTutorApi } from '@/services/api';
import type { ExploreCoursePreview } from '@/services/types';
import PageNav from '@/components/PageNav';
import { TopicBlock } from '@/components/LearnCard';

const api = getTutorApi();

/** "I want to learn how to train an AI model like ChatGPT." → "Train an AI model like ChatGPT" */
function goalHeadline(goal: string): string {
  const stripped = goal
    .replace(/^i want to learn (how )?to /i, '')
    .replace(/^i (want|would like|'d like) to /i, '')
    .replace(/^[a-z]/, (c) => c.toUpperCase())
    .replace(/[.!?]+$/, '');
  return stripped || goal;
}

/** Public course page behind the "Explore what people are learning" cards:
 * the persona's goal + the drafted syllabus preview, and "Start this course"
 * which opens a seeded workspace session. */
export default function CoursePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<ExploreCoursePreview | null | 'loading'>('loading');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let alive = true;
    setCourse('loading');
    api
      .getCourseBySlug(slug ?? '')
      .then((c) => alive && setCourse(c))
      .catch(() => alive && setCourse(null));
    return () => {
      alive = false;
    };
  }, [slug]);

  const start = async () => {
    if (!slug || starting) return;
    setStarting(true);
    try {
      const created = await api.startCourse(slug);
      if (created) navigate(`/app/s/${created.sessionId}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PageNav crumb="/ COURSE FILE" />

      {course === 'loading' ? (
        <main className="flex flex-1 items-center justify-center text-sub">
          <LoaderCircle size={22} className="animate-spin" />
        </main>
      ) : !course ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-mute">404 / COURSE NOT FOUND</p>
          <h1 className="font-heading text-[30px] font-medium tracking-[-0.02em] text-ink-strong">
            This course doesn't exist
          </h1>
          <p className="max-w-[420px] text-[15px] text-ink-soft">
            The link may be outdated. Explore what people are learning on the site,
            or draft your own course in the workspace.
          </p>
          <Link
            to="/#explore"
            className="flex h-9 items-center gap-1.5 rounded-[7px] border border-border-soft bg-card-surface px-3.5 text-[13.5px] text-ink-body transition-colors hover:bg-pill-bg"
          >
            <ArrowLeft size={14} /> Browse courses
          </Link>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-[820px] flex-1 px-4 pb-24">
          <Link
            to="/#explore"
            className="mt-8 inline-flex items-center gap-1.5 font-mono text-[12.5px] text-ink-mute transition-colors hover:text-accent"
          >
            <ArrowLeft size={13} /> ALL COURSES
          </Link>

          {/* goal card: the printed course-file sheet (hard offset shadow) */}
          <div className="relative mt-6 rounded-[4px] border-[1.5px] border-ink-strong bg-card-surface-2 p-5 shadow-[4px_4px_0_rgba(38,38,36,0.9)] sm:p-6">
            {/* handwritten margin annotation: one per heading (DESIGN.md motif) */}
            <span
              aria-hidden
              className="pointer-events-none absolute -top-9 right-2 hidden select-none items-center gap-1 font-hand text-[clamp(18px,2vw,24px)] font-semibold leading-none text-accent sm:flex"
            >
              {`drafted for ${course.persona.name}, ready to teach`}
              <svg width="30" height="12" viewBox="0 0 34 12" aria-hidden className="-rotate-12">
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

            <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-ink-mute">
              Course file — {course.slug}
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-avatar-bg text-[11px] font-semibold text-avatar-ink">
                {course.persona.initials}
              </span>
              <span className="text-[14px] font-semibold text-ink-strong">{course.persona.name}</span>
              <span className="text-[14px] text-sub">· {course.persona.role}</span>
            </div>
            <h1 className="mt-4 font-heading text-[clamp(26px,3.4vw,36px)] font-medium leading-[1.15] tracking-[-0.02em] text-ink-strong">
              {goalHeadline(course.goal)}
            </h1>
            <p className="mt-2 text-[14.5px] leading-[1.55] text-ink-soft">
              A course Defeyn drafted from this goal — syllabus below. Start it to get
              your own live session, taught at your pace.
            </p>
            <button
              type="button"
              onClick={start}
              disabled={starting}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-[4px] border-[1.5px] border-ink-strong bg-cta-bg px-5 text-[15px] font-bold text-cta-ink shadow-[3px_3px_0_rgba(38,38,36,0.9)] transition-transform hover:-translate-y-[1px] hover:shadow-[4px_4px_0_rgba(38,38,36,0.9)] disabled:opacity-60"
            >
              {starting && <LoaderCircle size={15} className="animate-spin" />}
              Start this course
            </button>
          </div>

          {/* syllabus: numbered chapter block, same kicker voice as the landing */}
          <div className="relative mt-12">
            <p className="mb-6 font-mono text-[12px] uppercase tracking-[0.08em] text-ink-mute">
              01 / Syllabus — the draft
            </p>
            <div className="relative">
              <div className="absolute bottom-2 left-[34px] top-[6px] w-px bg-border-soft" />
              <div className="flex flex-col gap-9">
                {course.topics.map((topic) => (
                  <TopicBlock key={topic.id} topic={topic} />
                ))}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
