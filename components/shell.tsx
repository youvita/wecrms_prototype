"use client";

import React from "react";
import Link from "next/link";
import { CURRENT_USER } from "@/lib/data";
import { getInitial } from "@/lib/format";
import { Chatbot } from "./chatbot";
import { AlertsMenu } from "./alerts-menu";

const LANGS = ["EN", "ខ្មែរ", "한국어"];

function Topbar() {
  const [lang, setLang] = React.useState("EN");

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/customers" className="flex items-center gap-2.5 flex-none">
          <span className="w-9 h-9 rounded-lg bg-gold text-navy flex items-center justify-center text-lg font-black">★</span>
          <div className="hidden sm:block leading-tight">
            <div className="text-base font-extrabold text-slate-900">WeCRM365</div>
            <div className="text-[10px] tracking-widest text-slate-400 uppercase">KB PRASAC Bank</div>
          </div>
        </Link>

        {/* Right: language · notifications · user */}
        <div className="flex items-center gap-3 flex-none">
          <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-0.5" title="Interface language (visual only in this prototype)">
            {LANGS.map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${lang === l ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"} ${l !== "EN" ? "font-khmer" : ""}`}>
                {l}
              </button>
            ))}
          </div>
          <AlertsMenu />
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
  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <main className="p-4 sm:p-6">{children}</main>
      <Chatbot />
    </div>
  );
}
