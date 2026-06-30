export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") redirect("/calendar");
    if (profile?.role === "therapist") redirect("/therapist/calendar");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 via-white to-white flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-2 text-5xl select-none">🌊</div>
        <h1 className="text-5xl font-bold text-slate-800 tracking-tight mb-3">אנהאטה</h1>
        <p className="text-slate-500 text-xl mb-12">מרכז טיפול במים</p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-md">
          <Link
            href="/book"
            className="flex-1 flex flex-col items-center gap-2 border-2 border-blue-400 rounded-2xl p-7 text-center hover:bg-blue-50 hover:border-blue-500 transition-all shadow-sm hover:shadow-md"
          >
            <span className="text-3xl">💆</span>
            <p className="text-lg font-semibold text-blue-700">הזמני טיפול</p>
            <p className="text-sm text-slate-500">לקוחות – קביעת תור לטיפול</p>
          </Link>

          <Link
            href="/rent"
            className="flex-1 flex flex-col items-center gap-2 border-2 border-teal-400 rounded-2xl p-7 text-center hover:bg-teal-50 hover:border-teal-500 transition-all shadow-sm hover:shadow-md"
          >
            <span className="text-3xl">🏊</span>
            <p className="text-lg font-semibold text-teal-700">השכרת בריכה</p>
            <p className="text-sm text-slate-500">מטפלים – הזמנת זמן בבריכה</p>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center pb-8">
        <Link href="/auth/login" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          כניסה לצוות ←
        </Link>
      </footer>
    </div>
  );
}
