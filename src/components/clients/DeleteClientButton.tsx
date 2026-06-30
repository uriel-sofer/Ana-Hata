"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
    router.push("/clients");
  }

  if (!confirming) {
    return (
      <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>
        מחק לקוח
      </Button>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
        {loading ? "מוחק..." : "אשר מחיקה"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
        ביטול
      </Button>
    </div>
  );
}
