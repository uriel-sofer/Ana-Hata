import Link from "next/link";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-lg">Anahata</span>
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
