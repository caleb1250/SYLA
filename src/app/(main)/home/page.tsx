import Link from "next/link";
import { ChevronRight, PartyPopper } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/current-user";
import DailyCheckinCard from "@/components/DailyCheckinCard";
import AttendanceButton from "@/components/AttendanceButton";
import ProgressBar from "@/components/ProgressBar";
import { loadCurriculum, lessonHref } from "@/lib/curriculum";
import { attendanceWindow, formatDate, formatTime, monthDayInAppTz, todayInAppTz } from "@/lib/date";
import type { ChurchEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { user, profile, supabase } = await getCurrentUserAndProfile();

  // eslint-disable-next-line react-hooks/purity -- server component: computed once per request, not a render-time hook
  const now = Date.now();
  const cutoff = new Date(now - 1000 * 60 * 60 * 6).toISOString();
  const today = todayInAppTz();

  const [{ data: upcomingEvents }, { data: todayCheckin }, curriculum] = await Promise.all([
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

      <DailyCheckinCard userId={user?.id ?? null} initial={todayCheckin ?? null} today={today} />

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
