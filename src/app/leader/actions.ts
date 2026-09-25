"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Every write below is permission-checked by Row Level Security in the database
// (leaders: own group members only; admins: everyone).

function safePath(v: FormDataEntryValue | null, fallback: string) {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
}

export async function addFeedback(formData: FormData) {
  const responseId = String(formData.get("response_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const path = safePath(formData.get("path"), "/leader");
  if (!responseId || !body) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("response_feedback").insert({ response_id: responseId, body, author_id: user.id });
  revalidatePath(path);
}

export async function deleteFeedback(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const path = safePath(formData.get("path"), "/leader");
  const supabase = await createClient();
  await supabase.from("response_feedback").delete().eq("id", id);
  revalidatePath(path);
}

export async function createAnnouncement(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;
  const groupId = String(formData.get("group_id") ?? "") || null;
  const pinned = formData.get("pinned") === "on";
  const path = safePath(formData.get("path"), "/leader");
  if (!title) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("announcements").insert({ title, body, group_id: groupId, pinned, author_id: user.id });
  revalidatePath(path);
  revalidatePath("/home");
}

export async function deleteAnnouncement(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const path = safePath(formData.get("path"), "/leader");
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", id);
  revalidatePath(path);
  revalidatePath("/home");
}

export async function toggleMemberAttendance(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  const present = formData.get("present") === "true";
  const path = safePath(formData.get("path"), "/leader");
  const supabase = await createClient();
  if (present) {
    await supabase.from("attendance").delete().eq("event_id", eventId).eq("user_id", userId);
  } else {
    await supabase.from("attendance").insert({ event_id: eventId, user_id: userId });
  }
  revalidatePath(path);
}
