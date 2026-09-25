import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, ExternalLink, MessageCircle } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/current-user";
import { loadCurriculum, lessonHref } from "@/lib/curriculum";
import { toEmbedUrl } from "@/lib/video";
import MarkCompleteButton from "@/components/MarkCompleteButton";
import ReflectionJournal from "@/components/ReflectionJournal";
import ActionStepCard from "@/components/ActionStepCard";
import type { Lesson, LessonResponse } from "@/lib/types";
import { formatDate } from "@/lib/date";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <section>
      <p className="text-xs font-medium text-muted mb-1.5">{title}</p>
      <p className="text-[13px] leading-6 whitespace-pre-line">{children}</p>
    </section>
  );
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ moduleId: string; lessonId: string }>;
}) {
  const { moduleId, lessonId } = await params;
  const { user, supabase } = await getCurrentUserAndProfile();

  const [{ data: lesson }, curriculum, { data: response }] = await Promise.all([
    supabase.from("lessons").select("*").eq("id", lessonId).eq("module_id", moduleId).maybeSingle<Lesson>(),
    loadCurriculum(supabase, user?.id ?? null),
    user
      ? supabase
          .from("lesson_responses")
          .select("*")
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId)
          .maybeSingle<LessonResponse>()
      : Promise.resolve({ data: null }),
  ]);

  if (!lesson) notFound();

  const idx = curriculum.ordered.findIndex((o) => o.lesson.id === lesson.id);
  const here = idx >= 0 ? curriculum.ordered[idx] : null;
  const sameCourse = (o: (typeof curriculum.ordered)[number] | undefined) =>
    o && here && o.course.id === here.course.id ? o : null;
  const prev = sameCourse(curriculum.ordered[idx - 1]);
  const next = sameCourse(curriculum.ordered[idx + 1]);
  const completed = curriculum.completedIds.has(lesson.id);

  const embedUrl = toEmbedUrl(lesson.video_url);

  const { data: feedback } = response
    ? await supabase
        .from("response_feedback")
        .select("id, body, created_at, profiles(full_name)")
        .eq("response_id", response.id)
        .order("created_at")
        .returns<{ id: string; body: string; created_at: string; profiles: { full_name: string } | null }[]>()
    : { data: [] };

  let photoUrl: string | null = null;
  if (response?.action_photo_path) {
    const { data } = await supabase.storage.from("action-photos").createSignedUrl(response.action_photo_path, 60 * 60);
    photoUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="flex flex-col gap-5 pt-2 pb-6">
      <Link
        href={here ? `/learn/course/${here.course.id}` : "/learn"}
        className="flex items-center gap-1 text-xs text-muted"
      >
        <ChevronLeft size={14} /> <span className="truncate">{here?.course.title ?? "커리큘럼"}</span>
      </Link>

      <div>
        {here && <p className="text-xs text-muted mb-1 leading-5">{here.module.title}</p>}
        <h1 className="text-lg font-medium">{lesson.title}</h1>
        {lesson.subtitle && <p className="text-sm text-muted mt-0.5">{lesson.subtitle}</p>}
      </div>

      {embedUrl && (
        <div className="aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            title={`${lesson.title} 영상`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      )}
      {lesson.video_url && (
        <a
          href={lesson.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="-mt-3 text-xs text-muted flex items-center gap-1 self-end"
        >
          <ExternalLink size={12} /> {embedUrl ? "새 창에서 보기" : "영상 보기"}
        </a>
      )}

      {!lesson.concept && (
        <p className="text-sm text-muted rounded-xl border border-border p-3">
          이 세션의 콘텐츠는 아직 준비 중이에요. 곧 채워질 예정이에요.
        </p>
      )}

      <Section title="개념 · Concept">{lesson.concept}</Section>

      {lesson.key_scriptures && (
        <section className="rounded-xl bg-accent-bg p-3.5">
          <p className="text-xs font-medium text-accent-fg mb-1.5">핵심 말씀 · Key Scriptures</p>
          <p className="text-[13px] leading-6 whitespace-pre-line">{lesson.key_scriptures}</p>
        </section>
      )}

      <Section title="본문 탐구 · Deep Dive">{lesson.deep_dive}</Section>

      {lesson.personal_questions && (
        <div className="flex flex-col gap-2.5">
          <Section title="생각해 볼 질문 · Personal Reflection">{lesson.personal_questions}</Section>
          {user && <ReflectionJournal userId={user.id} lessonId={lesson.id} initial={response?.reflection ?? null} />}
        </div>
      )}

      <Section title="소그룹 토론 질문 · Group Discussion">{lesson.group_questions}</Section>

      {lesson.action_step && user && (
        <ActionStepCard
          userId={user.id}
          lessonId={lesson.id}
          actionStep={lesson.action_step}
          initialDone={response?.action_done ?? false}
          initialNote={response?.action_note ?? null}
          initialPhotoPath={response?.action_photo_path ?? null}
          initialPhotoUrl={photoUrl}
        />
      )}

      {feedback && feedback.length > 0 && (
        <section id="feedback" className="flex flex-col gap-2 scroll-mt-16">
          <p className="text-xs font-medium text-muted flex items-center gap-1.5">
            <MessageCircle size={13} /> 리더의 피드백
          </p>
          {feedback.map((f) => (
            <div key={f.id} className="rounded-xl bg-accent-bg px-3 py-2.5">
              <p className="text-[11px] text-accent-fg">
                {f.profiles?.full_name ?? "리더"} · {formatDate(f.created_at)}
              </p>
              <p className="text-[13px] leading-6 whitespace-pre-line mt-0.5">{f.body}</p>
            </div>
          ))}
        </section>
      )}

      <Section title="기도 · Prayer">{lesson.prayer}</Section>

      <MarkCompleteButton lessonId={lesson.id} userId={user?.id ?? null} initialCompleted={completed} />

      {(prev || next) && (
        <nav className="grid grid-cols-2 gap-2" aria-label="세션 이동">
          {prev ? (
            <Link href={lessonHref(prev.lesson)} className="rounded-xl border border-border bg-card p-2.5 min-w-0">
              <span className="text-[11px] text-muted flex items-center gap-0.5">
                <ChevronLeft size={12} /> 이전
              </span>
              <span className="block text-xs truncate mt-0.5">{prev.lesson.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={lessonHref(next.lesson)} className="rounded-xl border border-border bg-card p-2.5 text-right min-w-0">
              <span className="text-[11px] text-muted flex items-center gap-0.5 justify-end">
                다음 <ChevronRight size={12} />
              </span>
              <span className="block text-xs truncate mt-0.5">{next.lesson.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
