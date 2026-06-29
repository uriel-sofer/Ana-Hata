"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Appointment, Client, Service } from "@/types";

type Props = {
  appointment: Appointment & { client?: Pick<Client, "full_name">; service?: Pick<Service, "name"> };
  masked?: boolean;
  allowCancel?: boolean;
};

export function AppointmentCard({ appointment, masked = false, allowCancel = false }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);

  async function handleCancel() {
    setLoading(true);
    await fetch(`/api/appointments/${appointment.id}/cancel`, { method: "POST" });
    router.refresh();
  }

  return (
    <div className="bg-blue-100 border border-blue-300 rounded p-2 text-xs group relative">
      <p className="font-medium">
        {start.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
        {" – "}
        {end.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
      </p>
      {!masked && appointment.client && (
        <p className="text-slate-700">{appointment.client.full_name}</p>
      )}
      {masked && <p className="text-slate-400 italic">תפוס</p>}
      {appointment.service && <p className="text-slate-500">{appointment.service.name}</p>}

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
          <button
            onClick={() => setConfirming(false)}
            className="text-slate-400 text-xs hover:text-slate-600"
          >
            חזרה
          </button>
        </div>
      )}
    </div>
  );
}
