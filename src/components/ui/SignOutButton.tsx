"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="mt-auto px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors text-right"
    >
      התנתקות
    </button>
  );
}
