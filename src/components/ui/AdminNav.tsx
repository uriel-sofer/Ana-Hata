"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/ui/SignOutButton";

const links = [
  { href: "/clients", label: "לקוחות" },
  { href: "/calendar", label: "לוח שנה" },
  { href: "/approvals", label: "בקשות ממתינות", badge: true },
  { href: "/settings", label: "הגדרות" },
];

export function AdminNav({ pendingCount }: { pendingCount: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = links.map(l => {
    const active = pathname === l.href;
    return (
      <Link
        key={l.href}
        href={l.href}
        onClick={() => setOpen(false)}
        className={`flex items-center justify-between px-3 py-2 rounded transition-colors ${
          active ? "bg-slate-700 text-white" : "hover:bg-slate-700 text-slate-300 hover:text-white"
        }`}
      >
        <span>{l.label}</span>
        {l.badge && pendingCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {pendingCount}
          </span>
        )}
      </Link>
    );
  });

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex w-56 bg-slate-900 text-white flex-col p-4 gap-1 shrink-0 min-h-screen">
        <Link href="/" className="font-bold text-lg mb-4 px-3 hover:text-slate-300 transition-colors">
          אנהאטה
        </Link>
        {navLinks}
        <div className="mt-auto pt-4">
          <SignOutButton />
        </div>
      </nav>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-slate-900 text-white flex items-center justify-between px-4 py-3">
        <Link href="/" className="font-bold text-lg">אנהאטה</Link>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {pendingCount}
            </span>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            className="p-1 rounded hover:bg-slate-700 transition-colors"
            aria-label="תפריט"
          >
            {open ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-20 flex" onClick={() => setOpen(false)}>
          <div className="w-64 bg-slate-900 text-white flex flex-col p-4 gap-1 pt-16" onClick={e => e.stopPropagation()}>
            {navLinks}
            <div className="mt-auto pt-4">
              <SignOutButton />
            </div>
          </div>
          <div className="flex-1 bg-black/40" />
        </div>
      )}
    </>
  );
}
