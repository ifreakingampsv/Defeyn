import type { ExploreCoursePreview } from '@/services/types';
import LearnCard from './LearnCard';

export default function ExploreSection({ courses }: { courses: ExploreCoursePreview[] }) {
  return (
    <section className="mt-[92px]">
      <h2 className="text-center font-heading text-[44px] font-medium leading-[1.4] tracking-[-0.033em] text-ink">
        Explore what people are learning
      </h2>
      <div className="mt-[52px] grid grid-cols-1 gap-x-5 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <LearnCard key={course.slug} course={course} />
        ))}
      </div>
    </section>
  );
}
