import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { SignOutButton } from "@/components/ui/SignOutButton";

export default async function TherapistLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["admin", "therapist"].includes(profile?.role ?? "")) redirect("/auth/login");

  return (
    <div className="min-h-screen flex">
      <nav className="w-56 bg-slate-800 text-white flex flex-col p-4 gap-1 shrink-0">
        <p className="font-bold text-lg mb-4 px-3">Anahata</p>
        <Link href="/therapist/calendar" className="hover:bg-slate-700 px-3 py-2 rounded transition-colors">
          לוח שנה
        </Link>
        <SignOutButton />
      </nav>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
