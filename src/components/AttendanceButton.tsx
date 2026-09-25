"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AttendanceWindow } from "@/lib/date";
import { CheckCircle2, ScanLine, Clock } from "lucide-react";

export default function AttendanceButton({
  eventId,
  eventTitle,
  userId,
  alreadyCheckedIn,
  window: windowState,
}: {
  eventId: string;
  eventTitle: string;
  userId: string | null;
  alreadyCheckedIn: boolean;
  /** Computed on the server with attendanceWindow(); the database enforces the same rule. */
  window: AttendanceWindow;
}) {
  const supabase = createClient();
  const [checkedIn, setCheckedIn] = useState(alreadyCheckedIn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = windowState === "open";

  async function handleCheckIn() {
    if (!userId || checkedIn || loading || !open) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("attendance").insert({ event_id: eventId, user_id: userId });
    setLoading(false);
    if (error) {
      setError("출석 체크를 하지 못했어요. 모임 시간에 다시 시도해주세요.");
      return;
    }
    setCheckedIn(true);
  }

  let label = `${eventTitle} 출석 체크`;
  if (checkedIn) label = `${eventTitle} 출석 완료`;
  else if (windowState === "before") label = "모임 1시간 전부터 출석 체크할 수 있어요";
  else if (windowState === "closed") label = "출석 체크 시간이 지났어요";

  const Icon = checkedIn ? CheckCircle2 : open ? ScanLine : Clock;
  const active = !checkedIn && open;

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handleCheckIn}
        disabled={!active || loading || !userId}
        className="w-full h-11 rounded-lg text-sm font-medium flex items-center justify-center gap-2 px-3 disabled:opacity-80"
        style={{
          background: active ? "var(--foreground)" : checkedIn ? "var(--accent-bg)" : "var(--card)",
          color: active ? "var(--background)" : checkedIn ? "var(--accent-fg)" : "var(--muted)",
          border: active || checkedIn ? "none" : "1px solid var(--border)",
        }}
      >
        <Icon size={16} className="shrink-0" />
        <span className="truncate">{loading ? "확인 중..." : label}</span>
      </button>
      {error && <p className="text-xs text-red-600 text-center">{error}</p>}
    </div>
  );
}
