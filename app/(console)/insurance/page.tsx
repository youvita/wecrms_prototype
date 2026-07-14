"use client";

import React from "react";
import { createPortal } from "react-dom";
import { CURRENT_USER, INSURANCE_POLICIES } from "@/lib/data";
import type { InsurancePolicy, InsuranceProduct } from "@/lib/types";
import { formatDate, formatMoney, getInitial } from "@/lib/format";
import { AiPanel, Badge, EmptyState, Icon, PageHeader, Toast, type ToastMsg } from "@/components/ui";

// Insurance Products (taxonomy) with icons.
const PRODUCTS: { key: InsuranceProduct; icon: string }[] = [
  { key: "Life", icon: "favorite" },
  { key: "Health", icon: "health_and_safety" },
  { key: "Motor", icon: "directions_car" },
  { key: "Travel", icon: "flight" },
  { key: "Micro-insurance", icon: "volunteer_activism" },
  { key: "Credit life", icon: "account_balance" },
];
const TIERS = ["Basic Plan", "Gold Plan", "Platinum Plan", "Comprehensive", "Loan-linked"];
const BRANCHES = ["Phnom Penh HQ", "Siem Reap", "Battambang", "Sihanoukville", "Kampong Cham"];
const CLAIM_TYPES = ["Hospitalization", "Accident", "Death benefit", "Vehicle damage", "Trip cancellation"];

type Claim = { id: string; type: string; amount: string; status: string; date: string };

const inputCls = "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600";

function KpiCard({ label, value, sub, icon, tone }: { label: string; value: React.ReactNode; sub: string; icon: string; tone: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${tone}`}><Icon name={icon} className="text-xl" /></span>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 mt-2 leading-tight">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{sub}</div>
    </div>
  );
}

// --- Purchase flow (Insurance Products + Policy Management: Purchase, Beneficiary) ---
function RegisterPolicyModal({ seq, onClose, onSubmit }: { seq: number; onClose: () => void; onSubmit: (p: InsurancePolicy) => void }) {
  const [customer, setCustomer] = React.useState("");
  const [cif, setCif] = React.useState("CIF-");
  const [product, setProduct] = React.useState<InsuranceProduct>("Life");
  const [tier, setTier] = React.useState("Gold Plan");
  const [premium, setPremium] = React.useState("");
  const [ccy, setCcy] = React.useState<"USD" | "KHR">("USD");
  const [months, setMonths] = React.useState("36");
  const [beneficiary, setBeneficiary] = React.useState("");
  const [officer, setOfficer] = React.useState(CURRENT_USER.name);
  const [branch, setBranch] = React.useState(CURRENT_USER.branch);
  const [err, setErr] = React.useState("");

  const submit = () => {
    if (!customer.trim()) { setErr("Customer name is required"); return; }
    const prem = Number(premium.replace(/,/g, ""));
    if (!prem) { setErr("Enter a valid premium amount"); return; }
    const today = new Date();
    const rd = new Date(today); rd.setMonth(rd.getMonth() + (Number(months) || 12));
    onSubmit({
      id: `POL-${25100 + seq}`,
      customer: customer.trim(), cif: cif.trim() || "CIF-—",
      plan: `${product} Cover`, tier, product,
      premium: prem, ccy, termMonths: Number(months) || 12,
      issueDate: today.toISOString().slice(0, 10), renewalDate: rd.toISOString().slice(0, 10),
      status: "Pending", beneficiary: beneficiary.trim() || "—",
      officer: officer.trim() || CURRENT_USER.name, branch,
      renewingSoon: false,
    });
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 modal-enter" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Register policy</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Icon name="close" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Insurance product</label>
            <div className="grid grid-cols-3 gap-2">
              {PRODUCTS.map((p) => (
                <button key={p.key} onClick={() => setProduct(p.key)}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-lg border text-center transition-colors ${product === p.key ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  <Icon name={p.icon} className="text-xl" />
                  <span className="text-[11px] font-semibold leading-tight">{p.key}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer name</label>
              <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="e.g. Sok Dara" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">CIF</label>
              <input value={cif} onChange={(e) => setCif(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Plan / tier</label>
              <select value={tier} onChange={(e) => setTier(e.target.value)} className={inputCls}>
                {TIERS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Premium / mo</label>
              <input value={premium} onChange={(e) => setPremium(e.target.value)} inputMode="numeric" placeholder="e.g. 42" className={inputCls} />
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
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Term (months)</label>
              <input value={months} onChange={(e) => setMonths(e.target.value)} inputMode="numeric" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Beneficiary</label>
              <input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="e.g. Sok Marina (spouse)" className={inputCls} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Person in charge</label>
              <input value={officer} onChange={(e) => setOfficer(e.target.value)} placeholder="Relationship officer" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Branch</label>
              <select value={branch} onChange={(e) => setBranch(e.target.value)} className={inputCls}>
                {BRANCHES.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          {err && <div className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{err}</div>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} className="px-5 py-2 bg-gold text-navy rounded-lg text-sm font-bold hover:brightness-95">Register policy</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// --- Manage policy (Policy Management + Claims) ---
function ManagePolicyModal({ policy, claims, onClose, onSave, onFileClaim, onToast }: {
  policy: InsurancePolicy; claims: Claim[]; onClose: () => void;
  onSave: (patch: Partial<InsurancePolicy>) => void; onFileClaim: (c: Claim) => void; onToast: (msg: string) => void;
}) {
  const [tier, setTier] = React.useState(policy.tier);
  const [premium, setPremium] = React.useState(String(policy.premium));
  const [beneficiary, setBeneficiary] = React.useState(policy.beneficiary);
  const [claimType, setClaimType] = React.useState(CLAIM_TYPES[0]);
  const [claimAmount, setClaimAmount] = React.useState("");
  const [filed, setFiled] = React.useState(0);
  const [err, setErr] = React.useState("");

  const save = () => onSave({ tier, premium: Number(premium.replace(/,/g, "")) || policy.premium, beneficiary: beneficiary.trim() || "—" });
  const file = () => {
    if (!claimAmount) { setErr("Enter a claim amount"); return; }
    setErr("");
    onFileClaim({ id: `CLM-${1000 + claims.length + filed}`, type: claimType, amount: `${policy.ccy === "USD" ? "$" : "៛"}${claimAmount}`, status: "Submitted", date: "Just now" });
    setFiled(filed + 1); setClaimAmount("");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 modal-enter" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 modal-enter max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{policy.plan}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{policy.product} · {policy.customer} · {policy.cif}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge label={policy.status} />
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Icon name="close" /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Coverage */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Coverage</h4>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {[["Premium", `${formatMoney(policy.premium, policy.ccy)}/mo`], ["Term", `${policy.termMonths} months`], ["Issued", formatDate(policy.issueDate)], ["Renews", formatDate(policy.renewalDate)], ["In charge", policy.officer], ["Branch", policy.branch]].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-500">{k}</span><span className="font-semibold text-slate-800">{v}</span></div>
              ))}
            </div>
          </div>

          {/* Edit + policy management */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Policy management</h4>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Plan / tier</label>
                <select value={tier} onChange={(e) => setTier(e.target.value)} className={inputCls}>{TIERS.map((t) => <option key={t}>{t}</option>)}</select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Premium / mo</label>
                <input value={premium} onChange={(e) => setPremium(e.target.value)} inputMode="numeric" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Beneficiary</label>
                <input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={save} className="px-3 py-2 bg-gold text-navy rounded-lg text-xs font-semibold hover:brightness-95">Save changes</button>
              <button onClick={() => onToast(`Premium payment for ${policy.id} collected`)} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"><Icon name="payments" className="text-base" /> Pay premium</button>
              <button onClick={() => onToast(`Policy documents for ${policy.id} generated (PDF)`)} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"><Icon name="description" className="text-base" /> Policy documents</button>
            </div>
          </div>

          {/* Claims */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Claims</h4>
            <div className="flex flex-wrap items-end gap-2 mb-3">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">Claim type</label>
                <select value={claimType} onChange={(e) => setClaimType(e.target.value)} className={inputCls}>{CLAIM_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-slate-500 mb-1">Amount</label>
                <input value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} inputMode="numeric" placeholder="e.g. 500" className={inputCls} />
              </div>
              <button onClick={file} className="px-3 py-2.5 bg-gold text-navy rounded-lg text-xs font-semibold hover:brightness-95 whitespace-nowrap">File claim</button>
            </div>
            {err && <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{err}</div>}
            {claims.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No claims filed for this policy.</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {claims.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800">{c.type} <span className="text-slate-400 font-normal text-xs">· {c.id}</span></div>
                      <div className="text-xs text-slate-400">{c.amount} · {c.date}</div>
                    </div>
                    <Badge label={c.status} />
                    <button onClick={() => onToast(`Claim documents for ${c.id} opened`)} className="text-xs font-semibold text-primary-600 hover:underline">Documents</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InsurancePage() {
  const [policies, setPolicies] = React.useState<InsurancePolicy[]>(INSURANCE_POLICIES);
  const [claims, setClaims] = React.useState<Record<string, Claim[]>>({});
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("All");
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [page, setPage] = React.useState(1);
  const [showRegister, setShowRegister] = React.useState(false);
  const [manage, setManage] = React.useState<InsurancePolicy | null>(null);
  const [toast, setToast] = React.useState<ToastMsg>(null);

  const active = policies.filter((p) => p.status === "Active");
  const usdMonthly = active.filter((p) => p.ccy === "USD").reduce((s, p) => s + p.premium, 0);
  const khrMonthly = active.filter((p) => p.ccy === "KHR").reduce((s, p) => s + p.premium, 0);
  const renewals = policies.filter((p) => p.renewingSoon).length;

  const q = search.toLowerCase();
  const filtered = policies.filter((p) => {
    const matchQ = !q || p.customer.toLowerCase().includes(q) || p.plan.toLowerCase().includes(q) || p.cif.toLowerCase().includes(q);
    const matchS = statusFilter === "All" || p.status === statusFilter;
    return matchQ && matchS;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageC = Math.min(page, totalPages);
  const start = (pageC - 1) * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);

  const renew = (p: InsurancePolicy) => {
    const d = new Date(p.renewalDate); d.setMonth(d.getMonth() + p.termMonths);
    const nd = d.toISOString().slice(0, 10);
    setPolicies((prev) => prev.map((x) => x.id === p.id ? { ...x, renewalDate: nd, status: "Active", renewingSoon: false } : x));
    setToast({ message: `${p.plan} renewed for ${p.customer} — renews ${formatDate(nd)}`, type: "success" });
  };
  const toggleSuspend = (p: InsurancePolicy) => {
    const next = p.status === "Suspended" ? "Active" : "Suspended";
    setPolicies((prev) => prev.map((x) => x.id === p.id ? { ...x, status: next } : x));
    setToast({ message: `${p.plan} ${next === "Suspended" ? "suspended" : "reactivated"}`, type: next === "Suspended" ? "info" : "success" });
  };
  const registerPolicy = (pol: InsurancePolicy) => {
    setPolicies((prev) => [pol, ...prev]);
    setShowRegister(false);
    setToast({ message: `${pol.plan} registered for ${pol.customer} — pending underwriting`, type: "success" });
  };
  const savePolicy = (id: string, patch: Partial<InsurancePolicy>) => {
    setPolicies((prev) => prev.map((x) => x.id === id ? { ...x, ...patch } : x));
    setManage((m) => (m && m.id === id ? { ...m, ...patch } : m));
    setToast({ message: `${id} updated`, type: "success" });
  };
  const fileClaim = (id: string, c: Claim) => {
    setClaims((prev) => ({ ...prev, [id]: [c, ...(prev[id] || [])] }));
    setToast({ message: `Claim ${c.id} filed — customer notified`, type: "success" });
  };

  return (
    <div className="page-enter space-y-5">
      <PageHeader title="Insurance Portal" subtitle="Manage customer insurance policies & bancassurance portfolio"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setToast({ message: "Portfolio exported to PDF", type: "success" })} className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"><Icon name="picture_as_pdf" className="text-base" /><span className="hidden sm:inline">Export PDF</span></button>
            <button onClick={() => setToast({ message: "Portfolio exported to Excel", type: "success" })} className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"><Icon name="table_view" className="text-base" /><span className="hidden sm:inline">Export Excel</span></button>
            <button onClick={() => setShowRegister(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gold text-navy text-sm font-bold rounded-lg shadow-sm hover:brightness-95 active:scale-[0.98] transition-all"><Icon name="add" className="text-lg" /><span className="hidden sm:inline">Register Policy</span></button>
          </div>
        } />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Monthly premiums" tone="bg-green-50 text-green-600" icon="payments"
          value={<>{formatMoney(usdMonthly, "USD")}{khrMonthly > 0 && <span className="block text-sm font-bold text-slate-400">{formatMoney(khrMonthly, "KHR")}</span>}</>}
          sub="Active monthly contract value" />
        <KpiCard label="Active policies" tone="bg-primary-100 text-primary-700" icon="verified_user" value={active.length} sub="Policies currently in-force" />
        <KpiCard label="Upcoming renewals" tone="bg-amber-50 text-amber-600" icon="event_repeat" value={renewals} sub="Policies renewing within 180 days" />
        <KpiCard label="Product penetration" tone="bg-purple-50 text-purple-600" icon="donut_small" value="50%" sub="Of client portfolio insured" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">
        {/* Left: filters + table */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by customer name or policy…"
                className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600">
              {["All", "Active", "Pending", "Suspended", "Lapsed"].map((s) => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {filtered.length === 0 ? <EmptyState icon="shield" message="No policies match your filters" /> : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-left">
                        <th className="px-4 py-3 font-semibold text-slate-600">Customer</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Policy Plan</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Premium</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Issue Date</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Renewal Date</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">In charge</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pageRows.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-none">{getInitial(p.customer)}</span>
                              <div>
                                <div className="font-semibold text-slate-800">{p.customer}</div>
                                <div className="text-xs text-slate-400">{p.cif}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">{p.plan}</div>
                            <div className="text-xs text-slate-400">{p.tier} · <span className="text-slate-500">{p.product}</span></div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{formatMoney(p.premium, p.ccy)}<span className="text-slate-400 font-normal">/mo</span></div>
                            <div className="text-xs text-slate-400">Term: {p.termMonths} Months</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{formatDate(p.issueDate)}</td>
                          <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{formatDate(p.renewalDate)}</td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="text-slate-700">{p.officer}</div>
                            <div className="text-xs text-slate-400">{p.branch}</div>
                          </td>
                          <td className="px-4 py-3"><Badge label={p.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => setManage(p)} className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">Update</button>
                              <button onClick={() => renew(p)} className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary-50 text-primary-700 hover:bg-primary-100">Renew</button>
                              <button onClick={() => toggleSuspend(p)} className={`px-2.5 py-1 rounded-md text-xs font-semibold ${p.status === "Suspended" ? "text-green-700 hover:bg-green-50" : "text-red-600 hover:bg-red-50"}`}>{p.status === "Suspended" ? "Reactivate" : "Suspend"}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
                  <div className="text-slate-500">Showing {start + 1}–{Math.min(start + rowsPerPage, filtered.length)} of {filtered.length} policies</div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-slate-500">View
                      <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }} className="border border-slate-200 rounded-md px-2 py-1 text-slate-700">
                        {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select> rows
                    </label>
                    <div className="flex items-center gap-2">
                      <button disabled={pageC <= 1} onClick={() => setPage(pageC - 1)} className={`px-2.5 py-1 rounded-md ${pageC <= 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Previous</button>
                      <span className="text-slate-500">Page {pageC} of {totalPages}</span>
                      <button disabled={pageC >= totalPages} onClick={() => setPage(pageC + 1)} className={`px-2.5 py-1 rounded-md ${pageC >= totalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Next</button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <p className="text-xs text-slate-400">Showing {filtered.length} of {policies.length} policies · Click &lsquo;Update&rsquo; to modify details, file claims &amp; manage beneficiaries</p>
        </div>

        {/* Right: bancassurance */}
        <div className="space-y-5">
          <AiPanel title="Insurance cross-sell">
            <div>
              👤 <b>Kim Vireak</b> (SME Owner, VK Coffee Co., Ltd.) has no active insurance policy. Propose <b>Key Person Insurance</b> or <b>SME Business Interruption Cover</b>.
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setToast({ message: "Quote generated for Kim Vireak", type: "success" })} className="px-3 py-1.5 bg-gold text-navy rounded-lg text-xs font-semibold hover:brightness-95">Get quote</button>
              <button onClick={() => setToast({ message: "Plan comparison opened", type: "info" })} className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white">Compare plans</button>
            </div>
          </AiPanel>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Bancassurance</h3>
            <div className="space-y-2">
              {([["Get a quote", "request_quote", "Quote generated"], ["Compare plans", "compare_arrows", "Plan comparison opened"], ["Partner insurers", "handshake", "Partner insurer directory opened"]] as const).map(([label, icon, msg]) => (
                <button key={label} onClick={() => setToast({ message: msg, type: "info" })}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Icon name={icon} className="text-lg text-primary-600" /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showRegister && <RegisterPolicyModal seq={policies.length} onClose={() => setShowRegister(false)} onSubmit={registerPolicy} />}
      {manage && (
        <ManagePolicyModal policy={manage} claims={claims[manage.id] || []}
          onClose={() => setManage(null)}
          onSave={(patch) => savePolicy(manage.id, patch)}
          onFileClaim={(c) => fileClaim(manage.id, c)}
          onToast={(msg) => setToast({ message: msg, type: "success" })} />
      )}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
