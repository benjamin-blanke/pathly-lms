import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { createModule, createLesson, enrollSelf, removeEnrollment } from "@/app/actions/courses";
import { createResource, deleteResource } from "@/app/actions/resources";
import type { Assignment, CourseModule, CourseResource, Lesson, Profile } from "@/lib/types/database";

type EnrollmentWithProfile = {
  id: string;
  role: string;
  user_id: string;
  profile: Profile | null;
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();

  if (!course) {
    notFound();
  }

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle();

  const isTeacher = profile.role === "admin" || enrollment?.role === "teacher";
  const isMember = Boolean(enrollment) || profile.role === "admin";

  const [{ data: modules }, { data: lessonsData }, { data: resourcesData }, { data: rosterRaw }, { data: assignments }] =
    await Promise.all([
      supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", courseId)
        .order("position")
        .returns<CourseModule[]>(),
      supabase
        .from("lessons")
        .select("*")
        .order("position")
        .returns<Lesson[]>(),
      supabase
        .from("course_resources")
        .select("*")
        .order("position")
        .returns<CourseResource[]>(),
      supabase
        .from("enrollments")
        .select("id, role, user_id, profile:profiles(*)")
        .eq("course_id", courseId),
      supabase
        .from("assignments")
        .select("*")
        .eq("course_id", courseId)
        .order("due_at", { ascending: true, nullsFirst: false })
        .returns<Assignment[]>(),
    ]);

  const roster = (rosterRaw ?? []) as unknown as EnrollmentWithProfile[];
  const lessonsByModule = new Map<string, Lesson[]>();
  for (const lesson of lessonsData ?? []) {
    const list = lessonsByModule.get(lesson.module_id) ?? [];
    list.push(lesson);
    lessonsByModule.set(lesson.module_id, list);
  }
  const resourcesByModule = new Map<string, CourseResource[]>();
  for (const resource of resourcesData ?? []) {
    const list = resourcesByModule.get(resource.module_id) ?? [];
    list.push(resource);
    resourcesByModule.set(resource.module_id, list);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link href="/courses" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Back to courses
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {course.code || "Course"}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{course.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{course.description}</p>
          </div>
          {!isMember && profile.role === "student" && (
            <form action={enrollSelf.bind(null, courseId)}>
              <button
                type="submit"
                className="btn-primary shrink-0"
              >
                Enroll
              </button>
            </form>
          )}
        </div>
      </div>

      {!isMember ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Enroll in this course to see its content.
        </p>
      ) : (
        <>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Modules</h2>
            </div>

            <div className="space-y-4">
              {(modules ?? []).map((module) => (
                <div key={module.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{module.title}</h3>
                  <ul className="mt-2 space-y-2">
                    {(lessonsByModule.get(module.id) ?? []).map((lesson) => (
                      <li key={lesson.id} className="rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-950">
                        <p className="font-medium text-slate-900 dark:text-white">{lesson.title}</p>
                        {lesson.content && (
                          <p className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{lesson.content}</p>
                        )}
                      </li>
                    ))}
                  </ul>

                  {(resourcesByModule.get(module.id) ?? []).length > 0 && (
                    <ul className="mt-2 space-y-2">
                      {(resourcesByModule.get(module.id) ?? []).map((resource) => (
                        <li
                          key={resource.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800"
                        >
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {resource.type === "file" ? "📎" : "🔗"} {resource.title}
                          </a>
                          {isTeacher && (
                            <form action={deleteResource.bind(null, courseId, resource.id)}>
                              <button type="submit" className="text-xs text-red-600 hover:underline dark:text-red-400">
                                Remove
                              </button>
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {isTeacher && (
                    <div className="mt-3 flex flex-wrap gap-4">
                      <details>
                        <summary className="cursor-pointer text-sm font-medium text-slate-500 dark:text-slate-400">
                          + Add lesson
                        </summary>
                        <form action={createLesson.bind(null, courseId, module.id)} className="mt-2 space-y-2">
                          <input
                            type="text"
                            name="title"
                            placeholder="Lesson title"
                            required
                            className="input-field w-full"
                          />
                          <textarea
                            name="content"
                            placeholder="Lesson content"
                            rows={3}
                            className="input-field w-full"
                          />
                          <button
                            type="submit"
                            className="btn-primary"
                          >
                            Add lesson
                          </button>
                        </form>
                      </details>

                      <details>
                        <summary className="cursor-pointer text-sm font-medium text-slate-500 dark:text-slate-400">
                          + Add resource
                        </summary>
                        <form action={createResource.bind(null, courseId, module.id)} className="mt-2 space-y-2">
                          <input
                            type="text"
                            name="title"
                            placeholder="Resource title"
                            required
                            className="input-field w-full"
                          />
                          <div className="flex gap-2">
                            <select
                              name="type"
                              className="input-field px-2 py-2"
                            >
                              <option value="link">Link</option>
                              <option value="file">File</option>
                            </select>
                            <input
                              type="url"
                              name="url"
                              placeholder="https://…"
                              required
                              className="input-field flex-1"
                            />
                          </div>
                          <button
                            type="submit"
                            className="btn-primary"
                          >
                            Add resource
                          </button>
                        </form>
                      </details>
                    </div>
                  )}
                </div>
              ))}

              {(!modules || modules.length === 0) && (
                <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No modules yet.
                </p>
              )}

              {isTeacher && (
                <details className="rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                    + Add module
                  </summary>
                  <form action={createModule.bind(null, courseId)} className="mt-2 flex gap-2">
                    <input
                      type="text"
                      name="title"
                      placeholder="Module title"
                      required
                      className="input-field flex-1"
                    />
                    <button
                      type="submit"
                      className="btn-primary"
                    >
                      Add
                    </button>
                  </form>
                </details>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Assignments</h2>
              {isTeacher && (
                <Link
                  href={`/courses/${courseId}/assignments/new`}
                  className="text-sm font-medium text-slate-900 underline dark:text-white"
                >
                  + New assignment
                </Link>
              )}
            </div>
            {(!assignments || assignments.length === 0) ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No assignments yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                {assignments.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/courses/${courseId}/assignments/${a.id}`}
                      className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{a.title}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {a.points_possible} pts
                          {a.due_at ? ` · due ${new Date(a.due_at).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Roster</h2>
            <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {roster.map((member) => (
                <li key={member.id} className="flex items-center justify-between p-3 text-sm">
                  <span className="text-slate-900 dark:text-white">
                    {member.profile?.full_name ?? "Unknown"}{" "}
                    <span className="text-slate-500 dark:text-slate-400">· {member.role}</span>
                  </span>
                  {isTeacher && member.user_id !== userId && (
                    <form action={removeEnrollment.bind(null, courseId, member.id)}>
                      <button type="submit" className="text-xs text-red-600 hover:underline dark:text-red-400">
                        Remove
                      </button>
                    </form>
                  )}
                </li>
              ))}
              {roster.length === 0 && (
                <li className="p-3 text-sm text-slate-500 dark:text-slate-400">No members yet.</li>
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
