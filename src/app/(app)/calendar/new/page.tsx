import Link from "next/link";
import { requireProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { createCalendarEvent } from "@/app/actions/calendar";
import type { Course } from "@/lib/types/database";

export default async function NewCalendarEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  let courseOptions: Course[] = [];
  if (profile.role === "admin") {
    const { data } = await supabase.from("courses").select("*").eq("org_id", profile.org_id);
    courseOptions = data ?? [];
  } else if (profile.role === "teacher") {
    const { data } = await supabase
      .from("enrollments")
      .select("course:courses(*)")
      .eq("user_id", userId)
      .eq("role", "teacher");
    courseOptions = (data ?? []).map((row) => row.course as unknown as Course).filter(Boolean);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/calendar" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Back to calendar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">New event</h1>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <form action={createCalendarEvent} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
          <input
            type="text"
            name="title"
            required
            className="input-field mt-1 w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Visibility</label>
          <select
            name="scope"
            defaultValue="personal"
            className="input-field mt-1 w-full"
          >
            <option value="personal">Just me</option>
            {courseOptions.length > 0 && <option value="course">A course</option>}
            {profile.role === "admin" && <option value="org">Whole organization</option>}
          </select>
        </div>

        {courseOptions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Course (if course event)</label>
            <select
              name="courseId"
              className="input-field mt-1 w-full"
            >
              <option value="">—</option>
              {courseOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Starts</label>
            <input
              type="datetime-local"
              name="startsAt"
              required
              className="input-field mt-1 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Ends</label>
            <input
              type="datetime-local"
              name="endsAt"
              required
              className="input-field mt-1 w-full"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" name="allDay" className="rounded border-slate-300" />
          All day
        </label>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Location</label>
          <input
            type="text"
            name="location"
            className="input-field mt-1 w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
          <textarea
            name="description"
            rows={3}
            className="input-field mt-1 w-full"
          />
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
        >
          Create event
        </button>
      </form>
    </div>
  );
}
