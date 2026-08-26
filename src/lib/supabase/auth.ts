import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

export async function getCurrentProfile(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { userId: user.id, email: user.email ?? null, profile: profile as Profile | null };
}

export async function requireProfile(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile;
}> {
  const { userId, email, profile } = await getCurrentProfile();

  if (!profile) {
    redirect("/onboarding");
  }

  return { userId, email, profile };
}
