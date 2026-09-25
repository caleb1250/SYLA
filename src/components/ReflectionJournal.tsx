"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAutosave, SaveStatusText } from "@/components/useAutosave";
import { PenLine } from "lucide-react";

/** The student's private answer to a session's reflection questions. Autosaves. */
export default function ReflectionJournal({
  userId,
  lessonId,
  initial,
}: {
  userId: string;
  lessonId: string;
  initial: string | null;
}) {
  const supabase = createClient();
  const [text, setText] = useState(initial ?? "");

  const save = useCallback(async () => {
    const { error } = await supabase
      .from("lesson_responses")
      .upsert({ user_id: userId, lesson_id: lessonId, reflection: text.trim() ? text : null }, { onConflict: "user_id,lesson_id" });
    return !error;
  }, [supabase, userId, lessonId, text]);

  const { status, savedAt, schedule, flush } = useAutosave(save);

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={`reflection-${lessonId}`} className="text-xs font-medium flex items-center gap-1.5">
          <PenLine size={14} /> 나의 묵상 노트
        </label>
        <SaveStatusText status={status} savedAt={savedAt} />
      </div>
      <textarea
        id={`reflection-${lessonId}`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          schedule();
        }}
        onBlur={flush}
        rows={5}
        placeholder="위 질문에 대한 나의 생각을 자유롭게 적어보세요. 나와 소그룹 리더, 관리자만 볼 수 있어요."
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-6 outline-none focus:border-accent resize-y"
      />
    </div>
  );
}
