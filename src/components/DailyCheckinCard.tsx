"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DailyCheckin } from "@/lib/types";

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
}: {
  userId: string | null;
  initial: DailyCheckin | null;
  today: string;
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
      <p className="text-xs font-medium text-accent-fg mb-2">오늘의 자가 체크</p>
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
