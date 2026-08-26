import { redirect } from "next/navigation";
import Link from "next/link";
import { requireProfile } from "@/lib/supabase/auth";
import { createCourse } from "@/app/actions/courses";

export default async function NewCoursePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { profile } = await requireProfile();

  if (profile.role === "student") {
    redirect("/courses");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/courses" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Back to courses
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">New course</h1>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <form action={createCourse} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
          <input
            type="text"
            name="title"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Course code</label>
          <input
            type="text"
            name="code"
            placeholder="e.g. BIO-101"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
          <textarea
            name="description"
            rows={4}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900"
        >
          Create course
        </button>
      </form>
    </div>
  );
}
