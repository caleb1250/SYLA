"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DailyCheckin } from "@/lib/types";
import { Flame } from "lucide-react";

const FIELDS: { key: keyof Pick<DailyCheckin, "bible_reading" | "meditation" | "memorization" | "pray_note">; label: string }[] = [
  { key: "bible_reading", label: "성경읽기" },
  { key: "meditation", label: "말씀묵상" },
  { key: "memorization", label: "말씀암송" },
  { key: "pray_note", label: "P.R.A.Y 노트" },
];

export default function DailyCheckinCard({
  userId,
  initial,
  today,
  streakUntilYesterday,
}: {
  userId: string | null;
  initial: DailyCheckin | null;
  today: string;
  /** Consecutive checked-in days ending yesterday (today extends it once anything is checked). */
  streakUntilYesterday: number;
}) {
  const supabase = createClient();
  const [state, setState] = useState({
    bible_reading: initial?.bible_reading ?? false,
    meditation: initial?.meditation ?? false,
    memorization: initial?.memorization ?? false,
    pray_note: initial?.pray_note ?? false,
  });
  const [, startTransition] = useTransition();

  if (!userId) return null;

  const anyToday = Object.values(state).some(Boolean);
  const streak = streakUntilYesterday + (anyToday ? 1 : 0);
  let streakText = "오늘 첫 체크를 해보세요";
  if (streak > 0 && anyToday) streakText = `${streak}일 연속`;
  else if (streak > 0) streakText = `${streak}일 연속 · 오늘도 이어가요`;

  function toggle(key: keyof typeof state) {
    const next = { ...state, [key]: !state[key] };
    setState(next);
    startTransition(async () => {
      await supabase
        .from("daily_checkins")
        .upsert({ user_id: userId, checkin_date: today, ...next }, { onConflict: "user_id,checkin_date" });
    });
  }

  return (
    <div className="rounded-xl bg-accent-bg p-3.5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-accent-fg">오늘의 자가 체크</p>
        <span className="text-[11px] text-accent-fg flex items-center gap-1" aria-live="polite">
          <Flame size={12} color={streak > 0 ? "var(--gold)" : "currentColor"} />
          {streakText}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className="text-[13px] rounded-lg px-2.5 py-2 text-left border"
            style={{
              background: state[key] ? "var(--accent)" : "var(--card)",
              color: state[key] ? "white" : "var(--foreground)",
              borderColor: state[key] ? "var(--accent)" : "var(--border)",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
