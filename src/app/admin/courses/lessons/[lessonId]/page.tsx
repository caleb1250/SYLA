import { notFound } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/current-user";
import type { Lesson } from "@/lib/types";
import { updateLesson } from "../../actions";

export const dynamic = "force-dynamic";

function Field({ name, label, value, textarea }: { name: string; label: string; value: string | null; textarea?: boolean }) {
  const className = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      {textarea ? (
        <textarea name={name} defaultValue={value ?? ""} rows={4} className={className} />
      ) : (
        <input name={name} defaultValue={value ?? ""} className={className} />
      )}
    </label>
  );
}

export default async function EditLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const { supabase } = await getCurrentUserAndProfile();
  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", lessonId).single<Lesson>();
  if (!lesson) notFound();

  return (
    <form action={updateLesson} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={lesson.id} />
      <Field name="title" label="세션 제목" value={lesson.title} />
      <Field name="subtitle" label="주제어 (예: [원형] 모든 것의 시작, 창조주 하나님)" value={lesson.subtitle} />
      <Field
        name="video_url"
        label="영상 링크 (선택) · YouTube, Vimeo, Google Drive 공유 링크를 그대로 붙여넣으면 돼요"
        value={lesson.video_url}
      />
      <Field name="concept" label="개념 · Concept" value={lesson.concept} textarea />
      <Field name="key_scriptures" label="핵심 말씀 · Key Scriptures" value={lesson.key_scriptures} textarea />
      <Field name="deep_dive" label="본문 탐구 · Deep Dive" value={lesson.deep_dive} textarea />
      <Field
        name="personal_questions"
        label="생각해 볼 질문 · Personal Reflection (학생이 묵상 노트에 답을 적어요)"
        value={lesson.personal_questions}
        textarea
      />
      <Field name="group_questions" label="소그룹 토론 질문 · Group Discussion" value={lesson.group_questions} textarea />
      <Field
        name="action_step"
        label="금주의 Action Step (학생이 실천 체크 · 기록 · 사진 인증을 남겨요)"
        value={lesson.action_step}
        textarea
      />
      <Field name="prayer" label="기도 · Prayer" value={lesson.prayer} textarea />
      <button className="h-11 rounded-lg bg-foreground text-background text-sm font-medium mt-2">저장</button>
    </form>
  );
}
