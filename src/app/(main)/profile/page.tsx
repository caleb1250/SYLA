import { getCurrentUserAndProfile } from "@/lib/current-user";
import LogoutButton from "@/components/LogoutButton";
import ActivityCalendar from "@/components/ActivityCalendar";
import JourneyTimeline from "@/components/JourneyTimeline";
import BadgeIcon from "@/components/BadgeIcon";
import ProgressBar from "@/components/ProgressBar";
import { loadCurriculum } from "@/lib/curriculum";
import { activityByDay, computeStreaks, monthView, type CheckinRow } from "@/lib/growth";
import { formatDate, todayInAppTz } from "@/lib/date";
import type { Badge, UserBadge, Group } from "@/lib/types";
import { Flame } from "lucide-react";

export const dynamic = "force-dynamic";

const NEW_BADGE_MS = 1000 * 60 * 60 * 24 * 3;

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="text-xl font-medium mt-0.5 leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const { user, profile, supabase } = await getCurrentUserAndProfile();
  const uid = user?.id ?? "";
  const today = todayInAppTz();
  // eslint-disable-next-line react-hooks/purity -- server component: computed once per request
  const now = Date.now();

  const [{ data: allBadges }, { data: myBadges }, { data: checkins }, { count: attendCount }, curriculum, group] =
    await Promise.all([
      supabase.from("badges").select("*").order("created_at").returns<Badge[]>(),
      supabase.from("user_badges").select("*").eq("user_id", uid).returns<UserBadge[]>(),
      supabase
        .from("daily_checkins")
        .select("checkin_date, bible_reading, meditation, memorization, pray_note")
        .eq("user_id", uid)
        .order("checkin_date")
        .returns<CheckinRow[]>(),
      supabase.from("attendance").select("*", { count: "exact", head: true }).eq("user_id", uid),
      loadCurriculum(supabase, user?.id ?? null),
      profile?.group_id
        ? supabase
            .from("groups")
            .select("*")
            .eq("id", profile.group_id)
            .single<Group>()
            .then((r) => r.data)
        : Promise.resolve(null),
    ]);

  const activity = activityByDay(checkins ?? []);
  const streaks = computeStreaks(activity, today);
  const view = monthView(m, today);

  const earned = new Map((myBadges ?? []).map((b) => [b.badge_id, b.awarded_at]));
  const badges = [...(allBadges ?? [])].sort((a, b) => Number(earned.has(b.id)) - Number(earned.has(a.id)));
  const totalLessons = curriculum.courses.reduce((n, c) => n + c.total, 0);
  const doneLessons = curriculum.courses.reduce((n, c) => n + c.done, 0);
  const mainCourse = curriculum.courses[0];

  return (
    <div className="flex flex-col gap-6 pt-2 pb-6">
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

      <section className="flex flex-col gap-2">
        <p className="text-[13px] font-medium">나의 성장</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-accent-bg p-3">
            <p className="text-[11px] text-accent-fg flex items-center gap-1">
              <Flame size={12} /> 연속 체크
            </p>
            <p className="text-xl font-medium mt-0.5 leading-tight text-accent-fg">{streaks.current}일</p>
            <p className="text-[11px] text-accent-fg/80 mt-0.5">최고 기록 {streaks.best}일</p>
          </div>
          <StatTile label="완료한 세션" value={`${doneLessons}개`} sub={`전체 ${totalLessons}개 중`} />
          <StatTile label="모임 출석" value={`${attendCount ?? 0}회`} />
          <StatTile label="받은 배지" value={`${earned.size}개`} sub={`전체 ${allBadges?.length ?? 0}개 중`} />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-[13px] font-medium">자가 체크 달력</p>
        <ActivityCalendar view={view} activity={activity} today={today} basePath="/profile" />
      </section>

      {mainCourse && (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-medium">2년 여정</p>
            <p className="text-[11px] text-muted">{mainCourse.title}</p>
          </div>
          <JourneyTimeline course={mainCourse} completed={curriculum.completedIds} />
          {curriculum.courses.slice(1).map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-3">
              <p className="text-[13px]">{c.title}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <ProgressBar done={c.done} total={c.total} />
                <span className="text-[11px] text-muted shrink-0">
                  {c.done}/{c.total}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <p className="text-[13px] font-medium">배지</p>
        <ul className="grid grid-cols-2 gap-2">
          {badges.map((b) => {
            const at = earned.get(b.id);
            const isNew = at && now - new Date(at).getTime() < NEW_BADGE_MS;
            return (
              <li
                key={b.id}
                className="rounded-xl p-3 flex flex-col gap-1.5"
                style={{
                  background: at ? "var(--gold-bg)" : "var(--card)",
                  border: at ? "1px solid transparent" : "1px solid var(--border)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: at ? "var(--gold)" : "var(--background)" }}
                  >
                    <BadgeIcon icon={b.icon} size={16} color={at ? "white" : "var(--muted)"} />
                  </span>
                  {isNew && <span className="text-[10px] font-medium text-gold-fg">NEW</span>}
                </div>
                <p className={`text-[13px] font-medium ${at ? "" : "text-muted"}`}>{b.name}</p>
                <p className="text-[11px] text-muted leading-4">
                  {at ? `${formatDate(at, { year: "numeric", month: "short", day: "numeric" })} 획득` : b.description}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <LogoutButton />
    </div>
  );
}
