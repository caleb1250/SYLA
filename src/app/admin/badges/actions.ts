"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createBadge(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("badges").insert({ name, description });
  revalidatePath("/admin/badges");
}

export async function toggleBadge(formData: FormData) {
  const badgeId = String(formData.get("badge_id"));
  const userId = String(formData.get("user_id"));
  const awarded = formData.get("awarded") === "true";
  const supabase = await createClient();

  if (awarded) {
    await supabase.from("user_badges").delete().eq("badge_id", badgeId).eq("user_id", userId);
  } else {
    await supabase.from("user_badges").insert({ badge_id: badgeId, user_id: userId });
  }
  revalidatePath(`/admin/badges/${badgeId}`);
}
