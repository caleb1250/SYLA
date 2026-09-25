"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createCourse(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!title) return;
  const supabase = await createClient();
  const { count } = await supabase.from("courses").select("*", { count: "exact", head: true });
  await supabase.from("courses").insert({ title, description, sort_order: count ?? 0 });
  revalidatePath("/admin/courses");
}

export async function createModule(formData: FormData) {
  const courseId = String(formData.get("course_id"));
  const title = String(formData.get("title") ?? "").trim();
  const theme = String(formData.get("theme") ?? "").trim() || null;
  if (!title || !courseId) return;
  const supabase = await createClient();
  const { count } = await supabase.from("modules").select("*", { count: "exact", head: true }).eq("course_id", courseId);
  await supabase.from("modules").insert({ course_id: courseId, title, theme, sort_order: count ?? 0 });
  revalidatePath("/admin/courses");
}

export async function createLesson(formData: FormData) {
  const moduleId = String(formData.get("module_id"));
  const title = String(formData.get("title") ?? "").trim();
  if (!title || !moduleId) return;
  const supabase = await createClient();
  const { count } = await supabase.from("lessons").select("*", { count: "exact", head: true }).eq("module_id", moduleId);
  await supabase.from("lessons").insert({ module_id: moduleId, title, sort_order: count ?? 0 });
  revalidatePath("/admin/courses");
}

export async function updateLesson(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase
    .from("lessons")
    .update({
      title: String(formData.get("title") ?? ""),
      subtitle: String(formData.get("subtitle") ?? "") || null,
      video_url: String(formData.get("video_url") ?? "").trim() || null,
      concept: String(formData.get("concept") ?? "") || null,
      key_scriptures: String(formData.get("key_scriptures") ?? "") || null,
      deep_dive: String(formData.get("deep_dive") ?? "") || null,
      personal_questions: String(formData.get("personal_questions") ?? "") || null,
      group_questions: String(formData.get("group_questions") ?? "") || null,
      action_step: String(formData.get("action_step") ?? "") || null,
      prayer: String(formData.get("prayer") ?? "") || null,
    })
    .eq("id", id);
  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}
