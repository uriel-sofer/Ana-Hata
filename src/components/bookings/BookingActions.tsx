"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  bookingId: string;
  token: string;
  startTime: string;
  cancellationWindowHours: number;
};

export function BookingActions({ bookingId, token, startTime, cancellationWindowHours }: Props) {
  const [status, setStatus] = useState<"idle" | "cancelled" | "too_late" | "error">("idle");
  const [loading, setLoading] = useState(false);

  const canCancel =
    Date.now() < new Date(startTime).getTime() - cancellationWindowHours * 3_600_000;

  async function handleCancel() {
    setLoading(true);
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      setStatus("cancelled");
    } else {
      const data = await res.json();
      setStatus(data.error === "Too late to cancel" ? "too_late" : "error");
    }
    setLoading(false);
  }

  if (status === "cancelled") return <p className="text-green-600">הפגישה בוטלה.</p>;
  if (status === "too_late")
    return (
      <p className="text-orange-500">
        לא ניתן לבטל פחות מ-{cancellationWindowHours} שעות לפני הפגישה. צרי קשר עם מורן.
      </p>
    );
  if (status === "error") return <p className="text-red-500">שגיאה בביטול.</p>;

  return canCancel ? (
    <Button variant="destructive" onClick={handleCancel} disabled={loading}>
      {loading ? "מבטל..." : "בטל פגישה"}
    </Button>
  ) : (
    <p className="text-sm text-slate-500">
      לא ניתן לבטל פחות מ-{cancellationWindowHours} שעות לפני הפגישה.
    </p>
  );
}
