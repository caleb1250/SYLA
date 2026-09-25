"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AttendanceWindow } from "@/lib/date";
import type { CheckInResult } from "@/lib/types";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";

const MESSAGES: Record<Exclude<CheckInResult, "ok" | "already">, string> = {
  bad_code: "코드가 맞지 않아요. 리더가 보여주는 4자리 코드를 확인해주세요.",
  locked: "코드를 5번 틀려서 잠겼어요. 리더에게 출석 처리를 부탁해주세요.",
  not_open: "모임 1시간 전부터 출석 체크할 수 있어요.",
  closed: "출석 체크 시간이 지났어요.",
  not_found: "일정을 찾을 수 없어요.",
  signed_out: "다시 로그인해주세요.",
};

export default function AttendanceButton({
  eventId,
  eventTitle,
  userId,
  alreadyCheckedIn,
  window: windowState,
  initialCode = "",
}: {
  eventId: string;
  eventTitle: string;
  userId: string | null;
  alreadyCheckedIn: boolean;
  /** Computed on the server with attendanceWindow(); the database enforces the same rule. */
  window: AttendanceWindow;
  /** Pre-filled from a scanned QR link. */
  initialCode?: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [checkedIn, setCheckedIn] = useState(alreadyCheckedIn);
  const [code, setCode] = useState(initialCode.replace(/\D/g, "").slice(0, 4));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || loading || code.length !== 4) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("check_in", { p_event: eventId, p_code: code });
    setLoading(false);
    const result = (error ? null : data) as CheckInResult | null;
    if (result === "ok" || result === "already") {
      setCheckedIn(true);
      router.refresh();
      return;
    }
    setError(result ? MESSAGES[result] : "출석 체크를 하지 못했어요. 잠시 후 다시 시도해주세요.");
  }

  if (checkedIn) {
    return (
      <div className="w-full h-11 rounded-lg text-sm font-medium flex items-center justify-center gap-2 bg-accent-bg text-accent-fg">
        <CheckCircle2 size={16} /> {eventTitle} 완료
      </div>
    );
  }

  if (windowState !== "open") {
    return (
      <div className="w-full h-11 rounded-lg text-sm flex items-center justify-center gap-2 border border-border text-muted px-3">
        <Clock size={16} className="shrink-0" />
        <span className="truncate">
          {windowState === "before" ? "모임 1시간 전부터 출석 체크할 수 있어요" : "출석 체크 시간이 지났어요"}
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{4}"
          maxLength={4}
          placeholder="출석 코드 4자리"
          aria-label={`${eventTitle} 출석 코드`}
          className="h-11 flex-1 min-w-0 rounded-lg border border-border bg-card px-3 text-center tracking-[0.3em] tabular-nums outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!userId || loading || code.length !== 4}
          className="h-11 px-4 rounded-lg text-sm font-medium bg-foreground text-background flex items-center gap-1.5 disabled:opacity-50 shrink-0"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          출석
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
