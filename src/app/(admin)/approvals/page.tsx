import { createClient } from "@/lib/supabase/server";
import { ApprovalCard } from "@/components/bookings/ApprovalCard";

export default async function ApprovalsPage() {
  const supabase = createClient();

  const { data: requests } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at");

  const { data: settings } = await supabase
    .from("settings")
    .select("sla_threshold_hours")
    .single();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">בקשות ממתינות</h1>
      {requests?.length ? (
        <div className="space-y-4 max-w-2xl">
          {requests.map(req => (
            <ApprovalCard
              key={req.id}
              request={req}
              slaHours={settings?.sla_threshold_hours ?? 4}
            />
          ))}
        </div>
      ) : (
        <p className="text-slate-500">אין בקשות ממתינות 🎉</p>
      )}
    </div>
  );
}
