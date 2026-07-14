"use client";

import React from "react";
import { createPortal } from "react-dom";
import { LOAN_PIPELINE } from "@/lib/data";
import type { LoanApp } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { AiPanel, ConfirmModal, EmptyState, Icon, PageHeader, Toast, type ToastMsg } from "@/components/ui";

const STAGES = ["Application", "CBC Pull", "Credit Check", "Approval", "Disbursement"] as const;

const scoreColor = (s: number) => (s >= 720 ? "text-green-600" : s >= 660 ? "text-amber-600" : "text-red-600");

// Loan Calculator — EMI calculator, interest projection & eligibility simulator (real math, self-contained).
function LoanCalculator() {
  const [amount, setAmount] = React.useState("10000");
  const [rate, setRate] = React.useState("12");
  const [months, setMonths] = React.useState("24");
  const [income, setIncome] = React.useState("800");

  const P = Number(amount.replace(/,/g, "")) || 0;
  const r = (Number(rate) || 0) / 12 / 100;
  const n = Number(months) || 0;
  const emi = r > 0 && n > 0 ? (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : n > 0 ? P / n : 0;
  const total = emi * n;
  const interest = total - P;

  const monthlyIncome = Number(income.replace(/,/g, "")) || 0;
  const dti = monthlyIncome > 0 ? (emi / monthlyIncome) * 100 : 0;
  const eligible = monthlyIncome > 0 && dti <= 40;

  const Row = ({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix: string }) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <div className="relative">
        <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="numeric"
          className="w-full px-3.5 py-2 pr-14 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{suffix}</span>
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="calculate" className="text-primary-600" />
        <h3 className="font-bold text-slate-900 text-sm">Loan calculator</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Row label="Loan amount" value={amount} onChange={setAmount} suffix="USD" />
        <Row label="Interest rate" value={rate} onChange={setRate} suffix="% p.a." />
        <Row label="Term" value={months} onChange={setMonths} suffix="months" />
        <Row label="Monthly income" value={income} onChange={setIncome} suffix="USD" />
      </div>

      <div className="mt-4 rounded-lg bg-primary-50 p-4">
        <div className="text-[11px] text-primary-700 font-bold uppercase tracking-wide">Monthly payment (EMI)</div>
        <div className="text-2xl font-extrabold text-slate-900">{formatMoney(Math.round(emi), "USD")}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
        <div><div className="text-slate-500 text-xs">Total interest</div><div className="font-semibold text-slate-800">{formatMoney(Math.round(interest), "USD")}</div></div>
        <div><div className="text-slate-500 text-xs">Total repayable</div><div className="font-semibold text-slate-800">{formatMoney(Math.round(total), "USD")}</div></div>
      </div>

      <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${eligible ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
        <Icon name={eligible ? "check_circle" : "info"} className="text-lg" />
        <span>Eligibility: <b>{eligible ? "Likely" : "Review"}</b> · DTI {dti.toFixed(0)}% {dti <= 40 ? "≤ 40% policy" : "exceeds 40% policy"}</span>
      </div>
    </div>
  );
}

// Loan Products (taxonomy) with indicative annual rates for pre-qualification.
const LOAN_PRODUCTS = [
  { key: "Personal", icon: "person", rate: 14 },
  { key: "Digital / instant", icon: "bolt", rate: 18 },
  { key: "Home", icon: "home", rate: 8 },
  { key: "Auto", icon: "directions_car", rate: 10 },
  { key: "SME / business", icon: "store", rate: 13 },
  { key: "Overdraft", icon: "account_balance_wallet", rate: 16 },
  { key: "BNPL", icon: "shopping_bag", rate: 0 },
  { key: "Credit line", icon: "credit_score", rate: 15 },
] as const;

const NEW_APP_STEPS = ["Application", "Pre-qualification", "Documents", "E-signature"];

// Loan Origination flow — Application → Pre-qualification/Eligibility → Document upload → E-signature.
function NewApplicationModal({ seq, onClose, onSubmit }: {
  seq: number; onClose: () => void; onSubmit: (app: LoanApp) => void;
}) {
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");
  const [product, setProduct] = React.useState<string>("Personal");
  const [amount, setAmount] = React.useState("");
  const [ccy, setCcy] = React.useState<"USD" | "KHR">("USD");
  const [months, setMonths] = React.useState("24");
  const [income, setIncome] = React.useState("");
  const [docs, setDocs] = React.useState({ id: false, income: false, address: false });
  const [signed, setSigned] = React.useState(false);
  const [err, setErr] = React.useState("");

  const meta = LOAN_PRODUCTS.find((p) => p.key === product)!;
  const P = Number(amount.replace(/,/g, "")) || 0;
  const r = meta.rate / 12 / 100;
  const n = Number(months) || 0;
  const emi = r > 0 && n > 0 ? (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : n > 0 ? P / n : 0;
  const monthlyIncome = Number(income.replace(/,/g, "")) || 0;
  const dtiPct = monthlyIncome > 0 ? (emi / monthlyIncome) * 100 : 0;
  const eligible = monthlyIncome > 0 && dtiPct <= 40;
  const allDocs = docs.id && docs.income && docs.address;
  const inputCls = "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600";

  const advance = () => {
    if (step === 0) {
      if (!name.trim()) { setErr("Applicant name is required"); return; }
      if (P <= 0) { setErr("Enter a valid loan amount"); return; }
    }
    if (step === 1 && monthlyIncome <= 0) { setErr("Enter monthly income to run the eligibility check"); return; }
    if (step === 2 && !allDocs) { setErr("Upload all required documents to continue"); return; }
    setErr(""); setStep(step + 1);
  };

  const submit = () => {
    if (!signed) { setErr("Customer e-signature is required to submit"); return; }
    onSubmit({
      id: `APP-${3392 + seq}`,
      name: name.trim(),
      product,
      amount: P,
      ccy,
      stage: "Application",
      score: null,
      cbc: "Not yet pulled",
      dti: monthlyIncome > 0 ? `${dtiPct.toFixed(0)}%` : "—",
      submitted: "Just now",
      sla: "New",
    });
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 modal-enter" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">New loan application</h3>
            <p className="text-xs text-slate-500 mt-0.5">Loan origination · step {step + 1} of 4</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Icon name="close" /></button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-5">
            {NEW_APP_STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 ${i === step ? "text-primary-700" : i < step ? "text-green-600" : "text-slate-400"}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === step ? "bg-gold text-navy" : i < step ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                    {i < step ? <Icon name="check" className="text-sm" /> : i + 1}
                  </span>
                  <span className="text-xs font-semibold hidden sm:inline">{s}</span>
                </div>
                {i < NEW_APP_STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-green-500" : "bg-slate-200"}`} />}
              </React.Fragment>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Applicant name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sok Dara" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Loan product</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {LOAN_PRODUCTS.map((p) => (
                    <button key={p.key} onClick={() => setProduct(p.key)}
                      className={`flex flex-col items-center gap-1 px-2 py-3 rounded-lg border text-center transition-colors ${product === p.key ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      <Icon name={p.icon} className="text-xl" />
                      <span className="text-[11px] font-semibold leading-tight">{p.key}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount</label>
                  <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="e.g. 5000" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Currency</label>
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    {(["USD", "KHR"] as const).map((c) => (
                      <button key={c} onClick={() => setCcy(c)} className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${ccy === c ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>{c}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Term (months)</label>
                  <input value={months} onChange={(e) => setMonths(e.target.value)} inputMode="numeric" className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">Enter income to run an instant eligibility check at the {product} indicative rate ({meta.rate}% p.a.).</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Monthly income (USD)</label>
                <input value={income} onChange={(e) => setIncome(e.target.value)} inputMode="numeric" placeholder="e.g. 800" className={inputCls} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-500">Indicative EMI</div><div className="font-bold text-slate-900">{formatMoney(Math.round(emi), ccy)}</div></div>
                <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-500">DTI</div><div className="font-bold text-slate-900">{monthlyIncome > 0 ? `${dtiPct.toFixed(0)}%` : "—"}</div></div>
                <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-500">Rate</div><div className="font-bold text-slate-900">{meta.rate}% p.a.</div></div>
              </div>
              {monthlyIncome > 0 && (
                <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${eligible ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                  <Icon name={eligible ? "verified" : "info"} className="text-lg" />
                  <span><b>{eligible ? "Pre-qualified" : "Needs review"}</b> — DTI {dtiPct.toFixed(0)}% {eligible ? "within the 40% affordability policy" : "exceeds the 40% policy; consider a lower amount or longer term"}</span>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Upload the required documents — each is scanned automatically.</p>
              {([["id", "National ID / Passport"], ["income", "Proof of income"], ["address", "Proof of address"]] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Icon name={docs[key] ? "task_alt" : "upload_file"} className={`text-2xl ${docs[key] ? "text-green-500" : "text-slate-400"}`} />
                    <div>
                      <div className="text-sm font-medium text-slate-800">{label}</div>
                      <div className="text-xs text-slate-400">{docs[key] ? "Uploaded · scan OK" : "PDF or photo"}</div>
                    </div>
                  </div>
                  <button onClick={() => setDocs((d) => ({ ...d, [key]: !d[key] }))}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${docs[key] ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-gold text-navy hover:brightness-95"}`}>
                    {docs[key] ? "Remove" : "Upload"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                {[["Applicant", name], ["Product", product], ["Amount", formatMoney(P, ccy)], ["Term", `${months} months`], ["Indicative EMI", formatMoney(Math.round(emi), ccy)], ["Pre-qualification", eligible ? "Pre-qualified" : "Manual review"]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <span className="text-slate-500">{k}</span><span className="font-semibold text-slate-800 text-right">{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setSigned(!signed)}
                className={`w-full border-2 border-dashed rounded-xl py-6 flex flex-col items-center gap-2 transition-colors ${signed ? "border-green-400 bg-green-50" : "border-slate-300 hover:border-primary-400"}`}>
                <Icon name={signed ? "verified" : "draw"} className={`text-4xl ${signed ? "text-green-500" : "text-slate-400"}`} />
                <span className={`text-sm font-semibold ${signed ? "text-green-700" : "text-slate-600"}`}>{signed ? "Signature captured" : "Tap to capture customer e-signature"}</span>
              </button>
              <div className="flex items-start gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Icon name="gavel" className="text-amber-500 text-lg" />
                By signing, the customer accepts the loan T&amp;Cs, fee schedule and CBC data-sharing consent.
              </div>
            </div>
          )}

          {err && <div className="mt-4 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{err}</div>}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-between">
          <button onClick={step === 0 ? onClose : () => { setErr(""); setStep(step - 1); }}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            {step === 0 ? "Cancel" : "Back"}
          </button>
          <button onClick={step === 3 ? submit : advance}
            className="px-5 py-2 bg-gold text-navy rounded-lg text-sm font-semibold hover:brightness-95">
            {step === 3 ? "Submit application" : "Continue"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function LendingPage() {
  const [apps, setApps] = React.useState<LoanApp[]>(LOAN_PIPELINE);
  const [sel, setSel] = React.useState<LoanApp | null>(null);
  const [modal, setModal] = React.useState<{ type: "approve" | "reject"; app: LoanApp } | null>(null);
  const [note, setNote] = React.useState("");
  const [toast, setToast] = React.useState<ToastMsg>(null);
  const [stageFilter, setStageFilter] = React.useState<string>("All");
  const [disbChannel, setDisbChannel] = React.useState<"account" | "wallet" | "staged">("account");
  const [instant, setInstant] = React.useState(true);
  const [showNew, setShowNew] = React.useState(false);

  const rows = stageFilter === "All" ? apps : apps.filter((a) => a.stage === stageFilter);

  const submitNewApp = (app: LoanApp) => {
    setApps([app, ...apps]);
    setSel(app);
    setStageFilter("All");
    setShowNew(false);
    setToast({ message: `${app.id} created for ${app.name} — queued for CBC pull`, type: "success" });
  };

  const disburse = () => {
    if (!sel) return;
    const ch = disbChannel === "account" ? "customer account" : disbChannel === "wallet" ? "Bakong wallet" : "staged tranches";
    setApps(apps.map((a) => a.id === sel.id ? { ...a, sla: "Disbursed" } : a));
    setToast({ message: `${sel.id} disbursed to ${ch}${instant ? " — instant credit" : " — scheduled"}`, type: "success" });
  };

  const decide = () => {
    if (!modal) return;
    const { type, app } = modal;
    setApps(apps.map((a) => a.id === app.id ? { ...a, stage: type === "approve" ? "Disbursement" : "Application", sla: type === "approve" ? "Ready" : "Returned" } : a));
    setToast({ message: `${app.id} ${type === "approve" ? "approved — queued for disbursement (checker sign-off logged)" : "returned to applicant with your note"}`, type: "success" });
    setModal(null); setNote(""); setSel(null);
  };

  return (
    <div className="page-enter space-y-4">
      <PageHeader title="Lending" subtitle="Loan origination pipeline"
        actions={
          <button onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gold text-navy text-sm font-semibold rounded-lg shadow-sm hover:brightness-95 active:scale-[0.98] transition-all">
            <Icon name="add" className="text-lg" /><span className="hidden sm:inline">New application</span>
          </button>
        } />

      {/* Stage pills */}
      <div className="flex flex-wrap gap-2">
        {["All", ...STAGES].map((st) => {
          const n = st === "All" ? apps.length : apps.filter((a) => a.stage === st).length;
          return (
            <button key={st} onClick={() => setStageFilter(st)}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${stageFilter === st ? "bg-gold text-navy shadow" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
              {st} <span className={stageFilter === st ? "text-navy/70" : "text-slate-400"}>({n})</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        {/* Pipeline table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden self-start">
          {rows.length === 0 ? <EmptyState icon="folder_open" message={`No applications in ${stageFilter}`} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Application</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Product</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Amount</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Stage</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((a, i) => (
                    <tr key={a.id} onClick={() => setSel(a)}
                      className={`cursor-pointer transition-colors stagger-item ${sel?.id === a.id ? "bg-primary-50" : "hover:bg-slate-50"}`}
                      style={{ animationDelay: `${i * 40}ms` }}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{a.name}</div>
                        <div className="text-xs text-slate-400">{a.id} · {a.submitted}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{a.product}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatMoney(a.amount, a.ccy)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${a.stage === "Approval" ? "bg-amber-100 text-amber-800" : a.stage === "Disbursement" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>{a.stage}</span>
                      </td>
                      <td className={`px-4 py-3 text-xs font-semibold hidden md:table-cell ${a.sla.includes("2h") ? "text-red-600" : a.sla.includes("h") ? "text-amber-600" : "text-slate-500"}`}>{a.sla}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel + calculator */}
        <div className="self-start lg:sticky lg:top-20 space-y-5">
          {!sel ? (
            <div className="bg-white border border-slate-200 rounded-xl">
              <EmptyState icon="rule" message="Select an application to review credit assessment" />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 page-enter">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-bold text-slate-900">{sel.name}</div>
                  <div className="text-xs text-slate-400">{sel.id} · {sel.product}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-slate-900">{formatMoney(sel.amount, sel.ccy)}</div>
                  <div className="text-xs text-slate-400">requested</div>
                </div>
              </div>

              {/* Credit score gauge */}
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">Credit score</span>
                  <span className={`text-2xl font-extrabold ${sel.score ? scoreColor(sel.score) : "text-slate-300"}`}>{sel.score ?? "—"}</span>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${sel.score && sel.score >= 720 ? "bg-green-500" : sel.score && sel.score >= 660 ? "bg-amber-500" : sel.score ? "bg-red-500" : "bg-slate-200"}`}
                    style={{ width: sel.score ? `${((sel.score - 300) / 550) * 100}%` : "0%" }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>300</span><span>850</span></div>
              </div>

              <div className="space-y-2.5 text-sm mb-5">
                <div className="flex justify-between"><span className="text-slate-500">CBC bureau pull</span><span className="font-semibold text-slate-800 text-right">{sel.cbc}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Income verification</span><span className="font-semibold text-slate-800">{sel.score && sel.score >= 660 ? "Verified · payslips + bank" : "Pending documents"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Affordability check</span><span className={`font-semibold ${parseInt(sel.dti) <= 40 ? "text-green-600" : "text-amber-600"}`}>{parseInt(sel.dti) <= 40 ? "Pass · within policy" : "Review · exceeds policy"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Debt-to-income</span><span className="font-semibold text-slate-800">{sel.dti}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Stage</span><span className="font-semibold text-slate-800">{sel.stage}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">SLA</span><span className="font-semibold text-slate-800">{sel.sla}</span></div>
              </div>

              <div className="mb-5">
                <AiPanel title="Decision engine">
                  {sel.score && sel.score >= 720 ? "Recommend APPROVE — score and DTI within policy, CBC clean. Auto-decision eligible."
                    : sel.score && sel.score >= 660 ? "Recommend MANUAL REVIEW — score marginal; verify income documents before approving."
                    : sel.score ? "Recommend DECLINE or reduce amount — score below policy threshold."
                    : "Awaiting CBC pull and scoring — no recommendation yet."}
                </AiPanel>
              </div>

              {(sel.stage === "Approval" || sel.stage === "Credit Check") ? (
                <div className="flex gap-2">
                  <button onClick={() => setModal({ type: "approve", app: sel })} className="flex-1 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700">Approve</button>
                  <button onClick={() => setModal({ type: "reject", app: sel })} className="flex-1 px-4 py-2.5 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100">Return / decline</button>
                </div>
              ) : sel.stage === "Disbursement" ? (
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Disbursement channel</div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {([["account", "To account", "account_balance"], ["wallet", "To wallet", "account_balance_wallet"], ["staged", "Staged", "stairs"]] as const).map(([k, label, icon]) => (
                      <button key={k} onClick={() => setDisbChannel(k)}
                        className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-xs font-semibold transition-colors ${disbChannel === k ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                        <Icon name={icon} className="text-lg" /> {label}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center justify-between text-sm mb-3">
                    <span className="text-slate-600">Instant disbursement</span>
                    <button onClick={() => setInstant(!instant)} aria-label="Toggle instant disbursement"
                      className={`w-10 rounded-full p-0.5 transition-colors ${instant ? "bg-primary-600" : "bg-slate-300"}`} style={{ height: 22 }}>
                      <span className={`block bg-white rounded-full shadow transform transition-transform ${instant ? "translate-x-4" : ""}`} style={{ width: 18, height: 18 }} />
                    </button>
                  </label>
                  <button onClick={disburse}
                    className="w-full px-4 py-2.5 bg-gold text-navy text-sm font-semibold rounded-lg hover:brightness-95">Disburse {formatMoney(sel.amount, sel.ccy)}</button>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Loan servicing</div>
                    <div className="grid grid-cols-2 gap-2">
                      {([["Repayment schedule", "event_note"], ["Loan statement", "description"], ["Top-up", "add_circle"], ["Early settlement", "paid"], ["Restructuring", "tune"]] as const).map(([label, icon]) => (
                        <button key={label} onClick={() => setToast({ message: `${label} for ${sel.id} — flow would open here`, type: "info" })}
                          className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          <Icon name={icon} className="text-base" /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 text-center py-1">Waiting on automated checks — no action available at this stage</div>
              )}
            </div>
          )}

          <LoanCalculator />
        </div>
      </div>

      {modal && (
        <ConfirmModal
          title={`${modal.type === "approve" ? "Approve" : "Return / decline"} ${modal.app.id}`}
          message={modal.type === "approve"
            ? "Your approval is recorded as checker sign-off (maker: system decision engine). This action is logged to the audit trail."
            : "The application returns to the applicant with your note."}
          confirmLabel={modal.type === "approve" ? "Approve & sign" : "Return application"}
          variant={modal.type === "approve" ? "primary" : "danger"}
          onConfirm={decide} onCancel={() => setModal(null)}>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Decision note {modal.type === "reject" && <span className="text-red-500">*</span>}
          </label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            placeholder={modal.type === "approve" ? "Optional note…" : "Reason for return (required in production)…"}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
        </ConfirmModal>
      )}
      {showNew && (
        <NewApplicationModal seq={apps.length} onClose={() => setShowNew(false)} onSubmit={submitNewApp} />
      )}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
