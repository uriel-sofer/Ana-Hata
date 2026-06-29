import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { SignOutButton } from "@/components/ui/SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/auth/login");

  const { count: pendingCount } = await supabase
    .from("booking_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div className="min-h-screen flex">
      <nav className="w-56 bg-slate-900 text-white flex flex-col p-4 gap-1 shrink-0">
        <Link href="/" className="font-bold text-lg mb-4 px-3 hover:text-slate-300 transition-colors">Anahata</Link>
        <Link href="/clients" className="hover:bg-slate-700 px-3 py-2 rounded transition-colors">לקוחות</Link>
        <Link href="/calendar" className="hover:bg-slate-700 px-3 py-2 rounded transition-colors">לוח שנה</Link>
        <Link href="/approvals" className="hover:bg-slate-700 px-3 py-2 rounded transition-colors flex items-center justify-between">
          <span>בקשות ממתינות</span>
          {(pendingCount ?? 0) > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </Link>
        <Link href="/settings" className="hover:bg-slate-700 px-3 py-2 rounded transition-colors">הגדרות</Link>
        <SignOutButton />
      </nav>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
