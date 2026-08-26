import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { submitAssignment, gradeSubmission } from "@/app/actions/assignments";
import type { Profile, Submission } from "@/lib/types/database";

type SubmissionWithStudent = Submission & { student: Profile | null };

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>;
}) {
  const { courseId, assignmentId } = await params;
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) {
    notFound();
  }

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("role")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle();

  const isTeacher = profile.role === "admin" || enrollment?.role === "teacher";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/courses/${courseId}`} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Back to course
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{assignment.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {assignment.points_possible} pts
          {assignment.due_at ? ` · due ${new Date(assignment.due_at).toLocaleString()}` : ""}
        </p>
        {assignment.description && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
            {assignment.description}
          </p>
        )}
      </div>

      {isTeacher ? (
        <TeacherView courseId={courseId} assignmentId={assignmentId} />
      ) : (
        <StudentView courseId={courseId} assignmentId={assignmentId} studentId={userId} />
      )}
    </div>
  );
}

async function StudentView({
  courseId,
  assignmentId,
  studentId,
}: {
  courseId: string;
  assignmentId: string;
  studentId: string;
}) {
  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("student_id", studentId)
    .maybeSingle();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-semibold text-slate-900 dark:text-white">Your submission</h2>

      {submission?.status === "graded" && (
        <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <p className="font-medium">Score: {submission.score ?? "—"}</p>
          {submission.feedback && <p className="mt-1">{submission.feedback}</p>}
        </div>
      )}

      <form action={submitAssignment.bind(null, courseId, assignmentId)} className="mt-4 space-y-3">
        <textarea
          name="content"
          rows={6}
          placeholder="Write your response..."
          defaultValue={submission?.content ?? ""}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <input
          type="url"
          name="fileUrl"
          placeholder="Link to a file (optional)"
          defaultValue={submission?.file_url ?? ""}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900"
        >
          {submission ? "Update submission" : "Submit"}
        </button>
      </form>
    </div>
  );
}

async function TeacherView({ courseId, assignmentId }: { courseId: string; assignmentId: string }) {
  const supabase = await createClient();
  const { data: submissionsRaw } = await supabase
    .from("submissions")
    .select("*, student:profiles(*)")
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: false, nullsFirst: false });

  const submissions = (submissionsRaw ?? []) as unknown as SubmissionWithStudent[];

  return (
    <div>
      <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Submissions ({submissions.length})</h2>
      <div className="space-y-4">
        {submissions.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No submissions yet.
          </p>
        )}
        {submissions.map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-900 dark:text-white">{s.student?.full_name ?? "Unknown"}</p>
              <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{s.status}</span>
            </div>
            {s.content && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{s.content}</p>}
            {s.file_url && (
              <a href={s.file_url} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-blue-600 underline dark:text-blue-400">
                Attached file
              </a>
            )}

            <form action={gradeSubmission.bind(null, courseId, assignmentId, s.id)} className="mt-3 flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Score</label>
                <input
                  type="number"
                  name="score"
                  defaultValue={s.score ?? ""}
                  className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Feedback</label>
                <input
                  type="text"
                  name="feedback"
                  defaultValue={s.feedback ?? ""}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900"
              >
                Save grade
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
