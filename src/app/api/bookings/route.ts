import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getResend, FROM } from "@/lib/resend/client";
import { bookingReceivedHtml } from "@/lib/resend/templates/emails";

export async function POST(request: Request) {
  const body = await request.json();
  const { service_id, start_time, end_time, customer_name, customer_email, customer_phone } = body;

  if (!start_time || !end_time || !customer_name || !customer_email || !customer_phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const [{ data: settingsRow }, { data: serviceRow }] = await Promise.all([
    supabase.from("settings").select("pool_count, buffer_minutes").single(),
    service_id
      ? supabase.from("services").select("category").eq("id", service_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const poolCount = settingsRow?.pool_count ?? 1;
  const isTreatment = serviceRow?.category !== "therapist_rental";
  const bufferMs = isTreatment ? (settingsRow?.buffer_minutes ?? 0) * 60_000 : 0;

  const expandedStart = new Date(new Date(start_time).getTime() - bufferMs).toISOString();
  const expandedEnd = new Date(new Date(end_time).getTime() + bufferMs).toISOString();

  const [{ data: conflicts }, { data: pendingConflicts }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id")
      .neq("status", "cancelled")
      .lt("start_time", expandedEnd)
      .gt("end_time", expandedStart),
    supabase
      .from("booking_requests")
      .select("id")
      .eq("status", "pending")
      .lt("start_time", expandedEnd)
      .gt("end_time", expandedStart),
  ]);

  const totalConflicts = (conflicts?.length ?? 0) + (pendingConflicts?.length ?? 0);
  if (totalConflicts >= poolCount) {
    return NextResponse.json({ error: "Slot not available" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("booking_requests")
    .insert({
      requester_type: "customer",
      service_id: service_id ?? null,
      start_time,
      end_time,
      status: "pending",
      customer_name,
      customer_email,
      customer_phone,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (process.env.RESEND_API_KEY) {
    const { data: service } = await supabase
      .from("services")
      .select("name")
      .eq("id", service_id)
      .single();
    const dateStr = new Date(start_time).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
    await getResend().emails.send({
      from: FROM,
      to: customer_email,
      subject: "קיבלנו את בקשתך — Anahata",
      html: bookingReceivedHtml(customer_name, dateStr, service?.name ?? "טיפול"),
    });
  }

  return NextResponse.json(data, { status: 201 });
}
