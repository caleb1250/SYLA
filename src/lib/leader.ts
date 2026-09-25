import { getCurrentUserAndProfile } from "@/lib/current-user";
import { activityByDay, addDays, computeStreaks, type CheckinRow } from "@/lib/growth";
import { todayInAppTz } from "@/lib/date";
import type { ChurchEvent, Group, Profile } from "@/lib/types";

/**
 * Who may use the leader tools: admins (every group) and anyone set as a
 * small group's leader in /admin/groups (their own groups only). The database
 * enforces the same rule; this only decides what to show.
 */
export async function getLeaderContext() {
  const ctx = await getCurrentUserAndProfile();
  const { user, profile, supabase } = ctx;
  const isAdmin = profile?.role === "admin";
  let groups: Group[] = [];
  if (user) {
    const q = supabase.from("groups").select("*").order("name");
    const { data } = await (isAdmin ? q : q.eq("leader_id", user.id)).returns<Group[]>();
    groups = data ?? [];
  }
  return { ...ctx, isAdmin, groups, canLead: isAdmin || groups.length > 0 };
}

/** Meetings that count toward attendance rate: past, and not a "no meeting" placeholder. */
export function countedPastEvents(events: ChurchEvent[], now: number) {
  return events.filter((e) => e.event_type !== "general" && new Date(e.starts_at).getTime() < now - 3 * 3600_000);
}

export type MemberSummary = {
  profile: Profile;
  streak: number;
  last7: boolean[]; // oldest → today
  lessonsDone: number;
  attended: number;
  lastActive: string | null; // YYYY-MM-DD of latest check-in
};

type Supabase = Awaited<ReturnType<typeof getCurrentUserAndProfile>>["supabase"];

export async function summarizeMembers(
  supabase: Supabase,
  members: Profile[],
  countedEventIds: Set<string>
): Promise<MemberSummary[]> {
  if (members.length === 0) return [];
  const ids = members.map((m) => m.id);
  const today = todayInAppTz();

  const [{ data: checkins }, { data: progress }, { data: attendance }] = await Promise.all([
    supabase
      .from("daily_checkins")
      .select("user_id, checkin_date, bible_reading, meditation, memorization, pray_note")
      .in("user_id", ids)
      .gte("checkin_date", addDays(today, -400))
      .returns<(CheckinRow & { user_id: string })[]>(),
    supabase.from("lesson_progress").select("user_id").in("user_id", ids).eq("completed", true),
    supabase.from("attendance").select("user_id, event_id").in("user_id", ids),
  ]);

  return members.map((profile) => {
    const mine = (checkins ?? []).filter((c) => c.user_id === profile.id);
    const activity = activityByDay(mine);
    const days = [...activity.keys()].sort();
    return {
      profile,
      streak: computeStreaks(activity, today).current,
      last7: Array.from({ length: 7 }, (_, i) => activity.has(addDays(today, i - 6))),
      lessonsDone: (progress ?? []).filter((p) => p.user_id === profile.id).length,
      attended: (attendance ?? []).filter((a) => a.user_id === profile.id && countedEventIds.has(a.event_id)).length,
      lastActive: days.at(-1) ?? null,
    };
  });
}
