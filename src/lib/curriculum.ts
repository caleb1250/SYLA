import type { createClient } from "@/lib/supabase/server";
import type { Course, Module, Lesson } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type LessonSummary = Pick<Lesson, "id" | "module_id" | "title" | "subtitle" | "sort_order"> & {
  has_content: boolean;
};

export type ModuleNode = Module & { lessons: LessonSummary[] };

export type CourseNode = Course & {
  modules: ModuleNode[];
  total: number;
  done: number;
  /** First session (in order) the student hasn't completed yet, or null when the course is finished. */
  nextUp: { lesson: LessonSummary; module: ModuleNode } | null;
};

export type Curriculum = {
  courses: CourseNode[];
  completedIds: Set<string>;
  /** Every published session in reading order, for prev/next navigation. */
  ordered: { lesson: LessonSummary; module: ModuleNode; course: CourseNode }[];
};

export function lessonHref(l: { id: string; module_id: string }) {
  return `/learn/${l.module_id}/${l.id}`;
}

/**
 * Loads the published curriculum as an ordered tree (course → module → session)
 * with the given student's completion state merged in.
 */
export async function loadCurriculum(supabase: Supabase, userId: string | null): Promise<Curriculum> {
  const [{ data: courses }, { data: modules }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase.from("courses").select("*").eq("published", true).order("sort_order").returns<Course[]>(),
    supabase.from("modules").select("*").order("sort_order").returns<Module[]>(),
    supabase
      .from("lessons")
      .select("id, module_id, title, subtitle, sort_order, concept")
      .order("sort_order")
      .returns<(Pick<Lesson, "id" | "module_id" | "title" | "subtitle" | "sort_order"> & { concept: string | null })[]>(),
    userId
      ? supabase.from("lesson_progress").select("lesson_id").eq("user_id", userId).eq("completed", true)
      : Promise.resolve({ data: [] as { lesson_id: string }[] }),
  ]);

  const completedIds = new Set((progress ?? []).map((p) => p.lesson_id));

  const lessonsByModule = new Map<string, LessonSummary[]>();
  for (const l of lessons ?? []) {
    const { concept, ...rest } = l;
    const list = lessonsByModule.get(l.module_id) ?? [];
    list.push({ ...rest, has_content: !!concept });
    lessonsByModule.set(l.module_id, list);
  }

  const ordered: Curriculum["ordered"] = [];
  const tree: CourseNode[] = (courses ?? []).map((course) => {
    const courseModules: ModuleNode[] = (modules ?? [])
      .filter((m) => m.course_id === course.id)
      .map((m) => ({ ...m, lessons: lessonsByModule.get(m.id) ?? [] }));

    const node: CourseNode = { ...course, modules: courseModules, total: 0, done: 0, nextUp: null };
    for (const m of courseModules) {
      for (const l of m.lessons) {
        node.total += 1;
        if (completedIds.has(l.id)) node.done += 1;
        else if (!node.nextUp) node.nextUp = { lesson: l, module: m };
        ordered.push({ lesson: l, module: m, course: node });
      }
    }
    return node;
  });

  return { courses: tree, completedIds, ordered };
}
