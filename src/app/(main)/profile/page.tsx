import { getCurrentUserAndProfile } from "@/lib/current-user";
import LogoutButton from "@/components/LogoutButton";
import type { Badge, UserBadge, Lesson, LessonProgress, Group } from "@/lib/types";
import { Award, Lock, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user, profile, supabase } = await getCurrentUserAndProfile();

  const { data: allBadges } = await supabase.from("badges").select("*").returns<Badge[]>();
  const { data: myBadges } = user
    ? await supabase.from("user_badges").select("*").eq("user_id", user.id).returns<UserBadge[]>()
    : { data: [] as UserBadge[] };
  const earnedIds = new Set((myBadges ?? []).map((b) => b.badge_id));

  const { data: allLessons } = await supabase.from("lessons").select("id").returns<Pick<Lesson, "id">[]>();
  const { data: completedProgress } = user
    ? await supabase
        .from("lesson_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", true)
        .returns<LessonProgress[]>()
    : { data: [] as LessonProgress[] };

  const total = allLessons?.length ?? 0;
  const done = completedProgress?.length ?? 0;

  const group = profile?.group_id
    ? (await supabase.from("groups").select("*").eq("id", profile.group_id).single<Group>()).data
    : null;

  return (
    <div className="flex flex-col gap-5 pt-2 pb-6">
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-medium"
          style={{ background: "var(--accent-bg)", color: "var(--accent-fg)" }}
        >
          {profile?.full_name?.slice(0, 1) ?? "?"}
        </div>
        <div>
          <p className="text-sm font-medium">{profile?.full_name}</p>
          <p className="text-xs text-muted">{group?.name ?? "소그룹 미배정"}</p>
        </div>
      </div>

      <div>
        <p className="text-[13px] font-medium mb-2">배지</p>
        <div className="grid grid-cols-4 gap-2">
          {(allBadges ?? []).map((b) => {
            const earned = earnedIds.has(b.id);
            return (
              <div
                key={b.id}
                title={b.name}
                className="aspect-square rounded-xl flex items-center justify-center"
                style={{ background: earned ? "var(--gold-bg)" : "var(--card)", border: earned ? "none" : "1px solid var(--border)" }}
              >
                {earned ? <Award size={20} color="var(--gold-fg)" /> : <Lock size={16} color="var(--muted)" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border pt-3 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <BarChart3 size={16} />
          학습 진도: {done} / {total} 세션 완료
        </div>
      </div>

      <LogoutButton />
    </div>
  );
}
