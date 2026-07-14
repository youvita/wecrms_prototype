import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WeCRM365 — Banking CRMS",
  description: "Staff console for customer management — Cambodian retail banking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
