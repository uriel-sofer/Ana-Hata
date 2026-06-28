"use client";
import { useState } from "react";
import type { Service, Settings } from "@/types";
import { computeSlots } from "@/lib/slots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BusyRange = { start: Date; end: Date };

type Props = {
  service: Service;
  settings: Settings;
  busyRanges: BusyRange[];
  selectedDate: Date;
};

export function BookingRequestForm({ service, settings, busyRanges, selectedDate }: Props) {
  const slots = computeSlots(selectedDate, service.duration_minutes, settings, busyRanges);
  const freeSlots = slots.filter(s => s.free);

  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: service.id,
        start_time: selectedSlot.start.toISOString(),
        end_time: selectedSlot.end.toISOString(),
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "שגיאה בשליחה");
      setLoading(false);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <p className="text-xl">תודה! 🌊</p>
        <p className="text-slate-500 mt-2">קיבלנו את בקשתך ונחזור אליך בהקדם.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="font-semibold mb-3">בחרי שעה:</p>
        {freeSlots.length === 0 && (
          <p className="text-slate-500 text-sm">אין שעות פנויות ביום זה.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {freeSlots.map(slot => (
            <button
              key={slot.start.toISOString()}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                selectedSlot?.start.toISOString() === slot.start.toISOString()
                  ? "bg-blue-600 text-white border-blue-600"
                  : "hover:border-blue-400"
              }`}
            >
              {slot.start.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
            </button>
          ))}
        </div>
      </div>

      {selectedSlot && (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>שם מלא *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>אימייל *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>טלפון *</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "שולחת..." : "שלחי בקשה"}
          </Button>
        </div>
      )}
    </form>
  );
}
