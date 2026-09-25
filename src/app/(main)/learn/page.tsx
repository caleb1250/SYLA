import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/current-user";
import { loadCurriculum, lessonHref } from "@/lib/curriculum";
import ProgressBar from "@/components/ProgressBar";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const { user, supabase } = await getCurrentUserAndProfile();
  const { courses } = await loadCurriculum(supabase, user?.id ?? null);

  return (
    <div className="flex flex-col gap-4 pt-2 pb-4">
      <p className="text-[13px] font-medium">커리큘럼</p>

      {courses.map((course) => (
        <div key={course.id} className="rounded-xl border border-border bg-card overflow-hidden">
          <Link href={`/learn/course/${course.id}`} className="block p-3.5">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium mb-0.5">{course.title}</p>
                <p className="text-xs text-muted">
                  모듈 {course.modules.length}개 · 세션 {course.total}개
                  {course.description ? ` · ${course.description}` : ""}
                </p>
              </div>
              <ChevronRight size={16} className="text-muted shrink-0 mt-0.5" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <ProgressBar done={course.done} total={course.total} />
              <span className="text-[11px] text-muted shrink-0">
                {course.done}/{course.total} 완료
              </span>
            </div>
          </Link>
          {course.nextUp && (
            <Link
              href={lessonHref(course.nextUp.lesson)}
              className="flex items-center justify-between gap-2 border-t border-border px-3.5 py-2.5 bg-accent-bg"
            >
              <span className="text-xs text-accent-fg truncate">
                {course.done === 0 ? "시작하기" : "이어서"} · {course.nextUp.lesson.title}
                {course.nextUp.lesson.subtitle ? ` ${course.nextUp.lesson.subtitle}` : ""}
              </span>
              <ChevronRight size={14} className="text-accent-fg shrink-0" />
            </Link>
          )}
        </div>
      ))}

      {courses.length === 0 && (
        <p className="text-sm text-muted">아직 등록된 커리큘럼이 없어요. 관리자 화면에서 추가해보세요.</p>
      )}
    </div>
  );
}
