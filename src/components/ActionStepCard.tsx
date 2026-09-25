"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAutosave, SaveStatusText } from "@/components/useAutosave";
import { Camera, CheckCircle2, Circle, Loader2, Trash2 } from "lucide-react";

const BUCKET = "action-photos";
const MAX_EDGE = 1600;

/** Downscale + re-encode to JPEG so phone photos (incl. iPhone HEIC) upload small and display everywhere. */
async function toJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.82)
  );
}

/** The session's Action Step with "I did it" + a short note and an optional photo as proof. */
export default function ActionStepCard({
  userId,
  lessonId,
  actionStep,
  initialDone,
  initialNote,
  initialPhotoPath,
  initialPhotoUrl,
}: {
  userId: string;
  lessonId: string;
  actionStep: string;
  initialDone: boolean;
  initialNote: string | null;
  initialPhotoPath: string | null;
  initialPhotoUrl: string | null;
}) {
  const supabase = createClient();
  const [done, setDone] = useState(initialDone);
  const [note, setNote] = useState(initialNote ?? "");
  const [photoPath, setPhotoPath] = useState(initialPhotoPath);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const upsert = useCallback(
    async (fields: Record<string, unknown>) => {
      const { error } = await supabase
        .from("lesson_responses")
        .upsert({ user_id: userId, lesson_id: lessonId, ...fields }, { onConflict: "user_id,lesson_id" });
      return !error;
    },
    [supabase, userId, lessonId]
  );

  const saveNote = useCallback(() => upsert({ action_note: note.trim() ? note : null }), [upsert, note]);
  const { status, savedAt, schedule, flush } = useAutosave(saveNote);

  async function toggleDone() {
    const next = !done;
    setDone(next);
    const ok = await upsert({ action_done: next });
    if (!ok) setDone(!next);
  }

  async function handleFile(file: File) {
    setPhotoError(null);
    setUploading(true);
    try {
      const blob = await toJpeg(file);
      const path = `${userId}/${lessonId}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const ok = await upsert({ action_photo_path: path, action_done: true });
      if (!ok) throw new Error("save failed");
      if (photoPath) await supabase.storage.from(BUCKET).remove([photoPath]);
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
      setPhotoPath(path);
      setPhotoUrl(signed?.signedUrl ?? null);
      setDone(true);
    } catch {
      setPhotoError("사진을 올리지 못했어요. 다른 사진으로 다시 시도해주세요.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removePhoto() {
    if (!photoPath) return;
    const ok = await upsert({ action_photo_path: null });
    if (!ok) return;
    await supabase.storage.from(BUCKET).remove([photoPath]);
    setPhotoPath(null);
    setPhotoUrl(null);
  }

  return (
    <div className="rounded-xl bg-gold-bg p-3.5 flex flex-col gap-3">
      <div>
        <p className="text-xs font-medium text-gold-fg mb-1.5">금주의 Action Step</p>
        <p className="text-[13px] leading-6 whitespace-pre-line">{actionStep}</p>
      </div>

      <button
        onClick={toggleDone}
        className="h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border"
        style={{
          background: done ? "var(--gold)" : "var(--card)",
          color: done ? "white" : "var(--foreground)",
          borderColor: done ? "var(--gold)" : "var(--border)",
        }}
        aria-pressed={done}
      >
        {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
        {done ? "실천했어요" : "실천 완료 체크"}
      </button>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor={`action-note-${lessonId}`} className="text-xs text-gold-fg">
            실천 기록 (선택)
          </label>
          <SaveStatusText status={status} savedAt={savedAt} />
        </div>
        <textarea
          id={`action-note-${lessonId}`}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            schedule();
          }}
          onBlur={flush}
          rows={3}
          placeholder="어떻게 실천했는지, 무엇을 느꼈는지 짧게 남겨보세요."
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm leading-6 outline-none focus:border-accent resize-y"
        />
      </div>

      <div className="flex flex-col gap-2">
        {photoUrl && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
            <img src={photoUrl} alt="Action Step 인증 사진" className="w-full max-h-72 object-cover rounded-lg" />
            <button
              onClick={removePhoto}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
              aria-label="사진 삭제"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="h-9 rounded-lg text-xs flex items-center justify-center gap-1.5 border border-dashed border-gold text-gold-fg disabled:opacity-60"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {uploading ? "올리는 중..." : photoUrl ? "사진 바꾸기" : "인증 사진 올리기"}
        </button>
        {photoError && <p className="text-xs text-red-600">{photoError}</p>}
      </div>
    </div>
  );
}
