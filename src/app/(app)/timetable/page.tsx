import { requireProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createPeriod,
  createRoom,
  createTimetableEntry,
  deletePeriod,
  deleteRoom,
  deleteTimetableEntry,
} from "@/app/actions/timetable";
import { WEEKDAYS } from "@/lib/types/database";
import type { Course, Period, Room, TimetableEntry, Weekday } from "@/lib/types/database";

type EntryWithNames = TimetableEntry & {
  course: Pick<Course, "id" | "title" | "code"> | null;
  room: Pick<Room, "id" | "name"> | null;
};

const GRID_DAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();
  const isAdmin = profile.role === "admin";

  const [{ data: periods }, { data: rooms }, { data: entriesRaw }] = await Promise.all([
    supabase.from("periods").select("*").eq("org_id", profile.org_id).order("position").returns<Period[]>(),
    supabase.from("rooms").select("*").eq("org_id", profile.org_id).order("name").returns<Room[]>(),
    supabase
      .from("timetable_entries")
      .select("*, course:courses(id, title, code), room:rooms(id, name)")
      .eq("org_id", profile.org_id),
  ]);

  let entries = (entriesRaw ?? []) as unknown as EntryWithNames[];

  let myCourseIds: Set<string> | null = null;
  if (!isAdmin) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("user_id", userId);
    myCourseIds = new Set((enrollments ?? []).map((e) => e.course_id));
    entries = entries.filter((e) => myCourseIds!.has(e.course_id));
  }

  let teachableCourses: Course[] = [];
  if (isAdmin) {
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

  const entriesByCell = new Map<string, EntryWithNames[]>();
  for (const entry of entries) {
    const key = `${entry.weekday}:${entry.period_id}`;
    const list = entriesByCell.get(key) ?? [];
    list.push(entry);
    entriesByCell.set(key, list);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Timetable</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {isAdmin ? "The full school timetable." : "Your weekly schedule."}
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {!periods || periods.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No periods have been set up yet{isAdmin ? " — add one below." : "."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900">
                <th className="w-32 border-b border-slate-200 p-2 text-left font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  Period
                </th>
                {GRID_DAYS.map((day) => (
                  <th
                    key={day}
                    className="border-b border-slate-200 p-2 text-left font-medium capitalize text-slate-500 dark:border-slate-800 dark:text-slate-400"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period.id} className="odd:bg-white even:bg-slate-50 dark:odd:bg-slate-950 dark:even:bg-slate-900">
                  <td className="border-b border-slate-200 p-2 align-top dark:border-slate-800">
                    <p className="font-medium text-slate-900 dark:text-white">{period.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {period.start_time.slice(0, 5)}–{period.end_time.slice(0, 5)}
                    </p>
                  </td>
                  {GRID_DAYS.map((day) => {
                    const cellEntries = entriesByCell.get(`${day}:${period.id}`) ?? [];
                    return (
                      <td key={day} className="border-b border-slate-200 p-2 align-top dark:border-slate-800">
                        <div className="space-y-1">
                          {cellEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="rounded-md bg-blue-50 px-2 py-1 text-xs dark:bg-blue-950"
                            >
                              <p className="font-medium text-slate-900 dark:text-white">
                                {entry.course?.code || entry.course?.title || "Course"}
                              </p>
                              {entry.room && (
                                <p className="text-slate-500 dark:text-slate-400">{entry.room.name}</p>
                              )}
                              {isAdmin && (
                                <form action={deleteTimetableEntry.bind(null, entry.id)}>
                                  <button type="submit" className="mt-0.5 text-[11px] text-red-600 hover:underline dark:text-red-400">
                                    Remove
                                  </button>
                                </form>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && (
        <details className="rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
          <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
            Manage timetable
          </summary>

          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Rooms</h3>
              <ul className="mb-3 space-y-1 text-sm">
                {(rooms ?? []).map((room) => (
                  <li key={room.id} className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300">{room.name}</span>
                    <form action={deleteRoom.bind(null, room.id)}>
                      <button type="submit" className="text-xs text-red-600 hover:underline dark:text-red-400">
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
              <form action={createRoom} className="space-y-2">
                <input
                  type="text"
                  name="name"
                  placeholder="Room name"
                  required
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <input
                  type="number"
                  name="capacity"
                  placeholder="Capacity (optional)"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button type="submit" className="w-full rounded-md bg-slate-900 px-2 py-1.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                  Add room
                </button>
              </form>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Periods</h3>
              <ul className="mb-3 space-y-1 text-sm">
                {(periods ?? []).map((period) => (
                  <li key={period.id} className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300">
                      {period.name} ({period.start_time.slice(0, 5)}–{period.end_time.slice(0, 5)})
                    </span>
                    <form action={deletePeriod.bind(null, period.id)}>
                      <button type="submit" className="text-xs text-red-600 hover:underline dark:text-red-400">
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
              <form action={createPeriod} className="space-y-2">
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Period 1"
                  required
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <div className="flex gap-2">
                  <input
                    type="time"
                    name="startTime"
                    required
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <input
                    type="time"
                    name="endTime"
                    required
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <button type="submit" className="w-full rounded-md bg-slate-900 px-2 py-1.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                  Add period
                </button>
              </form>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Add a slot</h3>
              <form action={createTimetableEntry} className="space-y-2">
                <select
                  name="courseId"
                  required
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">Course</option>
                  {teachableCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <select
                  name="weekday"
                  required
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <select
                  name="periodId"
                  required
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">Period</option>
                  {(periods ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  name="roomId"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">Room (optional)</option>
                  {(rooms ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <button type="submit" className="w-full rounded-md bg-slate-900 px-2 py-1.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                  Add to timetable
                </button>
              </form>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
