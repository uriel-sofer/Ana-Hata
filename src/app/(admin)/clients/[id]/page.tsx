import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!client) notFound();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*, service:services(name, duration_minutes)")
    .eq("client_id", params.id)
    .order("start_time", { ascending: false });

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{client.full_name}</h1>
          <p className="text-slate-500 mt-1">{client.phone} · {client.email}</p>
          {client.city && <p className="text-slate-500">{client.city}</p>}
          {client.date_of_birth && (
            <p className="text-slate-500 text-sm">
              {new Date(client.date_of_birth).toLocaleDateString("he-IL")}
            </p>
          )}
          <div className="flex gap-1 mt-2 flex-wrap">
            {client.tags?.map((t: string) => (
              <Badge key={t} variant="secondary">{t}</Badge>
            ))}
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/clients/${client.id}/edit`}>ערוך</Link>
        </Button>
      </div>

      {client.intake && (
        <section>
          <h2 className="font-semibold text-lg mb-3">שאלון קבלה</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            {Object.entries(client.intake as Record<string, string>).map(([k, v]) =>
              v ? (
                <div key={k}>
                  <dt className="text-slate-500 mb-0.5 capitalize">{k.replace(/_/g, " ")}</dt>
                  <dd className="whitespace-pre-wrap">{v}</dd>
                </div>
              ) : null
            )}
          </dl>
        </section>
      )}

      <section>
        <h2 className="font-semibold text-lg mb-3">היסטוריית טיפולים</h2>
        {appointments?.length ? (
          <ul className="space-y-2">
            {appointments.map((appt) => (
              <li key={appt.id} className="border rounded p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{appt.service?.name ?? "טיפול"}</span>
                  <span className="text-slate-500">
                    {new Date(appt.start_time).toLocaleDateString("he-IL")}
                  </span>
                </div>
                {appt.post_notes && (
                  <p className="mt-1 text-slate-600 whitespace-pre-wrap">{appt.post_notes}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 text-sm">אין טיפולים עדיין.</p>
        )}
      </section>
    </div>
  );
}
