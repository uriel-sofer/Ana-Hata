import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getResend, FROM } from "@/lib/resend/client";
import { bookingApprovedHtml } from "@/lib/resend/templates/emails";
import { signBookingToken } from "@/lib/booking-token";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = createServiceClient();

  const { data: req } = await service
    .from("booking_requests")
    .select("*")
    .eq("id", params.id)
    .eq("status", "pending")
    .single();

  if (!req) return NextResponse.json({ error: "Request not found or not pending" }, { status: 404 });

  let clientId: string | null = null;
  if (req.customer_email) {
    const { data: existing } = await service
      .from("clients")
      .select("id")
      .eq("email", req.customer_email)
      .single();

    if (existing) {
      clientId = existing.id;
    } else {
      const { data: newClient } = await service
        .from("clients")
        .insert({
          full_name: req.customer_name,
          email: req.customer_email,
          phone: req.customer_phone,
          tags: [],
        })
        .select("id")
        .single();
      clientId = newClient?.id ?? null;
    }
  }

  const { error: apptErr } = await service.from("appointments").insert({
    client_id: clientId,
    service_id: req.service_id,
    therapist_id: req.therapist_id,
    start_time: req.start_time,
    end_time: req.end_time,
    status: "scheduled",
  });

  if (apptErr) return NextResponse.json({ error: apptErr.message }, { status: 500 });

  await service.from("booking_requests").update({ status: "approved" }).eq("id", params.id);

  if (req.customer_email && process.env.RESEND_API_KEY) {
    const token = await signBookingToken(req.id, req.customer_email);
    const bookingLink = `${process.env.NEXT_PUBLIC_APP_URL}/b/${token}`;
    const dateStr = new Date(req.start_time).toLocaleString("he-IL");

    await getResend().emails.send({
      from: FROM,
      to: req.customer_email,
      subject: "הפגישה שלך אושרה — Anahata",
      html: bookingApprovedHtml(req.customer_name ?? "", dateStr, "", bookingLink),
    });
  }

  return NextResponse.json({ ok: true });
}
