import Link from "next/link";
import type { Client } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ClientCard({ client }: { client: Client }) {
  return (
    <Link href={`/clients/${client.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="pt-4">
          <p className="font-semibold">{client.full_name}</p>
          <p className="text-sm text-slate-500">{client.phone}</p>
          <p className="text-sm text-slate-500">{client.email}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {client.tags.map(tag => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
