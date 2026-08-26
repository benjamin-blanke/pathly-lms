"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/auth";
import type { Weekday } from "@/lib/types/database";

export async function createRoom(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  if (!name) return;

  const { profile } = await requireProfile();
  const supabase = await createClient();

  await supabase.from("rooms").insert({
    org_id: profile.org_id,
    name,
    capacity: capacityRaw ? Number(capacityRaw) : null,
  });

  revalidatePath("/timetable");
}

export async function deleteRoom(roomId: string) {
  const supabase = await createClient();
  await supabase.from("rooms").delete().eq("id", roomId);
  revalidatePath("/timetable");
}

export async function createPeriod(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  if (!name || !startTime || !endTime) return;

  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { count } = await supabase
    .from("periods")
    .select("id", { count: "exact", head: true })
    .eq("org_id", profile.org_id);

  await supabase.from("periods").insert({
    org_id: profile.org_id,
    name,
    start_time: startTime,
    end_time: endTime,
    position: count ?? 0,
  });

  revalidatePath("/timetable");
}

export async function deletePeriod(periodId: string) {
  const supabase = await createClient();
  await supabase.from("periods").delete().eq("id", periodId);
  revalidatePath("/timetable");
}

export async function createTimetableEntry(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "").trim();
  const periodId = String(formData.get("periodId") ?? "").trim();
  const weekday = String(formData.get("weekday") ?? "").trim() as Weekday;
  const roomId = String(formData.get("roomId") ?? "").trim();
  const teacherId = String(formData.get("teacherId") ?? "").trim();

  if (!courseId || !periodId || !weekday) {
    redirect("/timetable?error=" + encodeURIComponent("Course, period, and weekday are required"));
  }

  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("timetable_entries").insert({
    org_id: profile.org_id,
    course_id: courseId,
    period_id: periodId,
    weekday,
    room_id: roomId || null,
    teacher_id: teacherId || null,
  });

  if (error) {
    const message = error.code === "23505" ? "That room or teacher is already booked for this slot" : error.message;
    redirect(`/timetable?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/timetable");
}

export async function deleteTimetableEntry(entryId: string) {
  const supabase = await createClient();
  await supabase.from("timetable_entries").delete().eq("id", entryId);
  revalidatePath("/timetable");
}
