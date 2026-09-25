import Link from "next/link";
import { ChevronRight, MessageCircle, Megaphone, PartyPopper, Pin } from "lucide-react";
import BadgeIcon from "@/components/BadgeIcon";
import { getCurrentUserAndProfile } from "@/lib/current-user";
import DailyCheckinCard from "@/components/DailyCheckinCard";
import AttendanceButton from "@/components/AttendanceButton";
import ProgressBar from "@/components/ProgressBar";
import { loadCurriculum, lessonHref } from "@/lib/curriculum";
import { addDays, activityByDay, computeStreaks, type CheckinRow } from "@/lib/growth";
import { attendanceWindow, formatDate, formatTime, monthDayInAppTz, todayInAppTz } from "@/lib/date";
import type { Announcement, ChurchEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { user, profile, supabase } = await getCurrentUserAndProfile();

  // eslint-disable-next-line react-hooks/purity -- server component: computed once per request, not a render-time hook
  const now = Date.now();
  const cutoff = new Date(now - 1000 * 60 * 60 * 6).toISOString();
  const today = todayInAppTz();

  const newBadgeSince = new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString();

  const [{ data: upcomingEvents }, { data: todayCheckin }, curriculum, { data: recentCheckins }, { data: newBadges }] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .gte("starts_at", cutoff)
      .order("starts_at", { ascending: true })
      .limit(3)
      .returns<ChurchEvent[]>(),
    user
      ? supabase.from("daily_checkins").select("*").eq("user_id", user.id).eq("checkin_date", today).maybeSingle()
      : Promise.resolve({ data: null }),
    loadCurriculum(supabase, user?.id ?? null),
    user
      ? supabase
          .from("daily_checkins")
          .select("checkin_date, bible_reading, meditation, memorization, pray_note")
          .eq("user_id", user.id)
          .gte("checkin_date", addDays(today, -400))
          .lt("checkin_date", today)
          .returns<CheckinRow[]>()
      : Promise.resolve({ data: [] as CheckinRow[] }),
    user
      ? supabase
          .from("user_badges")
          .select("id, awarded_at, badges(name, icon)")
          .eq("user_id", user.id)
          .gte("awarded_at", newBadgeSince)
          .order("awarded_at", { ascending: false })
          .returns<{ id: string; awarded_at: string; badges: { name: string; icon: string } | null }[]>()
      : Promise.resolve({ data: [] }),
  ]);

  const { untilYesterday } = computeStreaks(activityByDay(recentCheckins ?? []), today);

  // Announcements the student can see (RLS: academy-wide + their own small group), last 30 days.
  const [{ data: announcements }, { data: feedback }] = await Promise.all([
    supabase
      .from("announcements")
      .select("*")
      .gte("created_at", new Date(now - 1000 * 60 * 60 * 24 * 30).toISOString())
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<Announcement[]>(),
    // Leader feedback on my own responses in the last 7 days.
    user
      ? supabase
          .from("response_feedback")
          .select("id, body, created_at, profiles(full_name), lesson_responses!inner(user_id, lesson_id, lessons(id, module_id, title))")
          .eq("lesson_responses.user_id", user.id)
          .gte("created_at", new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString())
          .order("created_at", { ascending: false })
          .limit(3)
          .returns<
            {
              id: string;
              body: string;
              created_at: string;
              profiles: { full_name: string } | null;
              lesson_responses: { lessons: { id: string; module_id: string; title: string } | null } | null;
            }[]
          >()
      : Promise.resolve({ data: [] }),
  ]);

  const nextEvent = upcomingEvents?.[0] ?? null;

  let alreadyCheckedIn = false;
  if (nextEvent && user) {
    const { data } = await supabase
      .from("attendance")
      .select("id")
      .eq("event_id", nextEvent.id)
      .eq("user_id", user.id)
      .maybeSingle();
    alreadyCheckedIn = !!data;
  }

  return (
    <div className="flex flex-col gap-5 pt-2 pb-4">
      <p className="text-sm text-muted">안녕하세요, {profile?.full_name ?? "SYLA"}님</p>

      {announcements && announcements.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="공지">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-3 flex gap-2.5">
              {a.pinned ? (
                <Pin size={15} className="text-gold shrink-0 mt-0.5" />
              ) : (
                <Megaphone size={15} className="text-accent shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="text-[13px] font-medium">{a.title}</p>
                {a.body && <p className="text-xs text-muted mt-0.5 whitespace-pre-line leading-5 line-clamp-4">{a.body}</p>}
                <p className="text-[11px] text-muted mt-1">
                  {a.group_id ? "소그룹 공지" : "전체 공지"} · {formatDate(a.created_at)}
                </p>
              </div>
            </div>
          ))}
        </section>
      )}

      {feedback &&
        feedback.map((f) => {
          const lesson = f.lesson_responses?.lessons;
          return (
            <Link
              key={f.id}
              href={lesson ? `${lessonHref(lesson)}#feedback` : "/learn"}
              className="rounded-xl bg-accent-bg p-3 flex items-center gap-3"
            >
              <MessageCircle size={18} className="text-accent-fg shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-accent-fg">
                  {f.profiles?.full_name ?? "리더"}님의 피드백{lesson ? ` · ${lesson.title}` : ""}
                </p>
                <p className="text-[13px] truncate">{f.body}</p>
              </div>
              <ChevronRight size={16} className="text-accent-fg shrink-0" />
            </Link>
          );
        })}

      {newBadges && newBadges.length > 0 && (
        <Link href="/profile" className="rounded-xl bg-gold-bg p-3 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-gold flex items-center justify-center shrink-0">
            <BadgeIcon icon={newBadges[0].badges?.icon ?? "award"} size={18} color="white" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gold-fg">새 배지를 받았어요</p>
            <p className="text-[13px] font-medium truncate">
              {newBadges
                .map((b) => b.badges?.name)
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
          <ChevronRight size={16} className="text-gold-fg shrink-0" />
        </Link>
      )}

      <DailyCheckinCard
        userId={user?.id ?? null}
        initial={todayCheckin ?? null}
        today={today}
        streakUntilYesterday={untilYesterday}
      />

      {nextEvent && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium">다음 모임</p>
          <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-2.5">
            <div>
              <p className="text-[13px] font-medium">{nextEvent.title}</p>
              <p className="text-xs text-muted mt-0.5">
                {formatDate(nextEvent.starts_at, { month: "long", day: "numeric", weekday: "short" })} ·{" "}
                {formatTime(nextEvent.starts_at)}
                {nextEvent.location ? ` · ${nextEvent.location}` : ""}
              </p>
            </div>
            <AttendanceButton
              eventId={nextEvent.id}
              eventTitle="출석"
              userId={user?.id ?? null}
              alreadyCheckedIn={alreadyCheckedIn}
              window={attendanceWindow(nextEvent.starts_at, now)}
            />
          </div>
        </div>
      )}

      {curriculum.courses.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium">이어서 학습하기</p>
          {curriculum.courses.map((course) => (
            <Link
              key={course.id}
              href={course.nextUp ? lessonHref(course.nextUp.lesson) : `/learn/course/${course.id}`}
              className="rounded-xl border border-border bg-card p-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted truncate">{course.title}</p>
                {course.nextUp ? (
                  <>
                    <p className="text-[13px] font-medium mt-0.5">{course.nextUp.lesson.title}</p>
                    {course.nextUp.lesson.subtitle && (
                      <p className="text-xs text-muted truncate">{course.nextUp.lesson.subtitle}</p>
                    )}
                  </>
                ) : (
                  <p className="text-[13px] font-medium mt-0.5 flex items-center gap-1.5">
                    <PartyPopper size={14} /> 모든 세션을 완료했어요
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar done={course.done} total={course.total} />
                  <span className="text-[11px] text-muted shrink-0">
                    {course.done}/{course.total}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {upcomingEvents && upcomingEvents.length > 1 && (
        <div>
          <p className="text-[13px] font-medium mb-2">다가오는 일정</p>
          <div className="flex flex-col">
            {upcomingEvents.slice(1).map((e) => {
              const { month, day } = monthDayInAppTz(e.starts_at);
              return (
                <div key={e.id} className="flex items-center gap-3 py-2 border-t border-border first:border-t-0">
                  <div className="w-9 h-9 rounded-lg bg-accent-bg text-accent-fg flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] leading-none">{month}월</span>
                    <span className="text-[13px] leading-none font-medium">{day}</span>
                  </div>
                  <div>
                    <p className="text-[13px]">{e.title}</p>
                    <p className="text-xs text-muted">
                      {formatDate(e.starts_at, { weekday: "short" })} {formatTime(e.starts_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <Link href="/calendar" className="text-xs text-accent mt-1 inline-block">
            전체 일정 보기
          </Link>
        </div>
      )}
    </div>
  );
}
