"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/auth";

export async function createAnnouncement(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const courseId = String(formData.get("courseId") ?? "").trim();

  if (!title) return;

  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  await supabase.from("announcements").insert({
    org_id: profile.org_id,
    course_id: courseId || null,
    author_id: userId,
    title,
    body,
  });

  revalidatePath("/announcements");
  revalidatePath("/dashboard");
}
