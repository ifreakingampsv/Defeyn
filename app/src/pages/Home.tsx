import { useEffect, useState } from 'react';
import type { DemoScript, ExploreCoursePreview } from '@/services/types';
import { getTutorApi } from '@/services/api';
import NavBar from '@/components/NavBar';
import Hero from '@/components/Hero';
import HeroDemoSection from '@/components/HeroDemoSection';
import FeatureSection from '@/components/FeatureSection';
import GoalDemo from '@/components/demo/GoalDemo';
import CurriculumDemo from '@/components/demo/CurriculumDemo';
import WhiteboardDemo from '@/components/demo/WhiteboardDemo';
import ExploreSection from '@/components/ExploreSection';
import CtaSection from '@/components/CtaSection';
import DefeynDesk from '@/components/DefeynDesk';
import { Reveal } from '@/components/FeatureSection';
import Footer from '@/components/Footer';
import { ChalkUnderline } from '@/components/icons';

/** Wraps the one key phrase of a heading with the chalk-underline motif. */
function Mark({ children }: { children: string }) {
  return (
    <span className="relative inline-block">
      {children}
      <ChalkUnderline />
    </span>
  );
}

export default function Home() {
  // Backend seam: demo content comes from the TutorApi (mock today, real
  // HTTP/streaming service once the backend exists, see BACKEND.md).
  const [scripts, setScripts] = useState<DemoScript[]>([]);
  const [courses, setCourses] = useState<ExploreCoursePreview[]>([]);

  useEffect(() => {
    const api = getTutorApi();
    api.getDemoScripts().then(setScripts).catch(console.error);
    api.getExploreCourses().then(setCourses).catch(console.error);
  }, []);

  const script = (id: DemoScript['id']) => scripts.find((s) => s.id === id);

  return (
    <div className="min-h-screen bg-page">
      <NavBar />
      <main className="mx-auto max-w-[1440px] px-6 lg:px-12">
        <Hero />
        <Reveal>
          <div className="relative mt-6 overflow-hidden rounded-[4px] border-[1.5px] border-ink-strong shadow-[6px_6px_0_rgba(38,38,36,0.16)]">
            <DefeynDesk className="block h-[380px] w-full object-cover md:h-[540px]" />
            <div className="absolute bottom-3 right-4 flex items-center gap-2 rounded-[3px] bg-ink-strong/85 px-3 py-1.5 text-[13px] text-page">
              The tutor that drafts with you, not for you.
              <svg width="14" height="13" viewBox="0 0 14 13" aria-hidden>
                <path d="M7 12.5 1.5 6.8A3.6 3.6 0 0 1 7 2.2a3.6 3.6 0 0 1 5.5 4.6L7 12.5Z" fill="#e04b3a" />
              </svg>
            </div>
          </div>
        </Reveal>
        <div id="demo">
          <HeroDemoSection script={script('hero')} />
        </div>

        <div id="learn">
          <FeatureSection
            kicker="01 / SYLLABUS"
            hand="goals, drafted!"
            heading={
              <>
                Tell Defeyn what you want to master. It <Mark>builds a course</Mark> around
                your level, your pace, and your materials.
              </>
            }
            testid="goal-demo"
          >
            {(controls) =>
              script('goal') && <GoalDemo script={script('goal')!} active={controls.active} nonce={controls.nonce} />
            }
          </FeatureSection>

          <FeatureSection
            kicker="02 / CURRICULUM"
            hand="it adapts!"
            flip
            heading={
              <>
                Work through a curriculum that <Mark>adapts to you</Mark>, and ask
                questions the moment they come up.
              </>
            }
            testid="curriculum-demo"
          >
            {(controls) =>
              script('curriculum') && (
                <CurriculumDemo script={script('curriculum')!} active={controls.active} nonce={controls.nonce} />
              )
            }
          </FeatureSection>

          <FeatureSection
            kicker="03 / WHITEBOARD"
            hand="notes, built!"
            heading={
              <>
                Every lesson lands as <Mark>organized notes</Mark> on your whiteboard, so
                review takes minutes, not hours.
              </>
            }
            testid="whiteboard-demo"
          >
            {(controls) =>
              script('whiteboard') && (
                <WhiteboardDemo script={script('whiteboard')!} active={controls.active} nonce={controls.nonce} />
              )
            }
          </FeatureSection>
        </div>

        <div id="explore">
          <ExploreSection courses={courses} />
        </div>
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
