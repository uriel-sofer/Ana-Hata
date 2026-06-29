"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingRequest } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ApprovalCard({
  request,
  slaHours,
}: {
  request: BookingRequest;
  slaHours: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "decline" | null>(null);

  const ageHours = (Date.now() - new Date(request.created_at).getTime()) / 3_600_000;
  const urgency =
    ageHours > slaHours ? "red" : ageHours > slaHours / 2 ? "yellow" : "green";

  const borderColors = {
    green: "border-r-green-400",
    yellow: "border-r-yellow-400",
    red: "border-r-red-500",
  };

  async function act(action: "approve" | "decline") {
    setLoading(action);
    await fetch(`/api/bookings/${request.id}/${action}`, { method: "POST" });
    setLoading(null);
    router.refresh();
  }

  return (
    <Card className={`border-r-4 ${borderColors[urgency]}`}>
      <CardContent className="pt-4 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold">{request.customer_name ?? "מטפל"}</p>
            <p className="text-sm text-slate-500">
              {request.customer_email} · {request.customer_phone}
            </p>
          </div>
          <Badge variant="outline">{ageHours.toFixed(1)} שעות</Badge>
        </div>
        <p className="text-sm text-slate-700">
          {new Date(request.start_time).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}
          {" – "}
          {new Date(request.end_time).toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Jerusalem",
          })}
        </p>
        <div className="flex gap-2 pt-2 flex-wrap">
          <Button size="sm" onClick={() => act("approve")} disabled={!!loading}>
            {loading === "approve" ? "מאשר..." : "אשר"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => act("decline")}
            disabled={!!loading}
          >
            {loading === "decline" ? "דוחה..." : "דחה"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
