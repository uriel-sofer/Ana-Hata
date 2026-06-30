"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingRequest } from "@/types";
import { Button } from "@/components/ui/button";

export function ApprovalRow({ request, slaHours }: { request: BookingRequest; slaHours: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "decline" | null>(null);

  const ageHours = (Date.now() - new Date(request.created_at).getTime()) / 3_600_000;
  const urgency =
    ageHours > slaHours ? "red" : ageHours > slaHours / 2 ? "yellow" : "green";

  const dot = {
    green:  "bg-green-400",
    yellow: "bg-yellow-400",
    red:    "bg-red-500",
  }[urgency];

  async function act(action: "approve" | "decline") {
    setLoading(action);
    await fetch(`/api/bookings/${request.id}/${action}`, { method: "POST" });
    setLoading(null);
    router.refresh();
  }

  const startDate = new Date(request.start_time);
  const dateStr = startDate.toLocaleDateString("he-IL", {
    weekday: "short", day: "numeric", month: "numeric", timeZone: "Asia/Jerusalem",
  });
  const timeStr = startDate.toLocaleTimeString("he-IL", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem",
  });

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      {/* urgency dot */}
      <td className="px-4 py-3">
        <span className={`block w-2.5 h-2.5 rounded-full ${dot}`} />
      </td>

      {/* service */}
      <td className="px-4 py-3 font-medium">
        {(request.service as { name: string } | null)?.name ?? "—"}
      </td>

      {/* customer name */}
      <td className="px-4 py-3">
        {request.customer_name ?? "מטפל"}
      </td>

      {/* email · phone (hidden on small screens) */}
      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
        <span className="block">{request.customer_email}</span>
        <span className="block">{request.customer_phone}</span>
      </td>

      {/* appointment time */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="block">{dateStr}</span>
        <span className="text-slate-500">{timeStr}</span>
      </td>

      {/* waiting time */}
      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
        {ageHours < 1
          ? `${Math.round(ageHours * 60)} דק׳`
          : `${ageHours.toFixed(1)} ש׳`}
      </td>

      {/* actions */}
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <Button size="sm" onClick={() => act("approve")} disabled={!!loading}>
            {loading === "approve" ? "..." : "אשר"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => act("decline")} disabled={!!loading}>
            {loading === "decline" ? "..." : "דחה"}
          </Button>
        </div>
      </td>
    </tr>
  );
}
