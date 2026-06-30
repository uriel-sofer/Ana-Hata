"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  applyBuffer?: boolean;
};

export function BookingRequestForm({ service, settings, busyRanges, selectedDate, applyBuffer = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const now = new Date();
  // busyRanges arrive as strings from server serialization — coerce back to Date
  const safeRanges = busyRanges.map(r => ({ start: new Date(r.start), end: new Date(r.end) }));
  const slots = computeSlots(new Date(selectedDate), service.duration_minutes, settings, safeRanges, applyBuffer)
    .map(s => ({ ...s, free: s.free && s.start > now }));

  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedSlot(null);
    router.push(`${pathname}?service=${service.id}&date=${e.target.value}`);
  }

  const dateValue = selectedDate.toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];
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
        <Label htmlFor="date" className="font-semibold mb-2 block">בחרי תאריך:</Label>
        <input
          id="date"
          type="date"
          value={dateValue}
          min={today}
          onChange={handleDateChange}
          className="border rounded px-3 py-2 text-sm w-full"
        />
      </div>
      <div>
        <p className="font-semibold mb-3">בחרי שעה:</p>
        {slots.every(s => !s.free) && (
          <p className="text-slate-500 text-sm">אין שעות פנויות ביום זה.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {slots.map(slot => {
            const isSelected = selectedSlot?.start.toISOString() === slot.start.toISOString();
            return (
              <button
                key={slot.start.toISOString()}
                type="button"
                disabled={!slot.free}
                onClick={() => slot.free && setSelectedSlot(slot)}
                className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                  !slot.free
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through"
                    : isSelected
                    ? "bg-blue-600 text-white border-blue-600"
                    : "hover:border-blue-400"
                }`}
              >
                {slot.start.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
              </button>
            );
          })}
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
