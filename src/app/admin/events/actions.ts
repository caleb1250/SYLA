"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { appLocalToUtcIso } from "@/lib/date";
import type { EventType } from "@/lib/types";

export async function createEvent(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const event_type = String(formData.get("event_type") ?? "general") as EventType;
  const startsLocal = String(formData.get("starts_at") ?? "");
  const location = String(formData.get("location") ?? "").trim() || null;
  if (!title || !startsLocal) return;

  // The form's datetime-local value is Eastern wall-clock time; the server runs in UTC.
  const starts_at = appLocalToUtcIso(startsLocal);

  const supabase = await createClient();
  await supabase.from("events").insert({ title, event_type, starts_at, location });
  revalidatePath("/admin/events");
}

export async function toggleAttendance(formData: FormData) {
  const eventId = String(formData.get("event_id"));
  const userId = String(formData.get("user_id"));
  const currentlyPresent = formData.get("present") === "true";
  const supabase = await createClient();

  if (currentlyPresent) {
    await supabase.from("attendance").delete().eq("event_id", eventId).eq("user_id", userId);
  } else {
    await supabase.from("attendance").insert({ event_id: eventId, user_id: userId });
  }
  revalidatePath(`/admin/events/${eventId}`);
}
