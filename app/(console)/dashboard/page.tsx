"use client";

import React from "react";
import Link from "next/link";
import { KPIS, LOAN_PIPELINE, TRANSACTIONS } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { Badge, Icon, PageHeader, Skeleton } from "@/components/ui";

const HOURS = ["8am", "9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm"];
const VOLUME = [420, 610, 890, 1240, 980, 760, 1105, 1310];
const CHANNELS = [
  { name: "KHQR", pct: 46, color: "bg-primary-600" },
  { name: "Bakong", pct: 22, color: "bg-primary-400" },
  { name: "Transfers", pct: 18, color: "bg-amber-500" },
  { name: "Bills & Top-up", pct: 14, color: "bg-slate-400" },
];
const STAGES = ["Application", "CBC Pull", "Credit Check", "Approval", "Disbursement"];

export default function DashboardPage() {
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const max = Math.max(...VOLUME);

  const kpiCards = [
    { icon: "group", label: "Total customers", value: KPIS.customers.toLocaleString(), delta: KPIS.customersDelta, tone: "text-green-600" },
    { icon: "account_balance", label: "Active loans", value: KPIS.activeLoans.toLocaleString(), delta: KPIS.loansDelta, tone: "text-green-600" },
    { icon: "swap_horiz", label: "Transactions today", value: KPIS.todayTxns.toLocaleString(), delta: KPIS.txnsDelta, tone: "text-green-600" },
    { icon: "support_agent", label: "Open cases", value: String(KPIS.openCases), delta: KPIS.casesDelta, tone: "text-amber-600" },
  ];

  return (
    <div className="page-enter space-y-6">
      <PageHeader title="Dashboard" subtitle="Monday, July 13 2026 · Phnom Penh HQ"
        actions={
          <Link href="/onboarding" className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700">
            <Icon name="person_add" className="text-lg" />New customer
          </Link>
        } />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} type="card" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((c, i) => (
            <div key={c.label} className="stagger-item bg-white border border-slate-200 rounded-xl shadow-sm p-5" style={{ animationDelay: `${i * 60}ms` }}>
              <Icon name={c.icon} className="text-primary-600 bg-primary-50 rounded-lg p-2" />
              <div className="text-2xl font-extrabold text-slate-900 mt-3">{c.value}</div>
              <div className="text-sm text-slate-500">{c.label}</div>
              <div className={`text-xs font-semibold mt-1 ${c.tone}`}>{c.delta}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* Volume chart */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-slate-900">Transaction volume today</h2>
              <p className="text-sm text-slate-500">Hourly count across all channels</p>
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">+12.4% vs yesterday</span>
          </div>
          <div className="flex items-end gap-3 h-44">
            {VOLUME.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                <div className="text-xs font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">{v.toLocaleString()}</div>
                <div className="w-full rounded-t-md bg-primary-600 hover:bg-primary-500 transition-colors" style={{ height: `${(v / max) * 100}%` }} />
                <div className="text-[11px] text-slate-400">{HOURS[i]}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-sm font-semibold text-slate-700 mb-3">Channel mix</div>
            <div className="flex h-3 rounded-full overflow-hidden">
              {CHANNELS.map((c) => <div key={c.name} className={c.color} style={{ width: `${c.pct}%` }} />)}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
              {CHANNELS.map((c) => (
                <div key={c.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className={`w-2.5 h-2.5 rounded-full ${c.color}`} />{c.name} · {c.pct}%
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Loan pipeline</h2>
              <Link href="/lending" className="text-sm font-semibold text-primary-600 hover:underline">View all</Link>
            </div>
            {STAGES.map((st) => {
              const n = LOAN_PIPELINE.filter((l) => l.stage === st).length;
              return (
                <div key={st} className="flex items-center gap-3 py-1.5">
                  <div className="w-28 text-sm text-slate-600">{st}</div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-600 rounded-full" style={{ width: `${(n / LOAN_PIPELINE.length) * 100}%` }} />
                  </div>
                  <div className="w-6 text-right text-sm font-bold text-slate-800">{n}</div>
                </div>
              );
            })}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-slate-900 mb-4">Needs your attention</h2>
            <div className="space-y-3">
              <Link href="/support" className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100/70 transition-colors">
                <Icon name="warning" className="text-red-500 text-xl" />
                <div className="text-sm">
                  <span className="font-semibold text-slate-800">1 case breached SLA</span>
                  <div className="text-slate-500 text-xs mt-0.5">CS-2208 · Merchant settlement report</div>
                </div>
              </Link>
              <Link href="/lending" className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100/70 transition-colors">
                <Icon name="schedule" className="text-amber-500 text-xl" />
                <div className="text-sm">
                  <span className="font-semibold text-slate-800">2 approvals expiring soon</span>
                  <div className="text-slate-500 text-xs mt-0.5">APP-3372 (2h) · APP-3391 (4h)</div>
                </div>
              </Link>
              <Link href="/customers" className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100 hover:bg-blue-100/70 transition-colors">
                <Icon name="badge" className="text-primary-600 text-xl" />
                <div className="text-sm">
                  <span className="font-semibold text-slate-800">KYC refresh due</span>
                  <div className="text-slate-500 text-xs mt-0.5">Kim Vireak — documents expire in August</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Latest transactions */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Latest transactions</h2>
          <Link href="/payments" className="text-sm font-semibold text-primary-600 hover:underline">Open payments console</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Time</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Counterparty</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {TRANSACTIONS.slice(0, 5).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500">{t.time}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{t.customer}</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{t.type}</td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{t.counterparty}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${t.amount > 0 ? "text-green-600" : "text-slate-800"}`}>
                    {t.amount > 0 ? "+" : ""}{formatMoney(Math.abs(t.amount), t.ccy)}
                  </td>
                  <td className="px-4 py-3"><Badge label={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
