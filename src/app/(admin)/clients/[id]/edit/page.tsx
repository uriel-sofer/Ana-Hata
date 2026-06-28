import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientForm } from "@/components/clients/ClientForm";

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!client) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">עריכת לקוח</h1>
      <ClientForm client={client} />
    </div>
  );
}
