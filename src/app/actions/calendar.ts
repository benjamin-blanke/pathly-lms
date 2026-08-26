"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/auth";
import type { CalendarScope } from "@/lib/types/database";

export async function createCalendarEvent(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
  const endsAtRaw = String(formData.get("endsAt") ?? "").trim();
  const allDay = formData.get("allDay") === "on";
  const scope = String(formData.get("scope") ?? "personal") as CalendarScope;
  const courseId = String(formData.get("courseId") ?? "").trim();

  if (!title || !startsAtRaw || !endsAtRaw) {
    redirect(`/calendar/new?error=${encodeURIComponent("Title, start, and end are required")}`);
  }

  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("calendar_events").insert({
    org_id: profile.org_id,
    scope,
    course_id: scope === "course" ? courseId || null : null,
    owner_id: scope === "personal" ? userId : null,
    title,
    description,
    location,
    starts_at: new Date(startsAtRaw).toISOString(),
    ends_at: new Date(endsAtRaw).toISOString(),
    all_day: allDay,
    created_by: userId,
  });

  if (error) {
    redirect(`/calendar/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/calendar");
}

export async function deleteCalendarEvent(eventId: string) {
  const supabase = await createClient();
  await supabase.from("calendar_events").delete().eq("id", eventId);
  revalidatePath("/calendar");
}

export async function regenerateCalendarToken() {
  const { userId } = await requireProfile();
  const supabase = await createClient();
  await supabase.from("profiles").update({ calendar_token: crypto.randomUUID() }).eq("id", userId);
  revalidatePath("/calendar");
}
