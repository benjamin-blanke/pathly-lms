import { requireProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { createAnnouncement } from "@/app/actions/announcements";
import type { Announcement, Course, Profile } from "@/lib/types/database";

type AnnouncementWithRelations = Announcement & {
  author: Profile | null;
  course: Pick<Course, "id" | "title"> | null;
};

export default async function AnnouncementsPage() {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const { data: announcementsRaw } = await supabase
    .from("announcements")
    .select("*, author:profiles(*), course:courses(id, title)")
    .order("created_at", { ascending: false });

  const announcements = (announcementsRaw ?? []) as unknown as AnnouncementWithRelations[];

  let teachableCourses: Course[] = [];
  if (profile.role === "admin") {
    const { data } = await supabase.from("courses").select("*").eq("org_id", profile.org_id);
    teachableCourses = data ?? [];
  } else if (profile.role === "teacher") {
    const { data } = await supabase
      .from("enrollments")
      .select("course:courses(*)")
      .eq("user_id", userId)
      .eq("role", "teacher");
    teachableCourses = (data ?? []).map((row) => row.course as unknown as Course).filter(Boolean);
  }

  const canPost = profile.role === "admin" || teachableCourses.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Announcements</h1>

      {canPost && (
        <form
          action={createAnnouncement}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <input
            type="text"
            name="title"
            placeholder="Title"
            required
            className="input-field w-full"
          />
          <textarea
            name="body"
            placeholder="What's the announcement?"
            rows={3}
            className="input-field w-full"
          />
          <div className="flex items-center gap-2">
            <select
              name="courseId"
              className="input-field flex-1"
            >
              {profile.role === "admin" && <option value="">Organization-wide</option>}
              {teachableCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="btn-primary"
            >
              Post
            </button>
          </div>
        </form>
      )}

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {announcements.map((a) => (
          <li key={a.id} className="p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-900 dark:text-white">{a.title}</p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {a.course?.title ?? "Organization"}
              </span>
            </div>
            {a.body && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a.body}</p>}
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              {a.author?.full_name ?? "Unknown"} · {new Date(a.created_at).toLocaleString()}
            </p>
          </li>
        ))}
        {announcements.length === 0 && (
          <li className="p-6 text-sm text-slate-500 dark:text-slate-400">No announcements yet.</li>
        )}
      </ul>
    </div>
  );
}
