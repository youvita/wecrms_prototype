"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CURRENT_USER } from "@/lib/data";
import { getInitial } from "@/lib/format";
import { Icon } from "./ui";

const MENU = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
  { label: "Customers", icon: "group", href: "/customers" },
  { label: "Onboarding", icon: "person_add", href: "/onboarding" },
  { label: "Lending", icon: "account_balance", href: "/lending" },
  { label: "Payments", icon: "qr_code_2", href: "/payments" },
  { label: "Support", icon: "support_agent", href: "/support" },
  { label: "Merchants & Corporate", icon: "storefront", href: "/merchants" },
];

const LANGS = ["EN", "ខ្មែរ", "한국어"];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-navy text-white z-40 transform transition-transform lg:relative lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-gold text-navy flex items-center justify-center text-lg font-black">★</span>
          <div>
            <div className="text-lg font-bold leading-tight">WeCRM365</div>
            <div className="text-[10px] tracking-widest text-gold/80 uppercase">KB PRASAC Bank</div>
          </div>
        </div>
        <nav className="px-3 py-4 space-y-1">
          {MENU.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-gold text-navy shadow font-semibold" : "text-stone-300/80 hover:bg-white/10 hover:text-white"}`}>
                <Icon name={item.icon} className="text-xl" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gold text-navy flex items-center justify-center text-sm font-bold">
              {getInitial(CURRENT_USER.name)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{CURRENT_USER.name}</div>
              <div className="text-xs text-stone-300/70 truncate">{CURRENT_USER.role}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const [lang, setLang] = React.useState("EN");
  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sticky top-0 z-20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button className="lg:hidden text-slate-600" onClick={onMenuClick} aria-label="Open menu">
            <Icon name="menu" />
          </button>
        </div>
        <div className="flex items-center gap-3 flex-none">
          <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-0.5" title="Interface language (visual only in this prototype)">
            {LANGS.map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${lang === l ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"} ${l !== "EN" ? "font-khmer" : ""}`}>
                {l}
              </button>
            ))}
          </div>
          <Icon name="notifications" className="text-slate-400 cursor-pointer hover:text-slate-600" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gold text-navy flex items-center justify-center text-sm font-bold">
              {getInitial(CURRENT_USER.name)}
            </div>
            <div className="hidden xl:block text-xs leading-tight">
              <div className="font-semibold text-slate-800">{CURRENT_USER.role}</div>
              <div className="text-slate-400">{CURRENT_USER.branch}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function ConsoleShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
