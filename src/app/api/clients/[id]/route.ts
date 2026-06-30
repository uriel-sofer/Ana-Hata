import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
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

  // Nullify FK references before deleting so Postgres doesn't reject
  await Promise.all([
    service.from("appointments").update({ client_id: null }).eq("client_id", params.id),
    service.from("booking_requests").update({ requester_customer_id: null }).eq("requester_customer_id", params.id),
  ]);

  const { error } = await service.from("clients").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
