import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/current-user";
import { formatDateTime } from "@/lib/date";
import type { ChurchEvent } from "@/lib/types";
import { createEvent } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const { supabase } = await getCurrentUserAndProfile();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: false })
    .returns<ChurchEvent[]>();

  return (
    <div className="flex flex-col gap-6">
      <form action={createEvent} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5">
        <p className="text-[13px] font-medium mb-1">새 일정 추가</p>
        <input name="title" placeholder="제목" required className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
        <select name="event_type" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" defaultValue="bible_study">
          <option value="orientation">오리엔테이션</option>
          <option value="bible_study">Bible Study</option>
          <option value="discussion">독서와 통찰</option>
          <option value="field_trip">Field Trip</option>
          <option value="party">파티</option>
          <option value="general">일반</option>
        </select>
        <input name="starts_at" type="datetime-local" required className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
        <p className="text-[11px] text-muted -mt-1">미국 동부 시간(Eastern) 기준으로 입력해주세요.</p>
        <input name="location" placeholder="장소 (선택)" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
        <button className="h-10 rounded-lg bg-foreground text-background text-sm font-medium mt-1">추가</button>
      </form>

      <div className="flex flex-col gap-2">
        {(events ?? []).map((e) => (
          <Link key={e.id} href={`/admin/events/${e.id}`} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
            <div>
              <p className="text-[13px]">{e.title}</p>
              <p className="text-xs text-muted mt-0.5">{formatDateTime(e.starts_at)}</p>
            </div>
            <span className="text-xs text-accent">출석 관리</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
