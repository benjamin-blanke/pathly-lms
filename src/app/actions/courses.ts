"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/auth";

export async function createCourse(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title) {
    redirect(`/courses/new?error=${encodeURIComponent("Title is required")}`);
  }

  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const { data: course, error } = await supabase
    .from("courses")
    .insert({
      org_id: profile.org_id,
      title,
      code,
      description,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !course) {
    redirect(`/courses/new?error=${encodeURIComponent(error?.message ?? "Could not create course")}`);
  }

  redirect(`/courses/${course!.id}`);
}

export async function createModule(courseId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("course_modules")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  await supabase.from("course_modules").insert({
    course_id: courseId,
    title,
    position: count ?? 0,
  });

  revalidatePath(`/courses/${courseId}`);
}

export async function createLesson(courseId: string, moduleId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);

  await supabase.from("lessons").insert({
    module_id: moduleId,
    title,
    content,
    position: count ?? 0,
  });

  revalidatePath(`/courses/${courseId}`);
}

export async function enrollSelf(courseId: string) {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  await supabase.from("enrollments").insert({
    course_id: courseId,
    user_id: userId,
    role: "student",
  });

  revalidatePath(`/courses/${courseId}`);
}

export async function removeEnrollment(courseId: string, enrollmentId: string) {
  const supabase = await createClient();
  await supabase.from("enrollments").delete().eq("id", enrollmentId);
  revalidatePath(`/courses/${courseId}`);
}
