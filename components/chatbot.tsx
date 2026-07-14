"use client";

import React from "react";
import { CUSTOMERS } from "@/lib/data";
import { Icon } from "./ui";

type Msg = { role: "bot" | "user"; text: string };
type Cust = (typeof CUSTOMERS)[number];

const SUGGESTIONS = [
  "How many customers use insurance?",
  "Where do I see a customer's services?",
  "How do I add a new customer?",
  "What can this CRM do?",
];

const svcMatchers: { keys: string[]; test: (c: Cust) => boolean; label: string }[] = [
  { keys: ["insurance", "policy", "policies"], test: (c) => c.insurance.length > 0, label: "insurance" },
  { keys: ["saving"], test: (c) => c.accounts.some((a) => a.type.startsWith("Savings")), label: "a savings account" },
  { keys: ["current account"], test: (c) => c.accounts.some((a) => a.type.startsWith("Current")), label: "a current account" },
  { keys: ["fixed", "deposit", " fd"], test: (c) => c.accounts.some((a) => a.type.includes("Fixed Deposit")), label: "a fixed deposit" },
  { keys: ["loan"], test: (c) => c.loans.length > 0, label: "a loan" },
  { keys: ["card"], test: (c) => c.cards.length > 0, label: "a card" },
  { keys: ["invest"], test: (c) => c.investments.length > 0, label: "investments" },
  { keys: ["digital", "mobile banking", "e-banking", "ebanking"], test: (c) => c.ebanking.includes("Mobile Banking"), label: "digital banking" },
];

// Simulated assistant — answers functionality & portfolio questions from the mock data.
function respond(text: string): string {
  const q = text.toLowerCase();
  const total = CUSTOMERS.length;

  const m = svcMatchers.find((sm) => sm.keys.some((k) => q.includes(k)));
  if (m && /how many|count|use|using|adopt|%|percent|have|hold/.test(q)) {
    const n = CUSTOMERS.filter(m.test).length;
    return `${n} of ${total} customers in your book currently hold ${m.label} (${Math.round((n / total) * 100)}%). The full breakdown is on the Overview → "Service adoption" panel.`;
  }
  if (/new customer|create|onboard|register|ekyc|sign ?up|add.*customer/.test(q))
    return "New retail customers self-register in the Mobile eKYC app: NID / passport scan → liveness → screening → activate. The web CRM is view-only — open Customers → “Mobile eKYC demo” to preview that flow.";
  if (/cross.?sell|offer|opportunit/.test(q))
    return "Two places: the Overview lists cross-sell gaps across your book (e.g. loan customers with no insurance), and each Customer 360° flags unused services with an amber “Offer” tag.";
  if (/service|using|what.*use|holding|product/.test(q))
    return "Open a customer from the Customers list — their 360° has a “Services in use” panel showing exactly what they hold (Savings, Cards, Loans, Insurance, Digital banking, Payments…) and what to offer.";
  if (/edit|change|update|modify|\bsave\b|delete|create service/.test(q))
    return "This CRM is view-only for relationship officers — you can't edit customer or product data here. Edits happen in core banking; new customers arrive via the Mobile eKYC app.";
  if (/360|profile|detail/.test(q))
    return "Customers → click a row to open Customer 360°: identity, product holdings, services in use, plus read-only tabs for Accounts, Cards, Loans, Invest & Insure, Interactions and Security.";
  if (/overview|dashboard|segment|adoption|portfolio/.test(q))
    return "The Overview is your portfolio lens: relationship KPIs, service adoption across your whole book, segment mix, cross-sell opportunities and top relationships by value.";
  if (/how many customers|total customer/.test(q))
    return `You have ${total} customers in your portfolio. Open the Overview for the segment mix and service adoption.`;
  if (/hello|^hi\b|hey|help|what can|who are you/.test(q))
    return "I'm the KB PRASAC assistant. I can explain what this CRM does and answer portfolio questions. Try: “How many customers use insurance?”, “Where do I see a customer's services?”, or “How do I add a new customer?”.";
  return "I can help with the CRM's functionalities and your portfolio. Ask about service adoption, cross-sell opportunities, Customer 360°, or Mobile eKYC registration.";
}

export function Chatbot() {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [msgs, setMsgs] = React.useState<Msg[]>([
    { role: "bot", text: "Hi 👋 I'm the KB PRASAC assistant. Ask me anything about what this CRM can do or about your customer portfolio." },
  ]);
  const endRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setMsgs((m) => [...m, { role: "user", text: t }, { role: "bot", text: respond(t) }]);
    setInput("");
  };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Open assistant"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gold text-navy shadow-lg flex items-center justify-center hover:brightness-95 active:scale-95 transition-all">
          <Icon name="smart_toy" className="text-2xl" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[22rem] max-w-[calc(100vw-2rem)] h-[30rem] max-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden modal-enter">
          <div className="bg-navy text-white px-4 py-3 flex items-center gap-2 flex-none">
            <span className="w-8 h-8 rounded-lg bg-gold text-navy flex items-center justify-center"><Icon name="smart_toy" className="text-lg" /></span>
            <div className="flex-1">
              <div className="text-sm font-bold leading-tight">KB PRASAC Assistant</div>
              <div className="text-[10px] text-gold/80 uppercase tracking-widest">Ask about functionalities</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close assistant" className="text-white/70 hover:text-white"><Icon name="close" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.role === "user" ? "bg-gold text-navy rounded-br-sm" : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {msgs.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-100 transition-colors">{s}</button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="p-3 border-t border-slate-100 flex items-center gap-2 flex-none">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Ask about a functionality…"
              className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
            <button onClick={() => send(input)} aria-label="Send message" className="w-9 h-9 rounded-lg bg-gold text-navy flex items-center justify-center hover:brightness-95 flex-none"><Icon name="send" className="text-lg" /></button>
          </div>
        </div>
      )}
    </>
  );
}
