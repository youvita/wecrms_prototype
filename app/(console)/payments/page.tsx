"use client";

import React from "react";
import { createPortal } from "react-dom";
import { TRANSACTIONS } from "@/lib/data";
import type { Txn } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { Badge, ConfirmModal, EmptyState, Icon, PageHeader, Toast, type ToastMsg } from "@/components/ui";

const CHANNELS = ["All", "KHQR", "Bakong", "Transfer", "Bill"];
const QR_TABS = ["Static", "Dynamic", "Merchant", "Cross-border"] as const;
type QrTab = (typeof QR_TABS)[number];

const payInput = "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600";

// Money-movement flows — each maps to a Txn channel and a set of sub-types (taxonomy functionalities).
type Flow = { label: string; channel: Txn["channel"]; recipientLabel: string; subLabel: string; subs: string[]; inflow: boolean; verb: string; note?: string };
const F_DOM: Flow = { label: "Domestic transfer", channel: "Transfer", recipientLabel: "Recipient (account / phone)", subLabel: "Transfer type", subs: ["Own account", "Same-bank", "Interbank (FAST)", "Interbank (RFT)", "By account number", "By phone number", "By favorites"], inflow: false, verb: "Send" };
const F_INTL: Flow = { label: "International transfer", channel: "Transfer", recipientLabel: "Beneficiary (IBAN / SWIFT)", subLabel: "Type", subs: ["SWIFT transfer", "Remittance out", "Remittance in"], inflow: false, verb: "Send", note: "Indicative FX · 1 USD = 4,100 KHR" };
const F_BILL: Flow = { label: "Bill payment", channel: "Bill", recipientLabel: "Biller account / reference", subLabel: "Biller", subs: ["Utility (EDC)", "Telecom", "Tuition", "Insurance", "Government tax"], inflow: false, verb: "Pay" };
const F_TOPUP: Flow = { label: "Mobile top-up", channel: "Bill", recipientLabel: "Mobile number", subLabel: "Type", subs: ["Prepaid", "Postpaid", "eSIM", "Data package"], inflow: false, verb: "Top up" };
const F_REQ: Flow = { label: "Payment request", channel: "Transfer", recipientLabel: "From (payer)", subLabel: "Type", subs: ["Request money", "Split bill", "Group collection"], inflow: true, verb: "Request" };

type SvcItem = { label: string; flow?: Flow; sub?: string };
const SERVICES: { cap: string; icon: string; items: SvcItem[] }[] = [
  { cap: "Domestic Transfer", icon: "swap_horiz", items: F_DOM.subs.map((s) => ({ label: s, flow: F_DOM, sub: s })) },
  { cap: "International Transfer", icon: "public", items: [
    { label: "SWIFT transfer", flow: F_INTL, sub: "SWIFT transfer" }, { label: "Remittance out", flow: F_INTL, sub: "Remittance out" }, { label: "Remittance in", flow: F_INTL, sub: "Remittance in" },
    { label: "Correspondent partners" }, { label: "Exchange-rate display" }, { label: "Transfer tracking" },
  ] },
  { cap: "Bill Aggregator", icon: "receipt_long", items: [...F_BILL.subs.map((s) => ({ label: s, flow: F_BILL, sub: s })), { label: "Saved billers" }] },
  { cap: "Mobile Top-up", icon: "smartphone", items: [...F_TOPUP.subs.map((s) => ({ label: s, flow: F_TOPUP, sub: s })), { label: "Cross-operator" }] },
  { cap: "Payment Request", icon: "request_quote", items: F_REQ.subs.map((s) => ({ label: s, flow: F_REQ, sub: s })) },
  { cap: "Scheduled & Recurring", icon: "event_repeat", items: [{ label: "Future-dated" }, { label: "One-time schedule" }, { label: "Standing order" }, { label: "Auto-debit" }, { label: "Subscription" }] },
  { cap: "Central Infrastructure", icon: "hub", items: [{ label: "Wallet link" }, { label: "Interbank wallet transfers" }, { label: "System top-up" }, { label: "P2P messaging" }] },
  { cap: "Cardless Withdrawal", icon: "atm", items: [{ label: "Send-cash code" }, { label: "ATM redemption" }] },
];

function PayModal({ flow, presetSub, seq, onClose, onSubmit }: {
  flow: Flow; presetSub: string; seq: number; onClose: () => void; onSubmit: (t: Txn) => void;
}) {
  const [customer, setCustomer] = React.useState("Sok Dara");
  const [sub, setSub] = React.useState(presetSub);
  const [recipient, setRecipient] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [ccy, setCcy] = React.useState<"USD" | "KHR">("USD");
  const [err, setErr] = React.useState("");

  const submit = () => {
    if (!recipient.trim()) { setErr(`${flow.recipientLabel} is required`); return; }
    const amt = Number(amount.replace(/,/g, ""));
    if (!amt) { setErr("Enter a valid amount"); return; }
    const inflow = flow.inflow || /remittance in/i.test(sub);
    onSubmit({ id: `TXN-${89000 + seq}`, time: "now", customer: customer.trim() || "—", type: `${flow.label} · ${sub}`, channel: flow.channel, amount: inflow ? amt : -amt, ccy, counterparty: recipient.trim(), status: "Success" });
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 modal-enter" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{flow.label}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Icon name="close" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">From customer</label>
              <input value={customer} onChange={(e) => setCustomer(e.target.value)} className={payInput} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{flow.subLabel}</label>
              <select value={sub} onChange={(e) => setSub(e.target.value)} className={payInput}>{flow.subs.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{flow.recipientLabel}</label>
            <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="…" className={payInput} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="e.g. 50" className={payInput} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Currency</label>
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {(["USD", "KHR"] as const).map((c) => (
                  <button key={c} onClick={() => setCcy(c)} className={`flex-1 py-2 rounded-md text-xs font-semibold transition-colors ${ccy === c ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>{c}</button>
                ))}
              </div>
            </div>
          </div>
          {flow.note && <p className="text-xs text-slate-400">{flow.note}</p>}
          {err && <div className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{err}</div>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} className="px-5 py-2 bg-gold text-navy rounded-lg text-sm font-bold hover:brightness-95">{flow.verb} now</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function PaymentsPage() {
  const [channel, setChannel] = React.useState("All");
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState<Txn | null>(null);
  const [refund, setRefund] = React.useState<Txn | null>(null);
  const [toast, setToast] = React.useState<ToastMsg>(null);
  const [qrTab, setQrTab] = React.useState<QrTab>("Static");
  const [qrAmt, setQrAmt] = React.useState("12.50");
  const [txns, setTxns] = React.useState<Txn[]>(TRANSACTIONS);
  const [flow, setFlow] = React.useState<{ flow: Flow; sub: string } | null>(null);

  const openSvc = (it: SvcItem) => {
    if (it.flow) setFlow({ flow: it.flow, sub: it.sub || it.flow.subs[0] });
    else setToast({ message: `${it.label} — flow would open here`, type: "info" });
  };
  const submitPay = (t: Txn) => {
    setTxns([t, ...txns]);
    setFlow(null);
    setToast({ message: `${t.type} · ${formatMoney(Math.abs(t.amount), t.ccy)} ${t.amount < 0 ? "sent" : "requested"} — ${t.id}`, type: "success" });
  };

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
      <PageHeader title="Payments" subtitle="Transactions · KHQR · Bakong · transfers · bills"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setToast({ message: "QR scanner opened — point at a KHQR to pay", type: "info" })} className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"><Icon name="qr_code_scanner" className="text-base" /><span className="hidden sm:inline">Scan QR</span></button>
            <button onClick={() => setFlow({ flow: F_DOM, sub: F_DOM.subs[0] })} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gold text-navy text-sm font-bold rounded-lg shadow-sm hover:brightness-95 active:scale-[0.98] transition-all"><Icon name="add" className="text-lg" /><span className="hidden sm:inline">New payment</span></button>
          </div>
        } />

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
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${channel === c ? "bg-gold text-navy" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
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
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {QR_TABS.map((t) => (
                <button key={t} onClick={() => setQrTab(t)}
                  className={`px-2 py-2 rounded-lg text-[11px] font-semibold transition-colors ${qrTab === t ? "bg-gold text-navy" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {t}
                </button>
              ))}
            </div>
            {(qrTab === "Dynamic" || qrTab === "Cross-border") && (
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
                {qrTab === "Dynamic" ? <div>Fixed amount: <b>${qrAmt || "0.00"}</b> · single use</div>
                  : qrTab === "Merchant" ? <div>Merchant-presented · settles to merchant account</div>
                  : qrTab === "Cross-border" ? <div>Fixed <b>${qrAmt || "0.00"}</b> · accepts TH / VN / LA wallets · FX at settlement</div>
                  : <div>Any amount · reusable · KHR + USD</div>}
              </div>
              <button onClick={() => setToast({ message: `${qrTab} KHQR generated & sent to customer app`, type: "success" })}
                className="mt-4 px-4 py-2 bg-gold text-navy text-xs font-semibold rounded-lg hover:brightness-95">Generate &amp; share</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {([["Scan QR", "qr_code_scanner"], ["QR limit", "tune"], ["Offline QR", "cloud_off"]] as const).map(([l, ic]) => (
                <button key={l} onClick={() => setToast({ message: `${l} — feature would open here`, type: "info" })}
                  className="flex flex-col items-center gap-1 px-2 py-2 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
                  <Icon name={ic} className="text-base" /> {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Payment services — full taxonomy of capabilities */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-slate-900 text-sm mb-4">Payment services</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
          {SERVICES.map((g) => (
            <div key={g.cap}>
              <div className="flex items-center gap-2 mb-2">
                <Icon name={g.icon} className="text-primary-600 text-lg" />
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{g.cap}</h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((it) => (
                  <button key={it.label} onClick={() => openSvc(it)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${it.flow ? "bg-primary-50 text-primary-700 hover:bg-primary-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {it.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {flow && <PayModal flow={flow.flow} presetSub={flow.sub} seq={txns.length} onClose={() => setFlow(null)} onSubmit={submitPay} />}
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
