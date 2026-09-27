import { Link } from 'react-router';
import type { CourseTopic, ExploreCoursePreview } from '@/services/types';

/** Circled-dot topic marker. */
function TopicMarker() {
  return (
    <span className="absolute left-[27px] top-[2px] flex h-4 w-4 items-center justify-center rounded-full border border-[#8f8c83]/50 bg-card-surface">
      <span className="h-1.5 w-1.5 rounded-full bg-ink-mute" />
    </span>
  );
}

export function TopicBlock({ topic }: { topic: CourseTopic }) {
  return (
    <div className="relative pl-[60px]">
      <TopicMarker />
      <h3 className="text-[17px] font-bold leading-[1.35] tracking-[-0.01em] text-ink-strong">{topic.title}</h3>
      {topic.description && <p className="mt-1.5 text-[14px] leading-[1.5] text-ink-body">{topic.description}</p>}
      <ul className="mb-1 mt-3 flex flex-col gap-3 pb-1">
        {topic.sections.map((s) => (
          <li key={s.number} className="relative pl-[49px]">
            <span className="absolute left-[-8px] top-[3px] h-[14px] w-[14px] rounded-full border border-border-soft bg-card-surface" />
            <span className="absolute left-[20px] top-[2px] text-[13px] leading-[1.5] text-sub">{s.number}</span>
            <div className="text-[14px] font-semibold leading-[1.45] text-ink-strong">{s.title}</div>
            {s.description && <div className="mt-0.5 text-[13px] leading-[1.5] text-sub">{s.description}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One "Explore what people are learning" card: header block + syllabus preview
 * with timeline + View course button; fixed 840px height, content fades out. */
export default function LearnCard({ course }: { course: ExploreCoursePreview }) {
  return (
    <Link to={`/ai-tutor/${course.slug}`} className="group flex h-[840px] flex-col">
      <div className="shrink-0 rounded-xl border border-panel-border bg-card-surface-2 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-avatar-bg text-[10px] font-semibold text-avatar-ink">
            {course.persona.initials}
          </span>
          <span className="text-[14px] font-semibold text-ink-strong">{course.persona.name}</span>
          <span className="text-[14px] text-sub">· {course.persona.role}</span>
        </div>
        <p className="mt-3 text-[15px] leading-[1.5] text-ink-body">{course.goal}</p>
      </div>

      <div className="relative mt-4 min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_72%,transparent_99%)]">
        <div className="absolute bottom-0 left-[34px] top-[8px] w-px bg-border-soft" />
        <div className="flex flex-col gap-7">
          {course.topics.map((topic) => (
            <TopicBlock key={topic.id} topic={topic} />
          ))}
        </div>
      </div>

      <div className="mx-[22px] mb-3 mt-2 shrink-0">
        <span className="inline-flex h-9 items-center rounded-[8px] border border-border-soft bg-card-surface px-[18px] text-[15px] font-medium text-ink-body transition-colors group-hover:bg-pill-bg">
          View course
        </span>
      </div>
    </Link>
  );
}
