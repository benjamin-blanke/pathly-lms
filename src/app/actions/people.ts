"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/auth";
import type { OrgRole } from "@/lib/types/database";

export async function updateMemberRole(memberId: string, formData: FormData) {
  const role = String(formData.get("role") ?? "") as OrgRole;
  if (!["admin", "teacher", "student"].includes(role)) return;

  const { profile } = await requireProfile();
  if (profile.role !== "admin") return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", memberId).eq("org_id", profile.org_id);

  revalidatePath("/people");
}
