export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { verifyBookingToken } from "@/lib/booking-token";
import { createServiceClient } from "@/lib/supabase/server";
import { BookingActions } from "@/components/bookings/BookingActions";

export default async function BookingTokenPage({ params }: { params: { token: string } }) {
  const payload = await verifyBookingToken(params.token);
  if (!payload) notFound();

  const supabase = createServiceClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("cancellation_window_hours")
    .single();

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, start_time, end_time, status, service:services(name)")
    .eq("id", payload.bookingRequestId)
    .single();

  const { data: req } = !appt
    ? await supabase
        .from("booking_requests")
        .select("id, start_time, end_time, status, service:services(name)")
        .eq("id", payload.bookingRequestId)
        .single()
    : { data: null };

  const record = appt ?? req;
  if (!record) notFound();

  const statusLabel: Record<string, string> = {
    scheduled: "מאושרת",
    approved: "מאושרת",
    pending: "ממתינה לאישור",
    cancelled: "בוטלה",
    declined: "בוטלה",
    completed: "הושלמה",
    no_show: "לא הגיע/ה",
  };

  const isActive = ["scheduled", "pending"].includes(record.status);

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <h1 className="text-xl font-bold mb-2">הפגישה שלי</h1>
      <p className="text-slate-500 mb-6">{payload.email}</p>

      <div className="border rounded p-4 mb-6">
        <p className="font-semibold">
          {(record.service as unknown as { name: string } | null)?.name ?? "טיפול"}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          {new Date(record.start_time).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}
          {" – "}
          {new Date(record.end_time).toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Jerusalem",
          })}
        </p>
        <p className="text-sm mt-2">
          סטטוס:{" "}
          <span className="font-medium">{statusLabel[record.status] ?? record.status}</span>
        </p>
      </div>

      {isActive && (
        <BookingActions
          bookingId={record.id}
          token={params.token}
          startTime={record.start_time}
          cancellationWindowHours={settings?.cancellation_window_hours ?? 2}
        />
      )}
    </div>
  );
}
