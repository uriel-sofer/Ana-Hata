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

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const supabase = createClient();
  const anchor = searchParams.week ? new Date(searchParams.week) : new Date();
  const days = getWeekDays(anchor);

  const weekStart = days[0];
  const weekEnd = new Date(days[6]);
  weekEnd.setHours(23, 59, 59, 999);

  const [{ data: appointments }, { count: pendingCount }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, client:clients(full_name), service:services(name)")
      .gte("start_time", weekStart.toISOString())
      .lte("start_time", weekEnd.toISOString())
      .neq("status", "cancelled")
      .order("start_time"),
    supabase
      .from("booking_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const prevWeek = new Date(anchor);
  prevWeek.setDate(anchor.getDate() - 7);
  const nextWeek = new Date(anchor);
  nextWeek.setDate(anchor.getDate() + 7);

  return (
    <div>
      {(pendingCount ?? 0) > 0 && (
        <a
          href="/approvals"
          className="flex items-center gap-2 mb-4 bg-amber-50 border border-amber-300 text-amber-800 rounded-lg px-4 py-2 text-sm hover:bg-amber-100 transition-colors"
        >
          <span className="font-bold text-base">{pendingCount}</span>
          בקשות הזמנה ממתינות לאישור ←
        </a>
      )}
      <div className="flex items-center justify-between mb-4">
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
          const dayAppts = appointments?.filter(a => {
            const d = new Date(a.start_time);
            return d.toDateString() === day.toDateString();
          });

          return (
            <div key={day.toISOString()} className="border rounded p-2 min-h-32">
              <p className="text-xs font-semibold text-slate-500 mb-2">
                {day.toLocaleDateString("he-IL", { weekday: "short", day: "numeric" })}
              </p>
              <div className="space-y-1">
                {dayAppts?.map(appt => (
                  <AppointmentCard key={appt.id} appointment={appt as Parameters<typeof AppointmentCard>[0]["appointment"]} masked={false} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
