import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { buildIcsCalendar } from "@/lib/ics";
import type { CalendarEvent } from "@/lib/types/database";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  const token = rawToken.replace(/\.ics$/i, "");

  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = createServiceRoleClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, org_id, full_name")
    .eq("calendar_token", token)
    .maybeSingle();

  if (!profile) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", profile.id);
  const courseIds = new Set((enrollments ?? []).map((e) => e.course_id as string));

  const { data: eventsRaw } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("org_id", profile.org_id)
    .returns<CalendarEvent[]>();

  const events = (eventsRaw ?? []).filter(
    (event) =>
      event.scope === "org" ||
      (event.scope === "course" && event.course_id && courseIds.has(event.course_id)) ||
      (event.scope === "personal" && event.owner_id === profile.id),
  );

  const ics = buildIcsCalendar(
    events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      allDay: event.all_day,
      createdAt: event.created_at,
    })),
    `Pathly — ${profile.full_name}`,
  );

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="pathly.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
