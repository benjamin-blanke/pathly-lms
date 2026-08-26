"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/auth";

export async function updateOrgSettings(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const { profile } = await requireProfile();
  if (profile.role !== "admin") return;

  const supabase = await createClient();
  await supabase.from("organizations").update({ name }).eq("id", profile.org_id);

  revalidatePath("/admin");
}
