import Link from "next/link";
import { requireProfile } from "@/lib/supabase/auth";
import { createAssignment } from "@/app/actions/assignments";

export default async function NewAssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { courseId } = await params;
  const { error } = await searchParams;
  await requireProfile();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href={`/courses/${courseId}`} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Back to course
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">New assignment</h1>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <form
        action={createAssignment.bind(null, courseId)}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
          <input
            type="text"
            name="title"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
          <textarea
            name="description"
            rows={4}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Due date</label>
            <input
              type="datetime-local"
              name="dueAt"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Points</label>
            <input
              type="number"
              name="points"
              defaultValue={100}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900"
        >
          Create assignment
        </button>
      </form>
    </div>
  );
}
