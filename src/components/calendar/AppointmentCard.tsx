"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Appointment, Client, Service } from "@/types";

type Props = {
  appointment: Appointment & {
    client?: Pick<Client, "full_name">;
    service?: Pick<Service, "name"> & { category?: string };
  };
  masked?: boolean;
  allowCancel?: boolean;
  customerName?: string;
};

const TZ = "Asia/Jerusalem";

export function AppointmentCard({ appointment, masked = false, allowCancel = false, customerName }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);
  const category = (appointment.service as { category?: string } | null)?.category;
  const isRental = category === "therapist_rental";

  const timeStr = (d: Date) =>
    d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

  async function handleCancel() {
    setLoading(true);
    await fetch(`/api/appointments/${appointment.id}/cancel`, { method: "POST" });
    router.refresh();
  }

  const colors = isRental
    ? "bg-teal-100 border-teal-400"
    : "bg-blue-100 border-blue-300";

  return (
    <div className={`border rounded p-2 text-xs ${colors}`}>
      <p className="font-medium">
        {timeStr(start)} – {timeStr(end)}
      </p>
      {!masked && (
        <p className="text-slate-700">
          {appointment.client?.full_name ?? customerName ?? ""}
        </p>
      )}
      {masked && <p className="text-slate-400 italic">תפוס</p>}
      {appointment.service && (
        <p className="text-slate-500 truncate">{appointment.service.name}</p>
      )}

      {allowCancel && !confirming && (
        <button
          onClick={() => setConfirming(true)}
          className="mt-1 text-red-500 hover:text-red-700 text-xs underline"
        >
          ביטול
        </button>
      )}
      {allowCancel && confirming && (
        <div className="mt-1 flex gap-2 items-center">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="text-red-600 font-semibold text-xs hover:text-red-800"
          >
            {loading ? "מבטל..." : "אשרי ביטול"}
          </button>
          <button onClick={() => setConfirming(false)} className="text-slate-400 text-xs hover:text-slate-600">
            חזרה
          </button>
        </div>
      )}
    </div>
  );
}
