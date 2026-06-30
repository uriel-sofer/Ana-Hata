export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createClient();
  const q = searchParams.q?.trim() ?? "";

  let query = supabase.from("clients").select("*").order("full_name");
  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  const { data: clients } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">לקוחות</h1>
        <Button asChild size="sm">
          <Link href="/clients/new">+ לקוח חדש</Link>
        </Button>
      </div>

      <ClientsTable clients={clients ?? []} initialQ={q} />
    </div>
  );
}
