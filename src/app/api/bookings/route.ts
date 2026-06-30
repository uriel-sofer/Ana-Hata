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

  if (isTreatment) {
    // Moran can only do 1 treatment at a time; also requires a free pool
    const bufferMs = (settingsRow?.buffer_minutes ?? 0) * 60_000;
    const expandedStart = new Date(new Date(start_time).getTime() - bufferMs).toISOString();
    const expandedEnd = new Date(new Date(end_time).getTime() + bufferMs).toISOString();

    const [
      { data: apptConflicts },
      { data: reqConflicts },
      { data: allApptConflicts },
      { data: allReqConflicts },
    ] = await Promise.all([
      // Therapist check: treatments only, with buffer
      supabase
        .from("appointments")
        .select("id, service:services(category)")
        .neq("status", "cancelled")
        .lt("start_time", expandedEnd)
        .gt("end_time", expandedStart),
      supabase
        .from("booking_requests")
        .select("id, service:services(category)")
        .eq("status", "pending")
        .lt("start_time", expandedEnd)
        .gt("end_time", expandedStart),
      // Pool check: all bookings, no buffer
      supabase
        .from("appointments")
        .select("id")
        .neq("status", "cancelled")
        .lt("start_time", end_time)
        .gt("end_time", start_time),
      supabase
        .from("booking_requests")
        .select("id")
        .eq("status", "pending")
        .lt("start_time", end_time)
        .gt("end_time", start_time),
    ]);

    const treatmentCount =
      (apptConflicts?.filter(c => (c.service as unknown as Record<string, unknown> | null)?.category === "client").length ?? 0) +
      (reqConflicts?.filter(c => (c.service as unknown as Record<string, unknown> | null)?.category === "client").length ?? 0);

    const totalPoolCount = (allApptConflicts?.length ?? 0) + (allReqConflicts?.length ?? 0);

    if (treatmentCount >= 1 || totalPoolCount >= poolCount) {
      return NextResponse.json({ error: "Slot not available" }, { status: 409 });
    }
  } else {
    // Rental: all bookings (treatments + rentals) count against pool_count, no buffer
    const [{ data: apptConflicts }, { data: reqConflicts }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id")
        .neq("status", "cancelled")
        .lt("start_time", end_time)
        .gt("end_time", start_time),
      supabase
        .from("booking_requests")
        .select("id")
        .eq("status", "pending")
        .lt("start_time", end_time)
        .gt("end_time", start_time),
    ]);

    if ((apptConflicts?.length ?? 0) + (reqConflicts?.length ?? 0) >= poolCount) {
      return NextResponse.json({ error: "Slot not available" }, { status: 409 });
    }
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
