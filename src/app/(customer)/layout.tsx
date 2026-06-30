import Link from "next/link";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white">
      <header className="bg-white/80 backdrop-blur border-b px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-slate-800 hover:text-slate-600 transition-colors">
          <span>🌊</span>
          <span>אנהאטה</span>
        </Link>
        <Link
          href="/auth/login"
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          כניסה לצוות
        </Link>
      </header>
      <main>{children}</main>
    </div>
  );
}
