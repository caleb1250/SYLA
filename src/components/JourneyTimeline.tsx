import Link from "next/link";
import { Check } from "lucide-react";
import type { CourseNode, ModuleNode } from "@/lib/curriculum";
import ProgressBar from "@/components/ProgressBar";

type Stage = {
  label: string;
  title: string;
  modules: ModuleNode[];
  done: number;
  total: number;
  state: "done" | "current" | "upcoming";
};

/**
 * Groups a course's modules into semesters ("Semester N · Module …") and names each
 * semester from the course description ("창조와 정체성 → 타락과 분별 → …").
 */
function toStages(course: CourseNode, completed: Set<string>): Stage[] {
  const themes = (course.description ?? "")
    .split("→")
    .map((s) => s.replace(/,.*$/, "").trim())
    .filter(Boolean);

  const groups = new Map<number, ModuleNode[]>();
  course.modules.forEach((m, i) => {
    const n = Number(m.title.match(/Semester\s*(\d+)/i)?.[1] ?? i + 1);
    groups.set(n, [...(groups.get(n) ?? []), m]);
  });

  const nextModuleId = course.nextUp?.module.id;
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([n, modules]) => {
      const lessons = modules.flatMap((m) => m.lessons);
      const done = lessons.filter((l) => completed.has(l.id)).length;
      const state: Stage["state"] =
        lessons.length > 0 && done === lessons.length
          ? "done"
          : modules.some((m) => m.id === nextModuleId)
            ? "current"
            : "upcoming";
      return {
        label: `${Math.ceil(n / 2)}년차 · ${n}학기`,
        title: themes[n - 1] ?? `Semester ${n}`,
        modules,
        done,
        total: lessons.length,
        state,
      };
    });
}

export default function JourneyTimeline({ course, completed }: { course: CourseNode; completed: Set<string> }) {
  const stages = toStages(course, completed);
  if (stages.length === 0) return null;

  return (
    <ol className="rounded-xl border border-border bg-card p-3.5 flex flex-col">
      {stages.map((s, i) => {
        const last = i === stages.length - 1;
        return (
          <li key={s.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-medium"
                style={{
                  background: s.state === "done" ? "var(--gold)" : s.state === "current" ? "var(--accent)" : "var(--card)",
                  color: s.state === "upcoming" ? "var(--muted)" : "white",
                  border: s.state === "upcoming" ? "1px solid var(--border)" : "none",
                }}
                aria-label={s.state === "done" ? "완료" : s.state === "current" ? "진행 중" : "예정"}
              >
                {s.state === "done" ? <Check size={13} strokeWidth={2.5} /> : i + 1}
              </span>
              {!last && <span className="w-px flex-1 bg-border my-1" />}
            </div>
            <div className={`flex-1 min-w-0 ${last ? "" : "pb-4"}`}>
              <p className="text-[11px] text-muted">{s.label}</p>
              <Link href={`/learn/course/${course.id}`} className="text-[13px] font-medium">
                {s.title}
              </Link>
              <div className="mt-1.5 flex items-center gap-2">
                <ProgressBar done={s.done} total={s.total} />
                <span className="text-[11px] text-muted shrink-0">
                  {s.done}/{s.total}
                </span>
              </div>
              {s.state === "current" && course.nextUp && (
                <p className="text-[11px] text-accent mt-1 truncate">
                  지금: {course.nextUp.lesson.title}
                  {course.nextUp.lesson.subtitle ? ` ${course.nextUp.lesson.subtitle}` : ""}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
