"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Circle } from "lucide-react";

export default function MarkCompleteButton({
  lessonId,
  userId,
  initialCompleted,
}: {
  lessonId: string;
  userId: string | null;
  initialCompleted: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    if (!userId || loading) return;
    setLoading(true);
    setError(false);
    const next = !completed;
    const { error } = await supabase.from("lesson_progress").upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        completed: next,
        completed_at: next ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,lesson_id" }
    );
    setLoading(false);
    if (error) {
      setError(true);
      return;
    }
    setCompleted(next);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={toggle}
        disabled={!userId || loading}
        className="w-full h-11 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
        style={{
          background: completed ? "var(--accent-bg)" : "var(--foreground)",
          color: completed ? "var(--accent-fg)" : "var(--background)",
        }}
      >
        {completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
        {completed ? "완료됨" : "완료로 표시"}
      </button>
      {error && <p className="text-xs text-red-600 text-center">저장하지 못했어요. 잠시 후 다시 시도해주세요.</p>}
    </div>
  );
}
