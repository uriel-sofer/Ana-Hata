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

    if (profile?.role === "admin") redirect("/clients");
    if (profile?.role === "therapist") redirect("/therapist/calendar");
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">אנהאטה</h1>
        <p className="text-slate-500 text-lg">מרכז טיפול במים</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link
          href="/book"
          className="block border-2 border-blue-500 rounded-2xl p-6 text-center hover:bg-blue-50 transition-colors"
        >
          <p className="text-xl font-semibold text-blue-700">הזמני טיפול</p>
          <p className="text-sm text-slate-500 mt-1">לקוחות – קביעת תור לטיפול</p>
        </Link>

        <Link
          href="/rent"
          className="block border-2 border-teal-500 rounded-2xl p-6 text-center hover:bg-teal-50 transition-colors"
        >
          <p className="text-xl font-semibold text-teal-700">השכרת בריכה</p>
          <p className="text-sm text-slate-500 mt-1">מטפלים – הזמנת זמן בבריכה</p>
        </Link>
      </div>

      <div className="mt-10">
        <Link href="/auth/login" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          כניסה לצוות ←
        </Link>
      </div>
    </div>
  );
}
