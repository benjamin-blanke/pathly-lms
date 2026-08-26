import Link from "next/link";
import { requireProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { Announcement, Course } from "@/lib/types/database";

export default async function DashboardPage() {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  let courses: Course[] = [];

  if (profile.role === "admin") {
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false });
    courses = data ?? [];
  } else {
    const { data } = await supabase
      .from("enrollments")
      .select("course:courses(*)")
      .eq("user_id", userId);
    courses = (data ?? [])
      .map((row) => row.course as unknown as Course)
      .filter(Boolean);
  }

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<Announcement[]>();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Welcome back, {profile.full_name.split(" ")[0] || profile.full_name}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {profile.role === "admin"
            ? "Here's what's happening across your organization."
            : "Here's what's happening in your courses."}
        </p>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {profile.role === "admin" ? "All courses" : "Your courses"}
          </h2>
          {(profile.role === "admin" || profile.role === "teacher") && (
            <Link
              href="/courses/new"
              className="text-sm font-medium text-slate-900 underline dark:text-white"
            >
              + New course
            </Link>
          )}
        </div>

        {courses.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {profile.role === "student"
              ? "You're not enrolled in any courses yet."
              : "No courses yet — create the first one."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {course.code || "Course"}
                </p>
                <h3 className="mt-1 font-semibold text-slate-900 dark:text-white">{course.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                  {course.description || "No description yet."}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent announcements</h2>
          <Link href="/announcements" className="text-sm font-medium text-slate-900 underline dark:text-white">
            View all
          </Link>
        </div>

        {!announcements || announcements.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No announcements yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {announcements.map((a) => (
              <li key={a.id} className="p-4">
                <p className="font-medium text-slate-900 dark:text-white">{a.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
