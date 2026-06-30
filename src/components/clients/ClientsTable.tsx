"use client";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { Client } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useState, useTransition } from "react";

export function ClientsTable({ clients, initialQ }: { clients: Client[]; initialQ: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(initialQ);
  const [, startTransition] = useTransition();

  function search(value: string) {
    setQ(value);
    startTransition(() => {
      const params = value ? `?q=${encodeURIComponent(value)}` : "";
      router.push(`${pathname}${params}`);
    });
  }

  return (
    <>
      <div className="mb-3">
        <input
          type="search"
          value={q}
          onChange={e => search(e.target.value)}
          placeholder="חיפוש לפי שם, אימייל או טלפון..."
          className="w-full sm:w-72 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>

      {clients.length === 0 ? (
        <div className="border rounded-lg px-6 py-12 text-center text-slate-400">
          {q ? `אין תוצאות עבור "${q}"` : "אין לקוחות עדיין."}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-right text-slate-500 text-xs">
                <th className="px-4 py-2 font-medium">שם</th>
                <th className="px-4 py-2 font-medium hidden sm:table-cell">טלפון</th>
                <th className="px-4 py-2 font-medium hidden md:table-cell">אימייל</th>
                <th className="px-4 py-2 font-medium hidden lg:table-cell">תגיות</th>
                <th className="px-4 py-2 font-medium w-16" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {clients.map(client => (
                <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${client.id}`} className="font-medium hover:text-blue-600 transition-colors">
                      {client.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                    {client.phone}
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                    {client.email}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {client.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-left">
                    <Link href={`/clients/${client.id}`} className="text-xs text-slate-400 hover:text-slate-600">
                      פרופיל ←
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-slate-50 border-t text-xs text-slate-400 text-left">
            {clients.length} לקוחות
          </div>
        </div>
      )}
    </>
  );
}
