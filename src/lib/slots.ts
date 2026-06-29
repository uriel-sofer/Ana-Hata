import type { Settings } from "@/types";

export type TimeSlot = { start: Date; end: Date; free: boolean };

// Returns a Date representing `hours:minutes` in Israel timezone, as a UTC Date object.
// This works correctly on both the server (UTC) and in the browser (any locale).
function israelTime(date: Date, hours: number, minutes: number): Date {
  // Get the calendar date as seen in Israel
  const israelDate = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jerusalem",
  }).format(date); // "YYYY-MM-DD"

  // Find Israel UTC offset by checking how Israel displays UTC noon
  const noon = new Date(`${israelDate}T12:00:00Z`);
  const noonParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(noon);
  const nH = parseInt(noonParts.find(p => p.type === "hour")!.value);
  const nM = parseInt(noonParts.find(p => p.type === "minute")!.value);
  const offsetMin = nH * 60 + nM - 12 * 60; // e.g. 180 for UTC+3

  // Start from the Israel date at the requested time (treated as UTC), then subtract offset
  const base = new Date(
    `${israelDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00Z`
  );
  base.setTime(base.getTime() - offsetMin * 60_000);
  return base;
}

export function computeSlots(
  date: Date,
  durationMinutes: number,
  settings: Settings,
  busyRanges: { start: Date; end: Date }[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [startH, startM] = settings.working_hours_start.split(":").map(Number);
  const [endH, endM] = settings.working_hours_end.split(":").map(Number);

  const dayStart = israelTime(date, startH, startM);
  const dayEnd = israelTime(date, endH, endM);

  let cursor = new Date(dayStart);

  while (cursor < dayEnd) {
    const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
    const bufferEnd = new Date(slotEnd.getTime() + settings.buffer_minutes * 60_000);

    if (bufferEnd > dayEnd) break;

    const overlapCount = busyRanges.filter(
      busy => cursor < busy.end && bufferEnd > busy.start
    ).length;
    const poolCount = settings.pool_count ?? 1;

    slots.push({ start: new Date(cursor), end: slotEnd, free: overlapCount < poolCount });
    cursor = new Date(cursor.getTime() + 30 * 60_000);
  }

  return slots;
}
