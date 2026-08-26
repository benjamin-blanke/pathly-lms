"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createOrganization(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!name) {
    redirect(`/onboarding?error=${encodeURIComponent("Organization name is required")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const baseSlug = slugify(name) || "org";
  const slug = `${baseSlug}-${user.id.slice(0, 6)}`;

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name, slug })
    .select("id")
    .single();

  if (orgError || !org) {
    redirect(`/onboarding?error=${encodeURIComponent(orgError?.message ?? "Could not create organization")}`);
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    org_id: org!.id,
    role: "admin",
    full_name: fullName || user.email || "Admin",
  });

  if (profileError) {
    redirect(`/onboarding?error=${encodeURIComponent(profileError.message)}`);
  }

  redirect("/dashboard");
}

export async function joinOrganization(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!slug) {
    redirect(`/onboarding?error=${encodeURIComponent("Organization code is required")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (orgError || !org) {
    redirect(`/onboarding?error=${encodeURIComponent("No organization found with that code")}`);
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    org_id: org!.id,
    role: "student",
    full_name: fullName || user.email || "Member",
  });

  if (profileError) {
    redirect(`/onboarding?error=${encodeURIComponent(profileError.message)}`);
  }

  redirect("/dashboard");
}
