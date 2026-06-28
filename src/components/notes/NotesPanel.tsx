"use client";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = {
  appointmentId: string;
  initialPreNotes: string | null;
  initialPostNotes: string | null;
  previousPostNotes?: string | null;
};

export function NotesPanel({
  appointmentId,
  initialPreNotes,
  initialPostNotes,
  previousPostNotes,
}: Props) {
  const [preNotes, setPreNotes] = useState(initialPreNotes ?? "");
  const [postNotes, setPostNotes] = useState(initialPostNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointment_id: appointmentId,
        pre_notes: preNotes,
        post_notes: postNotes,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4 border rounded p-4 bg-slate-50">
      {previousPostNotes && (
        <div>
          <Label className="text-xs text-slate-400">סיכום הפגישה הקודמת</Label>
          <p className="text-sm text-slate-600 whitespace-pre-wrap mt-1 bg-white p-2 rounded border">
            {previousPostNotes}
          </p>
        </div>
      )}

      <div>
        <Label>הערות לפני הטיפול</Label>
        <Textarea
          value={preNotes}
          onChange={e => setPreNotes(e.target.value)}
          rows={3}
          className="mt-1"
          placeholder="כוונה / הכנה לפני הפגישה..."
        />
      </div>

      <div>
        <Label>הערות אחרי הטיפול</Label>
        <Textarea
          value={postNotes}
          onChange={e => setPostNotes(e.target.value)}
          rows={4}
          className="mt-1"
          placeholder="סיכום קליני..."
        />
      </div>

      <Button onClick={save} disabled={saving} size="sm">
        {saving ? "שומר..." : saved ? "נשמר ✓" : "שמור הערות"}
      </Button>
    </div>
  );
}
