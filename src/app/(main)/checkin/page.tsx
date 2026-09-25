import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/current-user";
import AttendanceButton from "@/components/AttendanceButton";
import { attendanceWindow, formatDate, formatTime } from "@/lib/date";
import type { ChurchEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Landing page for the QR code shown at a meeting: /checkin?e=<eventId>&c=<code> */
export default async function CheckinPage({ searchParams }: { searchParams: Promise<{ e?: string; c?: string }> }) {
  const { e, c } = await searchParams;
  const { user, supabase } = await getCurrentUserAndProfile();

  const { data: event } = e
    ? await supabase.from("events").select("*").eq("id", e).maybeSingle<ChurchEvent>()
    : { data: null };

  if (!event) {
    return (
      <div className="pt-10 text-center flex flex-col gap-3">
        <p className="text-sm text-muted">출석 정보를 찾을 수 없어요.</p>
        <Link href="/calendar" className="text-sm text-accent font-medium">
          캘린더에서 출석하기
        </Link>
      </div>
    );
  }

  const { data: mine } = user
    ? await supabase.from("attendance").select("id").eq("event_id", event.id).eq("user_id", user.id).maybeSingle()
    : { data: null };

  return (
    <div className="pt-8 flex flex-col gap-5">
      <div className="text-center">
        <p className="text-xs text-muted">출석 체크</p>
        <h1 className="text-lg font-medium mt-1">{event.title}</h1>
        <p className="text-xs text-muted mt-0.5">
          {formatDate(event.starts_at, { month: "long", day: "numeric", weekday: "short" })} {formatTime(event.starts_at)}
          {event.location ? ` · ${event.location}` : ""}
        </p>
      </div>
      <AttendanceButton
        eventId={event.id}
        eventTitle="출석"
        userId={user?.id ?? null}
        alreadyCheckedIn={!!mine}
        window={attendanceWindow(event.starts_at)}
        initialCode={c ?? ""}
      />
      <Link href="/home" className="text-xs text-muted text-center">
        홈으로
      </Link>
    </div>
  );
}
