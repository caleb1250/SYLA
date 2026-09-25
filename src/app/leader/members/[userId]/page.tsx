import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { getLeaderContext, countedPastEvents } from "@/lib/leader";
import { loadCurriculum } from "@/lib/curriculum";
import { activityByDay, computeStreaks, monthView, type CheckinRow } from "@/lib/growth";
import { formatDate, formatDateTime, todayInAppTz } from "@/lib/date";
import ActivityCalendar from "@/components/ActivityCalendar";
import { addFeedback, deleteFeedback, toggleMemberAttendance } from "@/app/leader/actions";
import type { ChurchEvent, LessonResponse, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

type FeedbackRow = { id: string; response_id: string; author_id: string | null; body: string; created_at: string; profiles: { full_name: string } | null };

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { userId } = await params;
  const { m } = await searchParams;
  const { supabase, user, isAdmin, groups } = await getLeaderContext();
  // eslint-disable-next-line react-hooks/purity -- server component: computed once per request
  const now = Date.now();
  const today = todayInAppTz();

  const { data: member } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle<Profile>();
  if (!member) notFound();
  const allowed = isAdmin || (member.group_id && groups.some((g) => g.id === member.group_id));
  if (!allowed) notFound();

  const path = `/leader/members/${userId}`;

  const [{ data: checkins }, { data: events }, { data: attendance }, { data: responses }, curriculum] = await Promise.all([
    supabase
      .from("daily_checkins")
      .select("checkin_date, bible_reading, meditation, memorization, pray_note")
      .eq("user_id", userId)
      .returns<CheckinRow[]>(),
    supabase.from("events").select("*").order("starts_at", { ascending: false }).returns<ChurchEvent[]>(),
    supabase.from("attendance").select("event_id").eq("user_id", userId),
    supabase.from("lesson_responses").select("*").eq("user_id", userId).returns<LessonResponse[]>(),
    // the member's own progress (leaders can read it)
    loadCurriculum(supabase, userId),
  ]);

  const responseIds = (responses ?? []).map((r) => r.id);
  const { data: feedback } = responseIds.length
    ? await supabase
        .from("response_feedback")
        .select("id, response_id, author_id, body, created_at, profiles(full_name)")
        .in("response_id", responseIds)
        .order("created_at")
        .returns<FeedbackRow[]>()
    : { data: [] as FeedbackRow[] };

  const photoUrls = new Map<string, string>();
  const photoPaths = (responses ?? []).map((r) => r.action_photo_path).filter((p): p is string => !!p);
  if (photoPaths.length) {
    const { data: signed } = await supabase.storage.from("action-photos").createSignedUrls(photoPaths, 60 * 60);
    for (const s of signed ?? []) if (s.path && s.signedUrl) photoUrls.set(s.path, s.signedUrl);
  }

  const activity = activityByDay(checkins ?? []);
  const streaks = computeStreaks(activity, today);
  const present = new Set((attendance ?? []).map((a) => a.event_id));
  const past = countedPastEvents(events ?? [], now);
  const responseByLesson = new Map((responses ?? []).map((r) => [r.lesson_id, r]));
  const doneLessons = curriculum.completedIds.size;
  const withWork = curriculum.ordered.filter((o) => responseByLesson.has(o.lesson.id));

  return (
    <div className="flex flex-col gap-6">
      <Link href={member.group_id ? `/leader?g=${member.group_id}` : "/leader"} className="flex items-center gap-1 text-xs text-muted">
        <ChevronLeft size={14} /> 소그룹
      </Link>

      <div className="flex items-center gap-3">
        <span
          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-medium"
          style={{ background: "var(--accent-bg)", color: "var(--accent-fg)" }}
        >
          {member.full_name.slice(0, 1)}
        </span>
        <div>
          <h1 className="text-base font-medium">{member.full_name}</h1>
          <p className="text-xs text-muted">
            연속 {streaks.current}일 · 최고 {streaks.best}일 · 세션 {doneLessons}개 완료 · 출석{" "}
            {past.filter((e) => present.has(e.id)).length}/{past.length}
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <p className="text-[13px] font-medium">자가 체크 달력</p>
        <ActivityCalendar view={monthView(m, today)} activity={activity} today={today} basePath={path} />
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-[13px] font-medium">묵상 노트 · Action Step</p>
        {withWork.length === 0 && <p className="text-xs text-muted">아직 작성한 내용이 없어요.</p>}
        {withWork.map(({ lesson }) => {
          const r = responseByLesson.get(lesson.id)!;
          const fb = (feedback ?? []).filter((f) => f.response_id === r.id);
          const photo = r.action_photo_path ? photoUrls.get(r.action_photo_path) : null;
          return (
            <article key={r.id} id={`r-${r.id}`} className="rounded-xl border border-border bg-card p-3.5 flex flex-col gap-2.5 scroll-mt-16">
              <div>
                <p className="text-[13px] font-medium">
                  {lesson.title} {lesson.subtitle && <span className="text-muted font-normal">{lesson.subtitle}</span>}
                </p>
                <p className="text-[11px] text-muted">마지막 수정 {formatDateTime(r.updated_at)}</p>
              </div>
              {r.reflection && (
                <div>
                  <p className="text-[11px] text-muted mb-1">묵상 노트</p>
                  <p className="text-[13px] leading-6 whitespace-pre-line">{r.reflection}</p>
                </div>
              )}
              {(r.action_done || r.action_note || photo) && (
                <div className="rounded-lg bg-gold-bg p-2.5">
                  <p className="text-[11px] text-gold-fg mb-1">Action Step {r.action_done ? "· 실천 완료" : ""}</p>
                  {r.action_note && <p className="text-[13px] leading-6 whitespace-pre-line">{r.action_note}</p>}
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage
                    <img src={photo} alt={`${member.full_name}의 Action Step 사진`} className="mt-2 w-full max-h-72 object-cover rounded-md" />
                  )}
                </div>
              )}

              <div className="border-t border-border pt-2.5 flex flex-col gap-2">
                {fb.map((f) => (
                  <div key={f.id} className="flex items-start gap-2">
                    <div className="flex-1 rounded-lg bg-accent-bg px-2.5 py-2">
                      <p className="text-[11px] text-accent-fg">
                        {f.profiles?.full_name ?? "리더"} · {formatDate(f.created_at)}
                      </p>
                      <p className="text-[13px] leading-5 whitespace-pre-line mt-0.5">{f.body}</p>
                    </div>
                    {(isAdmin || f.author_id === user?.id) && (
                      <form action={deleteFeedback}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="path" value={path} />
                        <button className="text-muted p-1" aria-label="피드백 삭제">
                          <Trash2 size={13} />
                        </button>
                      </form>
                    )}
                  </div>
                ))}
                <form action={addFeedback} className="flex gap-2">
                  <input type="hidden" name="response_id" value={r.id} />
                  <input type="hidden" name="path" value={path} />
                  <input
                    name="body"
                    required
                    placeholder="격려나 피드백을 남겨주세요"
                    className="h-9 flex-1 min-w-0 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-accent"
                  />
                  <button className="h-9 px-3 rounded-lg bg-foreground text-background text-xs font-medium shrink-0">보내기</button>
                </form>
              </div>
            </article>
          );
        })}
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-[13px] font-medium">출석</p>
        <ul className="rounded-xl border border-border bg-card">
          {past.map((e) => {
            const here = present.has(e.id);
            return (
              <li key={e.id} className="flex items-center justify-between px-3 py-2 border-t border-border first:border-t-0">
                <div className="min-w-0">
                  <p className="text-[13px] truncate">{e.title}</p>
                  <p className="text-[11px] text-muted">{formatDate(e.starts_at, { month: "long", day: "numeric", weekday: "short" })}</p>
                </div>
                <form action={toggleMemberAttendance}>
                  <input type="hidden" name="event_id" value={e.id} />
                  <input type="hidden" name="user_id" value={member.id} />
                  <input type="hidden" name="present" value={String(here)} />
                  <input type="hidden" name="path" value={path} />
                  <button
                    className="text-xs rounded-full px-3 py-1"
                    style={{
                      background: here ? "var(--accent-bg)" : "var(--card)",
                      color: here ? "var(--accent-fg)" : "var(--muted)",
                      border: here ? "none" : "1px solid var(--border)",
                    }}
                    aria-label={`${e.title} ${here ? "출석 취소" : "출석으로 변경"}`}
                  >
                    {here ? "출석" : "결석"}
                  </button>
                </form>
              </li>
            );
          })}
          {past.length === 0 && <li className="px-3 py-2 text-xs text-muted">지난 모임이 없어요.</li>}
        </ul>
      </section>
    </div>
  );
}
