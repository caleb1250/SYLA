import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/current-user";
import type { Course, Module, Lesson } from "@/lib/types";
import { createCourse, createModule, createLesson } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const { supabase } = await getCurrentUserAndProfile();

  const { data: courses } = await supabase.from("courses").select("*").order("sort_order").returns<Course[]>();
  const { data: modules } = await supabase.from("modules").select("*").order("sort_order").returns<Module[]>();
  const { data: lessons } = await supabase.from("lessons").select("*").order("sort_order").returns<Lesson[]>();

  return (
    <div className="flex flex-col gap-6">
      <form action={createCourse} className="flex gap-2">
        <input name="title" placeholder="새 트랙(코스) 이름" required className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm" />
        <button className="h-10 px-4 rounded-lg bg-foreground text-background text-sm font-medium">추가</button>
      </form>

      {(courses ?? []).map((course) => {
        const courseModules = (modules ?? []).filter((m) => m.course_id === course.id);
        return (
          <div key={course.id} className="rounded-xl border border-border bg-card p-3.5">
            <p className="text-[13px] font-medium mb-3">{course.title}</p>

            {courseModules.map((mod) => {
              const modLessons = (lessons ?? []).filter((l) => l.module_id === mod.id);
              return (
                <div key={mod.id} className="mb-3 pl-3 border-l-2 border-border">
                  <p className="text-xs font-medium text-muted mb-1.5">{mod.title}</p>
                  <div className="flex flex-col gap-1 mb-1.5">
                    {modLessons.map((l) => (
                      <Link
                        key={l.id}
                        href={`/admin/courses/lessons/${l.id}`}
                        className="text-[13px] flex items-center justify-between py-1"
                      >
                        <span>
                          {l.title} {l.subtitle ? `· ${l.subtitle}` : ""}
                        </span>
                        <span className="text-xs text-muted">{l.concept ? "작성됨" : "편집"}</span>
                      </Link>
                    ))}
                  </div>
                  <form action={createLesson} className="flex gap-2">
                    <input type="hidden" name="module_id" value={mod.id} />
                    <input name="title" placeholder="새 세션 제목" className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs" />
                    <button className="text-xs text-accent shrink-0">추가</button>
                  </form>
                </div>
              );
            })}

            <form action={createModule} className="flex gap-2 mt-2">
              <input type="hidden" name="course_id" value={course.id} />
              <input name="title" placeholder="새 모듈 이름" className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs" />
              <button className="text-xs text-accent shrink-0">모듈 추가</button>
            </form>
          </div>
        );
      })}
    </div>
  );
}
