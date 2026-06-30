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

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(appointment.post_notes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);

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

  async function saveNotes() {
    setNotesSaving(true);
    await fetch("/api/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointment_id: appointment.id, post_notes: notesValue }),
    });
    setNotesSaving(false);
    setEditingNotes(false);
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
          {customerName ?? appointment.client?.full_name ?? ""}
        </p>
      )}
      {masked && <p className="text-slate-400 italic">תפוס</p>}
      {appointment.service && (
        <p className="text-slate-500 truncate">{appointment.service.name}</p>
      )}

      {!masked && (
        <div className="mt-1.5">
          {editingNotes ? (
            <div className="space-y-1">
              <textarea
                className="w-full text-xs border border-slate-300 rounded px-1.5 py-1 bg-white resize-none focus:outline-none focus:border-blue-400"
                rows={3}
                value={notesValue}
                onChange={e => setNotesValue(e.target.value)}
                placeholder="הערות לאחר הטיפול..."
                dir="rtl"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={saveNotes}
                  disabled={notesSaving}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {notesSaving ? "שומרת..." : "שמרי"}
                </button>
                <button
                  onClick={() => { setEditingNotes(false); setNotesValue(appointment.post_notes ?? ""); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : notesValue ? (
            <p
              onClick={() => setEditingNotes(true)}
              className="text-slate-600 whitespace-pre-wrap cursor-pointer hover:text-slate-800 leading-relaxed"
            >
              {notesValue}
            </p>
          ) : (
            <button
              onClick={() => setEditingNotes(true)}
              className="text-slate-400 hover:text-slate-600 italic"
            >
              + הוסיפי הערות
            </button>
          )}
        </div>
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
