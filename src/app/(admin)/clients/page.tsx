import { createClient } from "@/lib/supabase/server";
import { ClientCard } from "@/components/clients/ClientCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ClientsPage() {
  const supabase = createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("full_name");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">לקוחות</h1>
        <Button asChild>
          <Link href="/clients/new">+ לקוח חדש</Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients?.map(client => (
          <ClientCard key={client.id} client={client} />
        ))}
        {!clients?.length && (
          <p className="text-slate-500 col-span-3">אין לקוחות עדיין.</p>
        )}
      </div>
    </div>
  );
}
