"use client";

import React from "react";
import Link from "next/link";
import { CASES } from "@/lib/data";
import type { SupportCase } from "@/lib/types";
import { AiPanel, Badge, ConfirmModal, EmptyState, Icon, PageHeader, Toast, type ToastMsg } from "@/components/ui";

function SlaBadge({ c }: { c: SupportCase }) {
  const style = c.slaState === "breach" ? "bg-red-100 text-red-700"
    : c.slaState === "warning" ? "bg-amber-100 text-amber-700"
    : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>
      <Icon name={c.slaState === "breach" ? "timer_off" : "timer"} className="text-sm" />
      {c.sla}
    </span>
  );
}

function aiSuggestion(c: SupportCase): string {
  const first = c.customer.split(" ")[0];
  if (c.category === "Cards") return `Hi ${first}, I have verified your identity and unblocked your card — it is ready to use immediately. For security, three wrong PIN attempts trigger an automatic block. You can also reset your PIN anytime in the app under Cards → Set PIN. Anything else I can help with?`;
  if (c.category === "Payments") return `Hi ${first}, I confirmed the duplicate charge of $38.00 (TXN-88171). A reversal has been initiated and the amount will return to your account within 1–2 business days. You will receive a push notification when it lands.`;
  if (c.category === "Merchant") return "Hello, apologies for the missing July 11 settlement report. The generation job has been re-run and the report was emailed at 16:20 today. We have added monitoring so this does not recur.";
  return `Hi ${first}, your daily transfer limit increase to $20,000 has been submitted for approval. Expect confirmation within 1 business day; a temporary limit is active for your property payment window.`;
}

export default function SupportPage() {
  const [cases, setCases] = React.useState<SupportCase[]>(CASES);
  const [selId, setSelId] = React.useState<string>(CASES[0].id);
  const [reply, setReply] = React.useState("");
  const [toast, setToast] = React.useState<ToastMsg>(null);
  const [filter, setFilter] = React.useState("All");
  const [escalate, setEscalate] = React.useState<SupportCase | null>(null);

  const sel = cases.find((c) => c.id === selId) ?? cases[0];
  const rows = filter === "All" ? cases : filter === "Mine" ? cases.filter((c) => c.assignee === "You") : cases.filter((c) => c.slaState !== "ok");

  const send = () => {
    if (!reply.trim()) return;
    setCases(cases.map((c) => c.id === sel.id
      ? { ...c, thread: [...c.thread, { who: "Agent" as const, when: "now", text: reply }], status: "In Progress" }
      : c));
    setReply("");
    setToast({ message: "Reply sent via app chat + email", type: "success" });
  };

  const resolve = () => {
    setCases(cases.map((c) => (c.id === sel.id ? { ...c, status: "Resolved" } : c)));
    setToast({ message: `${sel.id} resolved — CSAT survey sent to customer`, type: "success" });
  };

  const doEscalate = () => {
    if (!escalate) return;
    setCases(cases.map((c) => (c.id === escalate.id ? { ...c, status: "Escalated", assignee: "Tier 2" } : c)));
    setToast({ message: `${escalate.id} escalated to Tier 2 with full context`, type: "success" });
    setEscalate(null);
  };

  return (
    <div className="page-enter space-y-4">
      <PageHeader title="Support" subtitle="Cases & complaints — omnichannel queue" />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-5 items-start">
        {/* Queue */}
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {["All", "Mine", "SLA risk"].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${filter === f ? "bg-gold text-navy" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                {f}
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl">
              <EmptyState icon="task_alt" message="No cases in this view" />
            </div>
          ) : rows.map((c, i) => (
            <div key={c.id} onClick={() => setSelId(c.id)}
              className={`bg-white border rounded-xl p-4 cursor-pointer transition-all stagger-item ${sel.id === c.id ? "border-primary-400 ring-2 ring-primary-100" : "border-slate-200 hover:shadow-md hover:-translate-y-0.5"}`}
              style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-slate-400">{c.id}</span>
                <SlaBadge c={c} />
              </div>
              <div className="text-sm font-semibold text-slate-800 leading-snug">{c.subject}</div>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <Badge label={c.status} /><Badge label={c.priority} />
                <span className="text-xs text-slate-400">· {c.customer} · {c.assignee}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Case detail */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden lg:sticky lg:top-20">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900">{sel.subject}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {sel.id} ·{" "}
                  <Link href={`/customers/${sel.cif}`} className="text-primary-600 font-semibold hover:underline">{sel.customer}</Link>{" "}
                  · opened {sel.created}
                </div>
              </div>
              <div className="flex gap-2 flex-none">
                <button onClick={() => setEscalate(sel)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">Escalate</button>
                <button onClick={resolve} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700">Resolve</button>
              </div>
            </div>
          </div>

          {/* Thread */}
          <div className="p-5 space-y-4 max-h-72 overflow-y-auto bg-slate-50/60">
            {sel.thread.map((m, i) => (
              <div key={i} className={`flex ${m.who === "Agent" ? "justify-end" : ""}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${m.who === "Agent" ? "bg-gold text-navy rounded-br-sm" : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"}`}>
                  <div className={`text-[10px] font-bold mb-0.5 ${m.who === "Agent" ? "text-primary-200" : "text-slate-400"}`}>{m.who} · {m.when}</div>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* AI assist */}
          <div className="px-5 pt-4">
            <AiPanel title="AI suggested reply"
              action={<button onClick={() => setReply(aiSuggestion(sel))} className="text-xs font-semibold text-primary-700 hover:underline">Use this</button>}>
              {aiSuggestion(sel)}
            </AiPanel>
          </div>

          {/* Composer */}
          <div className="p-5">
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3}
              placeholder="Write a reply — sent to the customer's app chat and email…"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Icon name="forum" className="text-lg" />Replies go to App Chat · Email · SMS summary
              </div>
              <button onClick={send} disabled={!reply.trim()}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${reply.trim() ? "bg-gold text-navy hover:brightness-95" : "bg-slate-300 text-slate-500 cursor-not-allowed"}`}>
                Send reply
              </button>
            </div>
          </div>
        </div>
      </div>

      {escalate && (
        <ConfirmModal
          title={`Escalate ${escalate.id} to Tier 2?`}
          message="Full case context, customer 360° link and thread history will be attached. SLA clock continues running."
          confirmLabel="Escalate" variant="danger" onConfirm={doEscalate} onCancel={() => setEscalate(null)} />
      )}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
