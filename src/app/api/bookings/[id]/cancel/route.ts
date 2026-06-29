import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyBookingToken } from "@/lib/booking-token";
import { getResend, FROM } from "@/lib/resend/client";
import { bookingCancelledHtml } from "@/lib/resend/templates/emails";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { token } = body;

  const payload = token ? await verifyBookingToken(token) : null;
  if (!payload || payload.bookingRequestId !== params.id) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("cancellation_window_hours")
    .single();
  const windowMs = (settings?.cancellation_window_hours ?? 2) * 3_600_000;

  // Try appointment first (approved bookings)
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, start_time")
    .eq("id", params.id)
    .single();

  if (appt) {
    if (Date.now() > new Date(appt.start_time).getTime() - windowMs) {
      return NextResponse.json({ error: "Too late to cancel" }, { status: 422 });
    }
    // Cancel appointment AND sync booking_request so page shows cancelled on refresh
    await Promise.all([
      supabase.from("appointments").update({ status: "cancelled" }).eq("id", appt.id),
      supabase.from("booking_requests").update({ status: "cancelled" }).eq("id", params.id),
    ]);
    if (process.env.RESEND_API_KEY) {
      const dateStr = new Date(appt.start_time).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
      await getResend().emails.send({
        from: FROM,
        to: payload.email,
        subject: "הפגישה בוטלה — Anahata",
        html: bookingCancelledHtml(payload.email, dateStr),
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Pending booking request — client initiated cancel
  const { data: req } = await supabase
    .from("booking_requests")
    .select("id, start_time")
    .eq("id", params.id)
    .single();

  if (req) {
    if (Date.now() > new Date(req.start_time).getTime() - windowMs) {
      return NextResponse.json({ error: "Too late to cancel" }, { status: 422 });
    }
    // "cancelled" = client withdrew; "declined" = admin rejected
    await supabase.from("booking_requests").update({ status: "cancelled" }).eq("id", req.id);
    if (process.env.RESEND_API_KEY) {
      const dateStr = new Date(req.start_time).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
      await getResend().emails.send({
        from: FROM,
        to: payload.email,
        subject: "הפגישה בוטלה — Anahata",
        html: bookingCancelledHtml(payload.email, dateStr),
      });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
