import Link from "next/link";
import { ChevronRight, QrCode } from "lucide-react";
import { getLeaderContext, countedPastEvents, summarizeMembers } from "@/lib/leader";
import { formatDate, formatTime } from "@/lib/date";
import { AnnouncementForm, AnnouncementList } from "@/components/AnnouncementComposer";
import type { Announcement, ChurchEvent, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderDashboard({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const { g } = await searchParams;
  const { supabase, user, isAdmin, groups } = await getLeaderContext();
  // eslint-disable-next-line react-hooks/purity -- server component: computed once per request
  const now = Date.now();

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted pt-6 text-center">
        아직 만들어진 소그룹이 없어요. 관리자 화면의 소그룹 메뉴에서 먼저 만들어주세요.
      </p>
    );
  }

  const group = groups.find((x) => x.id === g) ?? groups[0];
  const path = `/leader?g=${group.id}`;

  const [{ data: members }, { data: events }, { count: totalLessons }, { data: announcements }] = await Promise.all([
    supabase.from("profiles").select("*").eq("group_id", group.id).order("full_name").returns<Profile[]>(),
    supabase.from("events").select("*").order("starts_at").returns<ChurchEvent[]>(),
    supabase.from("lessons").select("*", { count: "exact", head: true }),
    supabase
      .from("announcements")
      .select("*")
      .eq("group_id", group.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<Announcement[]>(),
  ]);

  const past = countedPastEvents(events ?? [], now);
  const nextEvent = (events ?? []).find((e) => new Date(e.starts_at).getTime() > now - 3 * 3600_000);
  const summaries = await summarizeMembers(supabase, members ?? [], new Set(past.map((e) => e.id)));

  const memberIds = (members ?? []).map((m) => m.id);
  const { data: recent } = memberIds.length
    ? await supabase
        .from("lesson_responses")
        .select("id, user_id, lesson_id, reflection, action_note, action_done, action_photo_path, updated_at, lessons(title, subtitle)")
        .in("user_id", memberIds)
        .order("updated_at", { ascending: false })
        .limit(8)
        .returns<
          {
            id: string;
            user_id: string;
            reflection: string | null;
            action_note: string | null;
            action_done: boolean;
            action_photo_path: string | null;
            updated_at: string;
            lessons: { title: string; subtitle: string | null } | null;
          }[]
        >()
    : { data: [] };
  const nameOf = new Map((members ?? []).map((m) => [m.id, m.full_name]));

  return (
    <div className="flex flex-col gap-6">
      {groups.length > 1 && (
        <nav className="flex gap-1 overflow-x-auto" aria-label="소그룹 선택">
          {groups.map((x) => (
            <Link
              key={x.id}
              href={`/leader?g=${x.id}`}
              className="text-[13px] px-3 py-1.5 rounded-full border whitespace-nowrap"
              style={{
                background: x.id === group.id ? "var(--accent)" : "var(--card)",
                color: x.id === group.id ? "white" : "var(--foreground)",
                borderColor: x.id === group.id ? "var(--accent)" : "var(--border)",
              }}
            >
              {x.name}
            </Link>
          ))}
        </nav>
      )}

      <div>
        <h1 className="text-lg font-medium">{group.name}</h1>
        <p className="text-xs text-muted">그룹원 {members?.length ?? 0}명 · 지난 모임 {past.length}회</p>
      </div>

      {nextEvent && (
        <Link href={`/leader/checkin/${nextEvent.id}`} className="rounded-xl bg-accent text-white p-3.5 flex items-center gap-3">
          <QrCode size={22} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] opacity-80">다음 모임 · 출석 코드 띄우기</p>
            <p className="text-[13px] font-medium truncate">{nextEvent.title}</p>
            <p className="text-[11px] opacity-80">
              {formatDate(nextEvent.starts_at, { month: "long", day: "numeric", weekday: "short" })} {formatTime(nextEvent.starts_at)}
            </p>
          </div>
          <ChevronRight size={16} className="shrink-0" />
        </Link>
      )}

      <section className="flex flex-col gap-2">
        <p className="text-[13px] font-medium">그룹원</p>
        {summaries.length === 0 && <p className="text-xs text-muted">아직 배정된 그룹원이 없어요.</p>}
        <ul className="flex flex-col gap-2">
          {summaries.map((s) => (
            <li key={s.profile.id}>
              <Link href={`/leader/members/${s.profile.id}`} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                  style={{ background: "var(--accent-bg)", color: "var(--accent-fg)" }}
                >
                  {s.profile.full_name.slice(0, 1)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">
                    {s.profile.full_name}
                    {s.profile.id === group.leader_id && <span className="text-[11px] text-muted font-normal"> · 리더</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex gap-0.5" aria-label={`최근 7일 중 ${s.last7.filter(Boolean).length}일 체크`}>
                      {s.last7.map((on, i) => (
                        <span
                          key={i}
                          className="w-2 h-2 rounded-sm"
                          style={{ background: on ? "var(--accent)" : "var(--border)" }}
                        />
                      ))}
                    </span>
                    <span className="text-[11px] text-muted truncate">
                      {s.streak > 0 ? `${s.streak}일 연속` : s.lastActive ? `마지막 체크 ${formatDate(`${s.lastActive}T12:00:00Z`)}` : "체크 기록 없음"}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-muted">세션 {s.lessonsDone}/{totalLessons ?? 0}</p>
                  <p className="text-[11px] text-muted">
                    출석 {s.attended}/{past.length}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-[13px] font-medium">최근 묵상 노트 · Action Step</p>
        {(recent ?? []).length === 0 && <p className="text-xs text-muted">아직 제출된 내용이 없어요.</p>}
        <ul className="flex flex-col gap-2">
          {(recent ?? []).map((r) => (
            <li key={r.id}>
              <Link href={`/leader/members/${r.user_id}#r-${r.id}`} className="block rounded-xl border border-border bg-card p-3">
                <p className="text-[11px] text-muted">
                  {nameOf.get(r.user_id)} · {r.lessons?.title} · {formatDate(r.updated_at)}
                </p>
                {r.reflection && <p className="text-xs mt-1 line-clamp-2 leading-5">{r.reflection}</p>}
                {(r.action_done || r.action_note || r.action_photo_path) && (
                  <p className="text-[11px] text-gold-fg mt-1">
                    Action Step {r.action_done ? "실천" : "기록"}
                    {r.action_photo_path ? " · 사진" : ""}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-[13px] font-medium">소그룹 공지</p>
        <AnnouncementForm groups={[group]} allowGlobal={false} fixedGroupId={group.id} path={path} />
        <AnnouncementList
          items={announcements ?? []}
          groupNames={new Map([[group.id, group.name]])}
          canDelete={(a) => isAdmin || a.author_id === user?.id}
          path={path}
        />
      </section>
    </div>
  );
}
