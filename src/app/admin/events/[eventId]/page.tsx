import { notFound } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/current-user";
import { formatDateTime } from "@/lib/date";
import type { ChurchEvent, Profile } from "@/lib/types";
import { toggleAttendance } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminEventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { supabase } = await getCurrentUserAndProfile();

  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single<ChurchEvent>();
  if (!event) notFound();

  const { data: members } = await supabase.from("profiles").select("*").order("full_name").returns<Profile[]>();
  const { data: attendance } = await supabase.from("attendance").select("user_id").eq("event_id", eventId);
  const presentIds = new Set((attendance ?? []).map((a) => a.user_id));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[15px] font-medium">{event.title}</p>
        <p className="text-xs text-muted mt-0.5">{formatDateTime(event.starts_at)}</p>
        <p className="text-xs text-muted mt-1">출석 {presentIds.size} / {members?.length ?? 0}</p>
      </div>

      <div className="flex flex-col gap-1">
        {(members ?? []).map((m) => {
          const present = presentIds.has(m.id);
          return (
            <form key={m.id} action={toggleAttendance} className="flex items-center justify-between py-1.5 border-t border-border first:border-t-0">
              <input type="hidden" name="event_id" value={eventId} />
              <input type="hidden" name="user_id" value={m.id} />
              <input type="hidden" name="present" value={String(present)} />
              <span className="text-[13px]">{m.full_name}</span>
              <button
                className="text-xs rounded-full px-3 py-1"
                style={{
                  background: present ? "var(--accent-bg)" : "var(--card)",
                  color: present ? "var(--accent-fg)" : "var(--muted)",
                  border: present ? "none" : "1px solid var(--border)",
                }}
              >
                {present ? "출석" : "결석"}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
