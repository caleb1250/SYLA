import { getCurrentUserAndProfile } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { supabase } = await getCurrentUserAndProfile();

  const [{ count: studentCount }, { count: eventCount }, { count: lessonCount }, { count: groupCount }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("events").select("*", { count: "exact", head: true }),
      supabase.from("lessons").select("*", { count: "exact", head: true }),
      supabase.from("groups").select("*", { count: "exact", head: true }),
    ]);

  const stats = [
    { label: "전체 학생", value: studentCount ?? 0 },
    { label: "등록된 세션", value: lessonCount ?? 0 },
    { label: "등록된 일정", value: eventCount ?? 0 },
    { label: "소그룹 수", value: groupCount ?? 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl bg-card border border-border p-3.5">
          <p className="text-xs text-muted mb-1">{s.label}</p>
          <p className="text-xl font-medium">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
