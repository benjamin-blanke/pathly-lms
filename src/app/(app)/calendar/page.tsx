import Link from "next/link";
import { headers } from "next/headers";
import { requireProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteCalendarEvent } from "@/app/actions/calendar";
import type { CalendarEvent, Course } from "@/lib/types/database";

type EventWithCourse = CalendarEvent & { course: Pick<Course, "title"> | null };

const SCOPE_STYLES: Record<string, string> = {
  org: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  course: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  personal: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

function parseMonth(monthParam: string | undefined): Date {
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [year, month] = monthParam.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function formatMonthParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildGrid(monthStart: Date): Date[] {
  const firstWeekday = (monthStart.getDay() + 6) % 7; // 0 = Monday
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - firstWeekday);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const monthStart = parseMonth(month);
  const prevMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  const gridDays = buildGrid(monthStart);
  const gridStart = gridDays[0];
  const gridEnd = new Date(gridDays[41]);
  gridEnd.setDate(gridEnd.getDate() + 1);

  const { data: eventsRaw } = await supabase
    .from("calendar_events")
    .select("*, course:courses(title)")
    .gte("starts_at", gridStart.toISOString())
    .lt("starts_at", gridEnd.toISOString())
    .order("starts_at");

  const events = (eventsRaw ?? []) as unknown as EventWithCourse[];
  const eventsByDay = new Map<string, EventWithCourse[]>();
  for (const event of events) {
    const key = new Date(event.starts_at).toDateString();
    const list = eventsByDay.get(key) ?? [];
    list.push(event);
    eventsByDay.set(key, list);
  }

  const canDelete = (event: EventWithCourse) =>
    event.scope === "personal" || profile.role === "admin" || (event.scope === "course" && profile.role === "teacher");

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const feedUrl = `${protocol}://${host}/calendar/feed/${profile.calendar_token}.ics`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Calendar</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?month=${formatMonthParam(prevMonth)}`}
            className="input-field px-3 py-1.5"
          >
            ← Prev
          </Link>
          <Link
            href={`/calendar?month=${formatMonthParam(nextMonth)}`}
            className="input-field px-3 py-1.5"
          >
            Next →
          </Link>
          <Link
            href="/calendar/new"
            className="btn-primary"
          >
            + New event
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <th key={d} className="border-b border-slate-200 p-2 text-left font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, week) => (
              <tr key={week}>
                {gridDays.slice(week * 7, week * 7 + 7).map((day) => {
                  const inMonth = day.getMonth() === monthStart.getMonth();
                  const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
                  return (
                    <td
                      key={day.toISOString()}
                      className={`h-28 w-[14%] max-w-0 border-b border-slate-200 p-1.5 align-top dark:border-slate-800 ${
                        inMonth ? "" : "bg-slate-50/60 dark:bg-slate-950/60"
                      }`}
                    >
                      <p className={`text-xs ${inMonth ? "text-slate-500 dark:text-slate-400" : "text-slate-300 dark:text-slate-700"}`}>
                        {day.getDate()}
                      </p>
                      <div className="mt-1 space-y-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div key={event.id} className={`truncate rounded px-1.5 py-0.5 text-[11px] ${SCOPE_STYLES[event.scope]}`} title={event.title}>
                            {event.all_day ? "" : `${new Date(event.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} `}
                            {event.title}
                            {canDelete(event) && (
                              <form action={deleteCalendarEvent.bind(null, event.id)} className="inline">
                                <button type="submit" className="ml-1 opacity-60 hover:opacity-100">
                                  ×
                                </button>
                              </form>
                            )}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-[11px] text-slate-400">+{dayEvents.length - 3} more</p>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold text-slate-900 dark:text-white">Subscribe from another app</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Copy this link into Apple Calendar, Google Calendar, or Outlook (&quot;subscribe by URL&quot;) to see your
          Pathly events. It&apos;s a read-only feed — edits still happen here.
        </p>
        <code className="mt-3 block truncate rounded-md bg-slate-100 px-3 py-2 text-xs dark:bg-slate-950">
          {feedUrl}
        </code>
      </section>
    </div>
  );
}
