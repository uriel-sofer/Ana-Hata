"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Settings } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from("settings")
      .select("*")
      .single()
      .then(({ data }) => {
        if (data) setSettings(data as Settings);
      });
  }, []);

  if (!settings) return <p className="text-slate-500">טוען...</p>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from("settings").update(settings!).eq("id", 1);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">הגדרות</h1>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1">
          <Label>חלון ביטול (שעות)</Label>
          <Input
            type="number"
            value={settings.cancellation_window_hours}
            onChange={e =>
              setSettings(s => ({ ...s!, cancellation_window_hours: +e.target.value }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label>סף SLA לאישור (שעות)</Label>
          <Input
            type="number"
            value={settings.sla_threshold_hours}
            onChange={e =>
              setSettings(s => ({ ...s!, sla_threshold_hours: +e.target.value }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label>זמן הפסקה בין טיפולים (דקות)</Label>
          <Input
            type="number"
            value={settings.buffer_minutes}
            onChange={e => setSettings(s => ({ ...s!, buffer_minutes: +e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>שעת פתיחה</Label>
            <Input
              type="time"
              value={settings.working_hours_start}
              onChange={e =>
                setSettings(s => ({ ...s!, working_hours_start: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>שעת סגירה</Label>
            <Input
              type="time"
              value={settings.working_hours_end}
              onChange={e =>
                setSettings(s => ({ ...s!, working_hours_end: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>מספר בריכות</Label>
          <Input
            type="number"
            min={1}
            value={settings.pool_count ?? 1}
            onChange={e => setSettings(s => ({ ...s!, pool_count: +e.target.value }))}
          />
          <p className="text-xs text-slate-500">כמה פגישות יכולות להתקיים במקביל</p>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "שומר..." : saved ? "נשמר ✓" : "שמור הגדרות"}
        </Button>
      </form>
    </div>
  );
}
