export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/server";
import { BookingRequestForm } from "@/components/bookings/BookingRequestForm";
import type { Settings } from "@/types";
import Link from "next/link";

export default async function RentPage({
  searchParams,
}: {
  searchParams: { service?: string; date?: string };
}) {
  const supabase = createServiceClient();

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .eq("category", "therapist_rental")
    .order("duration_minutes");

  const selectedServiceId = searchParams.service;
  const selectedService = services?.find(s => s.id === selectedServiceId);
  const selectedDate = searchParams.date ? new Date(searchParams.date) : new Date();

  const { data: settings } = await supabase.from("settings").select("*").single();

  let busyRanges: { start: Date; end: Date }[] = [];

  if (selectedService && settings) {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: appts } = await supabase
      .from("appointments")
      .select("start_time, end_time")
      .neq("status", "cancelled")
      .gte("start_time", dayStart.toISOString())
      .lte("start_time", dayEnd.toISOString());

    const { data: pending } = await supabase
      .from("booking_requests")
      .select("start_time, end_time")
      .eq("status", "pending")
      .gte("start_time", dayStart.toISOString())
      .lte("start_time", dayEnd.toISOString());

    busyRanges = [...(appts ?? []), ...(pending ?? [])].map(r => ({
      start: new Date(r.start_time),
      end: new Date(r.end_time),
    }));
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-slate-400 hover:text-slate-600 text-sm">← חזרה</Link>
        <h1 className="text-2xl font-bold">השכרת בריכה</h1>
      </div>

      {!selectedServiceId ? (
        <div className="space-y-3">
          <p className="text-slate-500 text-sm mb-4">בחרי חבילה:</p>
          {services?.map(s => (
            <a
              key={s.id}
              href={`/rent?service=${s.id}&date=${selectedDate.toISOString().split("T")[0]}`}
              className="block border rounded-xl p-4 hover:border-teal-400 transition-colors"
            >
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-slate-500 mt-1">
                {s.duration_minutes} דקות · ₪{Number(s.price_ils).toFixed(0)}
              </p>
              {s.description && (
                <p className="text-xs text-slate-400 mt-1">{s.description}</p>
              )}
            </a>
          ))}
          {!services?.length && (
            <p className="text-slate-500 text-sm">אין חבילות פעילות כרגע.</p>
          )}
        </div>
      ) : selectedService && settings ? (
        <div>
          <p className="font-semibold mb-1">{selectedService.name}</p>
          <p className="text-sm text-slate-500 mb-4">
            {selectedService.duration_minutes} דקות · ₪{Number(selectedService.price_ils).toFixed(0)}
          </p>
          <BookingRequestForm
            service={selectedService}
            settings={settings as Settings}
            busyRanges={busyRanges}
            selectedDate={selectedDate}
          />
        </div>
      ) : (
        <p className="text-red-500">חבילה לא נמצאה.</p>
      )}
    </div>
  );
}
