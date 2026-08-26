interface IcsEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  createdAt: string;
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  // RFC5545 requires folding lines longer than 75 octets; keep it simple
  // and fold on character count, which is safe for our ASCII-ish content.
  if (line.length <= 75) return line;
  let result = line.slice(0, 75);
  let rest = line.slice(75);
  while (rest.length > 0) {
    result += "\r\n " + rest.slice(0, 74);
    rest = rest.slice(74);
  }
  return result;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatDateOnly(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10).replace(/-/g, "");
}

export function buildIcsCalendar(events: IcsEvent[], calendarName: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pathly//Calendar//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id}@pathly`);
    lines.push(`DTSTAMP:${formatDateTime(event.createdAt)}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(event.startsAt)}`);
      lines.push(`DTEND;VALUE=DATE:${formatDateOnly(event.endsAt)}`);
    } else {
      lines.push(`DTSTART:${formatDateTime(event.startsAt)}`);
      lines.push(`DTEND:${formatDateTime(event.endsAt)}`);
    }
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
