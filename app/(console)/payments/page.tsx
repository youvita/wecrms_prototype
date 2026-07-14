"use client";

import React from "react";
import { TRANSACTIONS } from "@/lib/data";
import type { Txn } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { Badge, ConfirmModal, EmptyState, Icon, PageHeader, Toast, type ToastMsg } from "@/components/ui";

const CHANNELS = ["All", "KHQR", "Bakong", "Transfer", "Bill"];

export default function PaymentsPage() {
  const [channel, setChannel] = React.useState("All");
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState<Txn | null>(null);
  const [refund, setRefund] = React.useState<Txn | null>(null);
  const [toast, setToast] = React.useState<ToastMsg>(null);
  const [qrTab, setQrTab] = React.useState<"Static" | "Dynamic">("Static");
  const [qrAmt, setQrAmt] = React.useState("12.50");
  const [txns, setTxns] = React.useState<Txn[]>(TRANSACTIONS);

  const rows = txns.filter((t) =>
    (channel === "All" || t.channel === channel) &&
    (!q || (t.customer + t.counterparty + t.id).toLowerCase().includes(q.toLowerCase()))
  );

  const doRefund = () => {
    if (!refund) return;
    setTxns(txns.map((t) => (t.id === refund.id ? { ...t, status: "Reversed" } : t)));
    setToast({ message: `${refund.id} refunded — customer notified, funds return in 1-2 business days`, type: "success" });
    setRefund(null); setSel(null);
  };

  return (
    <div className="page-enter space-y-4">
      <PageHeader title="Payments" subtitle="Transactions · KHQR · Bakong · transfers · bills" />

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-5 items-start">
        {/* Left: transactions */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer, counterparty or TXN id…"
                className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
            </div>
            <div className="flex gap-1.5">
              {CHANNELS.map((c) => (
                <button key={c} onClick={() => setChannel(c)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${channel === c ? "bg-primary-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {rows.length === 0 ? (
              <EmptyState icon="receipt_long" message="No transactions match the filters" actionLabel="Clear filters"
                onAction={() => { setQ(""); setChannel("All"); }} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Time</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Customer</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Counterparty</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Channel</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Amount</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rows.map((t, i) => (
                      <tr key={t.id} onClick={() => setSel(t)}
                        className={`cursor-pointer transition-colors stagger-item ${sel?.id === t.id ? "bg-primary-50" : "hover:bg-slate-50"}`}
                        style={{ animationDelay: `${i * 35}ms` }}>
                        <td className="px-4 py-3 text-slate-500">{t.time}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{t.customer}</td>
                        <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{t.counterparty}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600">{t.channel}</span>
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${t.amount > 0 ? "text-green-600" : "text-slate-800"}`}>
                          {t.amount > 0 ? "+" : ""}{formatMoney(Math.abs(t.amount), t.ccy)}
                        </td>
                        <td className="px-4 py-3"><Badge label={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: detail + QR generator */}
        <div className="space-y-5">
          {sel ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 page-enter">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 text-sm">Transaction detail</h3>
                <button onClick={() => setSel(null)} aria-label="Close detail">
                  <Icon name="close" className="text-slate-400 hover:text-slate-600 text-xl" />
                </button>
              </div>
              <div className={`text-2xl font-extrabold mb-1 ${sel.amount > 0 ? "text-green-600" : "text-slate-900"}`}>
                {sel.amount > 0 ? "+" : ""}{formatMoney(Math.abs(sel.amount), sel.ccy)}
              </div>
              <div className="text-sm text-slate-500 mb-4">{sel.type}</div>
              <div className="space-y-2 text-sm border-t border-slate-100 pt-4">
                {[["TXN ID", sel.id], ["Customer", sel.customer], ["Counterparty", sel.counterparty], ["Channel", sel.channel], ["Time", `Today ${sel.time}`], ["Status", sel.status]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <span className="text-slate-500">{k}</span><span className="font-semibold text-slate-800 text-right">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setToast({ message: "Receipt sent to customer (push + email)", type: "success" })}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">Send receipt</button>
                {sel.status === "Success" && sel.amount < 0 && sel.channel === "KHQR" && (
                  <button onClick={() => setRefund(sel)} className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">Initiate refund</button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl">
              <EmptyState icon="receipt" message="Select a transaction to see details" />
            </div>
          )}

          {/* KHQR generator */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">KHQR generator</h3>
            <div className="flex gap-1.5 mb-4">
              {(["Static", "Dynamic"] as const).map((t) => (
                <button key={t} onClick={() => setQrTab(t)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${qrTab === t ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {t} QR
                </button>
              ))}
            </div>
            {qrTab === "Dynamic" && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Amount (USD)</label>
                <input value={qrAmt} onChange={(e) => setQrAmt(e.target.value)} inputMode="decimal"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
              </div>
            )}
            <div className="flex flex-col items-center bg-slate-50 rounded-xl p-5">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                <div className="w-36 h-36 qr-mock rounded" />
              </div>
              <div className="text-xs text-slate-500 mt-3 text-center">
                <div className="font-bold text-slate-700">KHQR · Bakong-interoperable</div>
                {qrTab === "Dynamic"
                  ? <div>Fixed amount: <b>${qrAmt || "0.00"}</b> · single use</div>
                  : <div>Any amount · reusable · KHR + USD</div>}
              </div>
              <button onClick={() => setToast({ message: `${qrTab} KHQR generated & sent to customer app`, type: "success" })}
                className="mt-4 px-4 py-2 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700">Generate &amp; share</button>
            </div>
          </div>
        </div>
      </div>

      {refund && (
        <ConfirmModal
          title={`Refund ${refund.id}?`}
          message={`Refund ${formatMoney(Math.abs(refund.amount), refund.ccy)} to ${refund.customer} for the ${refund.counterparty} payment. This creates a reversal transaction and notifies the customer.`}
          confirmLabel="Confirm refund" variant="danger" onConfirm={doRefund} onCancel={() => setRefund(null)} />
      )}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
