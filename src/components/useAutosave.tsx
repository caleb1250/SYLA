"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/**
 * Debounced autosave. Call `schedule()` on every edit and `flush()` on blur;
 * `save` runs at most once at a time and the latest value always wins.
 */
export function useAutosave(save: () => Promise<boolean>, delayMs = 1200) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  const running = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const run = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (running.current) {
      pending.current = true;
      return;
    }
    running.current = true;
    setStatus("saving");
    let ok = await saveRef.current();
    // Edits that arrived while saving: save again so the latest text wins.
    while (pending.current) {
      pending.current = false;
      ok = await saveRef.current();
    }
    running.current = false;
    setStatus(ok ? "saved" : "error");
    if (ok) setSavedAt(new Date());
  }, []);

  const schedule = useCallback(() => {
    setStatus("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void run(), delayMs);
  }, [delayMs, run]);

  const flush = useCallback(() => {
    if (timer.current) void run();
  }, [run]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { status, savedAt, schedule, flush, saveNow: run };
}

export function SaveStatusText({ status, savedAt }: { status: SaveStatus; savedAt: Date | null }) {
  let text = "";
  if (status === "dirty" || status === "saving") text = "저장 중...";
  else if (status === "saved" && savedAt)
    text = `저장됨 · ${savedAt.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })}`;
  else if (status === "error") text = "저장하지 못했어요. 인터넷 연결을 확인해주세요.";
  return (
    <span className={`text-[11px] ${status === "error" ? "text-red-600" : "text-muted"}`} aria-live="polite">
      {text}
    </span>
  );
}
