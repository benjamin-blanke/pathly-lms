import Link from "next/link";
import { requireProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { Course } from "@/lib/types/database";

export default async function CoursesPage() {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  let courses: Course[] = [];
  let enrolledIds = new Set<string>();

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
    courses = (data ?? []).map((row) => row.course as unknown as Course).filter(Boolean);
    enrolledIds = new Set(courses.map((c) => c.id));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Courses</h1>
        {(profile.role === "admin" || profile.role === "teacher") && (
          <Link
            href="/courses/new"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900"
          >
            + New course
          </Link>
        )}
      </div>

      {courses.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No courses yet.
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
              {profile.role === "admin" && !enrolledIds.has(course.id) && (
                <p className="mt-2 text-xs text-slate-400">Not enrolled — visible as admin</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
