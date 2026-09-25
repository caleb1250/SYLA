import { getCurrentUserAndProfile } from "@/lib/current-user";
import AttendanceButton from "@/components/AttendanceButton";
import { attendanceWindow, formatDate, formatTime } from "@/lib/date";
import type { ChurchEvent, EventType } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<EventType, string> = {
  orientation: "오리엔테이션",
  bible_study: "Bible Study",
  discussion: "독서와 통찰",
  field_trip: "Field Trip",
  party: "파티",
  general: "일정",
};

export default async function CalendarPage() {
  const { user, supabase } = await getCurrentUserAndProfile();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: true })
    .returns<ChurchEvent[]>();

  const { data: myAttendance } = user
    ? await supabase.from("attendance").select("event_id").eq("user_id", user.id)
    : { data: [] as { event_id: string }[] };

  const attendedIds = new Set((myAttendance ?? []).map((a) => a.event_id));
  // eslint-disable-next-line react-hooks/purity -- server component: computed once per request, not a render-time hook
  const now = Date.now();
  const upcoming = (events ?? []).filter((e) => new Date(e.starts_at).getTime() >= now - 1000 * 60 * 60 * 6);
  const past = (events ?? []).filter((e) => new Date(e.starts_at).getTime() < now - 1000 * 60 * 60 * 6);

  return (
    <div className="flex flex-col gap-5 pt-2 pb-6">
      <div>
        <p className="text-[13px] font-medium mb-2">다가오는 일정</p>
        <div className="flex flex-col gap-2">
          {upcoming.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-[13px] font-medium">{e.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {formatDate(e.starts_at, { month: "long", day: "numeric", weekday: "short" })} ·{" "}
                    {formatTime(e.starts_at)}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                </div>
                <span className="text-[11px] text-accent-fg bg-accent-bg rounded-full px-2 py-0.5 shrink-0">
                  {TYPE_LABEL[e.event_type]}
                </span>
              </div>
              <AttendanceButton
                eventId={e.id}
                eventTitle="출석"
                userId={user?.id ?? null}
                alreadyCheckedIn={attendedIds.has(e.id)}
                window={attendanceWindow(e.starts_at, now)}
              />
            </div>
          ))}
          {upcoming.length === 0 && <p className="text-sm text-muted">예정된 일정이 없어요.</p>}
        </div>
      </div>

      {past.length > 0 && (
        <div>
          <p className="text-[13px] font-medium mb-2">지난 일정</p>
          <div className="flex flex-col">
            {past
              .slice()
              .reverse()
              .map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-t border-border first:border-t-0">
                  <div>
                    <p className="text-[13px]">{e.title}</p>
                    <p className="text-xs text-muted">{formatDate(e.starts_at)}</p>
                  </div>
                  <span className="text-xs text-muted">{attendedIds.has(e.id) ? "출석" : "결석"}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
