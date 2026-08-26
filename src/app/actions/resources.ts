"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ResourceType } from "@/lib/types/database";

export async function createResource(courseId: string, moduleId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "link") as ResourceType;
  if (!title || !url) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("course_resources")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);

  await supabase.from("course_resources").insert({
    module_id: moduleId,
    title,
    url,
    description,
    type: type === "file" ? "file" : "link",
    position: count ?? 0,
  });

  revalidatePath(`/courses/${courseId}`);
}

export async function deleteResource(courseId: string, resourceId: string) {
  const supabase = await createClient();
  await supabase.from("course_resources").delete().eq("id", resourceId);
  revalidatePath(`/courses/${courseId}`);
}
