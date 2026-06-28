import type { Settings } from "@/types";

export type TimeSlot = { start: Date; end: Date; free: boolean };

export function computeSlots(
  date: Date,
  durationMinutes: number,
  settings: Settings,
  busyRanges: { start: Date; end: Date }[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [startH, startM] = settings.working_hours_start.split(":").map(Number);
  const [endH, endM] = settings.working_hours_end.split(":").map(Number);

  const dayStart = new Date(date);
  dayStart.setHours(startH, startM, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(endH, endM, 0, 0);

  let cursor = new Date(dayStart);

  while (cursor < dayEnd) {
    const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
    const bufferEnd = new Date(slotEnd.getTime() + settings.buffer_minutes * 60_000);

    if (bufferEnd > dayEnd) break;

    const overlaps = busyRanges.some(
      busy => cursor < busy.end && bufferEnd > busy.start
    );

    slots.push({ start: new Date(cursor), end: slotEnd, free: !overlaps });
    cursor = new Date(cursor.getTime() + 30 * 60_000);
  }

  return slots;
}
