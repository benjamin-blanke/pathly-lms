"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireSuperadmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: superadmin } = await supabase
    .from("superadmins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!superadmin) redirect("/dashboard");

  return { supabase, userId: user.id };
}

export async function deleteOrganization(orgId: string) {
  const { supabase } = await requireSuperadmin();
  await supabase.from("organizations").delete().eq("id", orgId);
  revalidatePath("/superadmin");
}
