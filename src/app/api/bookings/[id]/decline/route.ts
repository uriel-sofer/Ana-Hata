import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getResend, FROM } from "@/lib/resend/client";
import { bookingDeclinedHtml } from "@/lib/resend/templates/emails";

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
    .select("customer_name, customer_email, start_time")
    .eq("id", params.id)
    .eq("status", "pending")
    .single();

  const { error } = await service
    .from("booking_requests")
    .update({ status: "declined" })
    .eq("id", params.id)
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (req?.customer_email && process.env.RESEND_API_KEY) {
    const dateStr = new Date(req.start_time).toLocaleString("he-IL");
    await getResend().emails.send({
      from: FROM,
      to: req.customer_email,
      subject: "עדכון לגבי בקשת ההזמנה — Anahata",
      html: bookingDeclinedHtml(req.customer_name ?? "", dateStr),
    });
  }

  return NextResponse.json({ ok: true });
}
