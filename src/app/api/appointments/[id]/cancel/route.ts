import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getResend, FROM } from "@/lib/resend/client";
import { bookingCancelledHtml } from "@/lib/resend/templates/emails";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();

  const { data: appt } = await service
    .from("appointments")
    .select("start_time, client:clients(full_name, email), service:services(name)")
    .eq("id", params.id)
    .single();

  const { error } = await service
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (appt && process.env.RESEND_API_KEY) {
    const client = appt.client as unknown as { full_name: string; email: string } | null;
    const serviceName = (appt.service as unknown as { name?: string } | null)?.name ?? "";
    if (client?.email) {
      try {
        const dateStr = new Date(appt.start_time).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
        await getResend().emails.send({
          from: FROM,
          to: client.email,
          subject: `הפגישה בוטלה — ${serviceName}`,
          html: bookingCancelledHtml(client.full_name, dateStr),
        });
      } catch (e) {
        console.error("cancel email failed:", e);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
