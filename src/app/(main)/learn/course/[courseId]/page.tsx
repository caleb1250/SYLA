import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, Circle, CircleDot } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/current-user";
import { loadCurriculum, lessonHref } from "@/lib/curriculum";
import ProgressBar from "@/components/ProgressBar";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { user, supabase } = await getCurrentUserAndProfile();
  const { courses, completedIds } = await loadCurriculum(supabase, user?.id ?? null);

  const course = courses.find((c) => c.id === courseId);
  if (!course) notFound();

  return (
    <div className="flex flex-col gap-4 pt-2 pb-6">
      <Link href="/learn" className="flex items-center gap-1 text-xs text-muted">
        <ChevronLeft size={14} /> 커리큘럼
      </Link>

      <div>
        <h1 className="text-lg font-medium">{course.title}</h1>
        {course.description && <p className="text-xs text-muted mt-1 leading-5">{course.description}</p>}
        <div className="mt-3 flex items-center gap-2">
          <ProgressBar done={course.done} total={course.total} />
          <span className="text-[11px] text-muted shrink-0">
            {course.done}/{course.total} 완료
          </span>
        </div>
      </div>

      {course.modules.map((mod) => {
        const modDone = mod.lessons.filter((l) => completedIds.has(l.id)).length;
        return (
          <section key={mod.id} className="rounded-xl border border-border bg-card">
            <div className="px-3.5 pt-3 pb-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-medium leading-5">{mod.title}</p>
                <span className="text-[11px] text-muted shrink-0 mt-0.5">
                  {modDone}/{mod.lessons.length}
                </span>
              </div>
              {mod.theme && <p className="text-xs text-muted mt-1 leading-5">{mod.theme}</p>}
            </div>
            <ul>
              {mod.lessons.map((l) => {
                const done = completedIds.has(l.id);
                const isNext = course.nextUp?.lesson.id === l.id;
                const Icon = done ? CheckCircle2 : isNext ? CircleDot : Circle;
                return (
                  <li key={l.id} className="border-t border-border">
                    <Link href={lessonHref(l)} className="flex items-center gap-3 px-3.5 py-2.5">
                      <Icon
                        size={18}
                        strokeWidth={1.75}
                        className="shrink-0"
                        color={done ? "var(--gold)" : isNext ? "var(--accent)" : "var(--border)"}
                        aria-label={done ? "완료" : isNext ? "다음 세션" : "미완료"}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px]">{l.title}</p>
                        {l.subtitle && <p className="text-xs text-muted truncate">{l.subtitle}</p>}
                      </div>
                      {!l.has_content && (
                        <span className="text-[10px] text-muted border border-border rounded-full px-1.5 py-0.5 shrink-0">
                          준비 중
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
              {mod.lessons.length === 0 && (
                <li className="border-t border-border px-3.5 py-2.5 text-xs text-muted">등록된 세션이 없어요.</li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
