export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { AppointmentCard } from "@/components/calendar/AppointmentCard";

function getWeekDays(anchor: Date): Date[] {
  const days: Date[] = [];
  const sunday = new Date(anchor);
  sunday.setDate(anchor.getDate() - anchor.getDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    days.push(d);
  }
  return days;
}

export default async function TherapistCalendarPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const supabase = createClient();
  const anchor = searchParams.week ? new Date(searchParams.week) : new Date();
  const days = getWeekDays(anchor);
  const weekEnd = new Date(days[6]);
  weekEnd.setHours(23, 59, 59, 999);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, start_time, end_time, status, service:services(name)")
    .gte("start_time", days[0].toISOString())
    .lte("start_time", weekEnd.toISOString())
    .neq("status", "cancelled")
    .order("start_time");

  const prevWeek = new Date(anchor);
  prevWeek.setDate(anchor.getDate() - 7);
  const nextWeek = new Date(anchor);
  nextWeek.setDate(anchor.getDate() + 7);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">לוח שנה</h1>
        <div className="flex gap-2">
          <a
            href={`?week=${prevWeek.toISOString().split("T")[0]}`}
            className="border rounded px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors"
          >
            שבוע קודם
          </a>
          <a
            href={`?week=${nextWeek.toISOString().split("T")[0]}`}
            className="border rounded px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors"
          >
            שבוע הבא
          </a>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayAppts = appointments?.filter(
            a => new Date(a.start_time).toDateString() === day.toDateString()
          );
          return (
            <div key={day.toISOString()} className="border rounded p-2 min-h-32">
              <p className="text-xs font-semibold text-slate-500 mb-2">
                {day.toLocaleDateString("he-IL", { weekday: "short", day: "numeric" })}
              </p>
              <div className="space-y-1">
                {dayAppts?.map(appt => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt as unknown as Parameters<typeof AppointmentCard>[0]["appointment"]}
                    masked
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
