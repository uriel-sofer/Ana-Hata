import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/ui/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: profile }, { count: pendingCount }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("booking_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  if (profile?.role !== "admin") redirect("/auth/login");

  return (
    <div className="min-h-screen flex">
      <AdminNav pendingCount={pendingCount ?? 0} />
      <main className="flex-1 p-4 md:p-6 overflow-auto mt-12 md:mt-0">{children}</main>
    </div>
  );
}
