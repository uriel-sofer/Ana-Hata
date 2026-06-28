import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { service_id, start_time, end_time, customer_name, customer_email, customer_phone } = body;

  if (!start_time || !end_time || !customer_name || !customer_email || !customer_phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: conflicts } = await supabase
    .from("appointments")
    .select("id")
    .neq("status", "cancelled")
    .lt("start_time", end_time)
    .gt("end_time", start_time);

  const { data: pendingConflicts } = await supabase
    .from("booking_requests")
    .select("id")
    .eq("status", "pending")
    .lt("start_time", end_time)
    .gt("end_time", start_time);

  if ((conflicts?.length ?? 0) > 0 || (pendingConflicts?.length ?? 0) > 0) {
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

  return NextResponse.json(data, { status: 201 });
}
