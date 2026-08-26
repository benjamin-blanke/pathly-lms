"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/auth";

export async function createAssignment(courseId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dueAtRaw = String(formData.get("dueAt") ?? "").trim();
  const pointsRaw = String(formData.get("points") ?? "100").trim();

  if (!title) {
    redirect(`/courses/${courseId}/assignments/new?error=${encodeURIComponent("Title is required")}`);
  }

  const { userId } = await requireProfile();
  const supabase = await createClient();

  const { data: assignment, error } = await supabase
    .from("assignments")
    .insert({
      course_id: courseId,
      title,
      description,
      due_at: dueAtRaw ? new Date(dueAtRaw).toISOString() : null,
      points_possible: Number(pointsRaw) || 100,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !assignment) {
    redirect(
      `/courses/${courseId}/assignments/new?error=${encodeURIComponent(error?.message ?? "Could not create assignment")}`,
    );
  }

  redirect(`/courses/${courseId}/assignments/${assignment!.id}`);
}

export async function submitAssignment(courseId: string, assignmentId: string, formData: FormData) {
  const content = String(formData.get("content") ?? "").trim();
  const fileUrl = String(formData.get("fileUrl") ?? "").trim();

  const { userId } = await requireProfile();
  const supabase = await createClient();

  await supabase
    .from("submissions")
    .upsert(
      {
        assignment_id: assignmentId,
        student_id: userId,
        content,
        file_url: fileUrl || null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "assignment_id,student_id" },
    );

  revalidatePath(`/courses/${courseId}/assignments/${assignmentId}`);
}

export async function gradeSubmission(
  courseId: string,
  assignmentId: string,
  submissionId: string,
  formData: FormData,
) {
  const scoreRaw = String(formData.get("score") ?? "").trim();
  const feedback = String(formData.get("feedback") ?? "").trim();

  const { userId } = await requireProfile();
  const supabase = await createClient();

  await supabase
    .from("submissions")
    .update({
      score: scoreRaw === "" ? null : Number(scoreRaw),
      feedback,
      status: "graded",
      graded_by: userId,
      graded_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  revalidatePath(`/courses/${courseId}/assignments/${assignmentId}`);
}
