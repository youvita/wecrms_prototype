"use client";

import React from "react";
import { CORP_BATCHES, MERCHANTS } from "@/lib/data";
import type { CorpBatch } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { Badge, ConfirmModal, Icon, PageHeader, Toast, type ToastMsg } from "@/components/ui";

export default function MerchantsPage() {
  const [tab, setTab] = React.useState<"Merchants" | "Corporate batches">("Merchants");
  const [batches, setBatches] = React.useState<CorpBatch[]>(CORP_BATCHES);
  const [approve, setApprove] = React.useState<CorpBatch | null>(null);
  const [toast, setToast] = React.useState<ToastMsg>(null);

  const totalVolume = MERCHANTS.reduce((a, m) => a + m.todayVolume, 0);

  const doApprove = () => {
    if (!approve) return;
    setBatches(batches.map((b) => (b.id === approve.id ? { ...b, status: "Approved", checker: "Vitou L." } : b)));
    setToast({ message: `${approve.id} approved — ${approve.items} payments queued for execution`, type: "success" });
    setApprove(null);
  };

  return (
    <div className="page-enter space-y-5">
      <PageHeader title="Merchants & Corporate" subtitle="Merchant acquiring · corporate cash management"
        actions={
          <button onClick={() => setToast({ message: "Merchant onboarding (KYB) flow would start here", type: "info" })}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gold text-navy text-sm font-semibold rounded-lg hover:brightness-95">
            <Icon name="add_business" className="text-lg" /><span className="hidden sm:inline">New merchant</span>
          </button>
        } />

      {/* Tabs */}
      <div className="flex gap-1.5">
        {(["Merchants", "Corporate batches"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? "bg-gold text-navy shadow" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Merchants" && (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "storefront", label: "Active merchants", value: String(MERCHANTS.filter((m) => m.status === "Active").length) },
              { icon: "qr_code_2", label: "QR volume today", value: formatMoney(totalVolume, "USD") },
              { icon: "pending_actions", label: "In onboarding", value: String(MERCHANTS.filter((m) => m.status === "Onboarding").length) },
            ].map((c, i) => (
              <div key={c.label} className="stagger-item bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex items-center gap-4" style={{ animationDelay: `${i * 60}ms` }}>
                <Icon name={c.icon} className="text-primary-600 bg-primary-50 rounded-lg p-2.5 text-2xl" />
                <div>
                  <div className="text-xl font-extrabold text-slate-900">{c.value}</div>
                  <div className="text-sm text-slate-500">{c.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Merchant table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Merchant</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Acceptance</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Today&apos;s volume</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Settlement</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">KYB</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {MERCHANTS.map((m, i) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{m.name}</div>
                        <div className="text-xs text-slate-400">{m.id} · {m.owner}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{m.qr}</td>
                      <td className="px-4 py-3 text-right font-semibold">{m.todayVolume > 0 ? formatMoney(m.todayVolume, "USD") : "—"}</td>
                      <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{m.settlement}</td>
                      <td className="px-4 py-3"><Badge label={m.kyb} /></td>
                      <td className="px-4 py-3"><Badge label={m.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {m.status === "Active" ? (
                          <button onClick={() => setToast({ message: `Settlement report for ${m.name} downloaded`, type: "success" })}
                            className="text-xs font-semibold text-primary-600 hover:underline">Settlement report</button>
                        ) : (
                          <button onClick={() => setToast({ message: `KYB document checklist sent to ${m.owner}`, type: "success" })}
                            className="text-xs font-semibold text-amber-600 hover:underline">Chase documents</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "Corporate batches" && (
        <>
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
            <Icon name="verified_user" className="text-primary-600 text-lg" />
            Maker-checker control: batches created by a maker require a different authorized checker before execution. Your approvals are logged to the audit trail.
          </div>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Batch</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Type</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Items</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Total</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Maker / Checker</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {batches.map((b, i) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{b.client}</div>
                        <div className="text-xs text-slate-400">{b.id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{b.type}</td>
                      <td className="px-4 py-3 text-right">{b.items}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatMoney(b.total, b.ccy)}</td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{b.maker} / {b.checker}</td>
                      <td className="px-4 py-3"><Badge label={b.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {b.status === "Awaiting Approval" ? (
                          <button onClick={() => setApprove(b)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700">Review &amp; approve</button>
                        ) : b.status === "Approved" ? (
                          <button onClick={() => {
                            setBatches(batches.map((x) => (x.id === b.id ? { ...x, status: "Executed" } : x)));
                            setToast({ message: `${b.id} executed — payment advice sent to ${b.client}`, type: "success" });
                          }} className="px-3 py-1.5 bg-gold text-navy text-xs font-semibold rounded-lg hover:brightness-95">Execute</button>
                        ) : (
                          <button onClick={() => setToast({ message: `Execution report for ${b.id} downloaded`, type: "success" })}
                            className="text-xs font-semibold text-primary-600 hover:underline">Report</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {approve && (
        <ConfirmModal
          title={`Approve ${approve.id}?`}
          message={`${approve.type} for ${approve.client} — ${approve.items} payments totaling ${formatMoney(approve.total, approve.ccy)}. Maker: ${approve.maker}. You will be recorded as checker.`}
          confirmLabel="Approve as checker" onConfirm={doApprove} onCancel={() => setApprove(null)} />
      )}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
