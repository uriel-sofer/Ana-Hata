"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient as createSupabase } from "@/lib/supabase/client";
import type { Client, Intake } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const INTAKE_LABELS: Record<keyof Intake, string> = {
  health_background: "רקע בריאותי",
  emotional_context: "הקשר רגשי",
  contraindications: "התוויות נגד",
  goals: "מטרות",
  referral_source: "מקור הפנייה",
};

export function ClientForm({ client }: { client?: Client }) {
  const router = useRouter();
  const supabase = createSupabase();

  const [fullName, setFullName] = useState(client?.full_name ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [city, setCity] = useState(client?.city ?? "");
  const [dob, setDob] = useState(client?.date_of_birth ?? "");
  const [gender, setGender] = useState(client?.gender ?? "");
  const [tags, setTags] = useState(client?.tags.join(", ") ?? "");
  const [intake, setIntake] = useState<Intake>(
    client?.intake ?? {
      health_background: "",
      emotional_context: "",
      contraindications: "",
      goals: "",
      referral_source: "",
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      full_name: fullName,
      phone,
      email,
      city: city || null,
      date_of_birth: dob || null,
      gender: gender || null,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      intake,
    };

    const result = client
      ? await supabase.from("clients").update(payload).eq("id", client.id)
      : await supabase.from("clients").insert(payload).select().single();

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    const id = client?.id ?? (result.data as Client).id;
    router.push(`/clients/${id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <section className="space-y-4">
        <h2 className="font-semibold text-lg border-b pb-1">פרטים אישיים</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>שם מלא *</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>טלפון *</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>אימייל *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>עיר</Label>
            <Input value={city} onChange={e => setCity(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>תאריך לידה</Label>
            <Input type="date" value={dob} onChange={e => setDob(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>מגדר</Label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm bg-background"
            >
              <option value="">לא צוין</option>
              <option value="female">נקבה</option>
              <option value="male">זכר</option>
              <option value="other">אחר</option>
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <Label>תגיות (מופרדות בפסיק)</Label>
          <Input
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="הריון, ילד, VIP..."
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-lg border-b pb-1">שאלון קבלה</h2>
        {(Object.keys(INTAKE_LABELS) as (keyof Intake)[]).map(field => (
          <div key={field} className="space-y-1">
            <Label>{INTAKE_LABELS[field]}</Label>
            <Textarea
              value={intake[field]}
              onChange={e => setIntake(prev => ({ ...prev, [field]: e.target.value }))}
              rows={2}
            />
          </div>
        ))}
      </section>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "שומר..." : "שמור"}
      </Button>
    </form>
  );
}
