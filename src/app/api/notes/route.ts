import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const body = await request.json();
  const { appointment_id, pre_notes, post_notes } = body;

  if (!appointment_id) {
    return NextResponse.json({ error: "appointment_id required" }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const update: Record<string, string> = {};
  if (pre_notes !== undefined) update.pre_notes = pre_notes;
  if (post_notes !== undefined) update.post_notes = post_notes;

  const { error } = await supabase
    .from("appointments")
    .update(update)
    .eq("id", appointment_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
