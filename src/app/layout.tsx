import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Anahata | מרכז טיפול במים",
  description: "מערכת ניהול תורים ולקוחות עבור מרכז אנהאטה לטיפול במים",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
