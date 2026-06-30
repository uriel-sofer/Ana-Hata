export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { ApprovalRow } from "@/components/bookings/ApprovalRow";

export default async function ApprovalsPage() {
  const supabase = createClient();

  const { data: requests } = await supabase
    .from("booking_requests")
    .select("*, service:services(name)")
    .eq("status", "pending")
    .order("start_time");   // earliest appointment first

  const { data: settings } = await supabase
    .from("settings")
    .select("sla_threshold_hours")
    .single();

  const slaHours = settings?.sla_threshold_hours ?? 4;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">בקשות ממתינות</h1>
        {requests?.length ? (
          <span className="text-sm text-slate-500">{requests.length} בקשות</span>
        ) : null}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" /> פחות מ-{Math.round(slaHours / 2)} שעות המתנה</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> {Math.round(slaHours / 2)}–{slaHours} שעות</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> מעל {slaHours} שעות — דחוף</span>
      </div>

      {requests?.length ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-right text-slate-500 text-xs">
                <th className="px-4 py-2 font-medium w-6" />
                <th className="px-4 py-2 font-medium">שירות</th>
                <th className="px-4 py-2 font-medium">לקוח</th>
                <th className="px-4 py-2 font-medium hidden sm:table-cell">אימייל · טלפון</th>
                <th className="px-4 py-2 font-medium">מועד הפגישה</th>
                <th className="px-4 py-2 font-medium">המתנה</th>
                <th className="px-4 py-2 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.map(req => (
                <ApprovalRow key={req.id} request={req} slaHours={slaHours} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border rounded-lg px-6 py-12 text-center text-slate-400">
          <p className="text-2xl mb-2">🎉</p>
          <p>אין בקשות ממתינות</p>
        </div>
      )}
    </div>
  );
}
