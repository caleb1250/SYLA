"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createGroup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("groups").insert({ name });
  revalidatePath("/admin/groups");
}

export async function setMemberGroup(formData: FormData) {
  const userId = String(formData.get("user_id"));
  const groupId = String(formData.get("group_id") || "");
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ group_id: groupId || null })
    .eq("id", userId);
  revalidatePath("/admin/groups");
}

export async function setGroupLeader(formData: FormData) {
  const groupId = String(formData.get("group_id"));
  const leaderId = String(formData.get("leader_id") || "");
  const supabase = await createClient();
  await supabase
    .from("groups")
    .update({ leader_id: leaderId || null })
    .eq("id", groupId);
  revalidatePath("/admin/groups");
}
