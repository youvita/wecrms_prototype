"use client";

import React from "react";
import { LOAN_PIPELINE } from "@/lib/data";
import type { LoanApp } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { AiPanel, ConfirmModal, EmptyState, Icon, PageHeader, Toast, type ToastMsg } from "@/components/ui";

const STAGES = ["Application", "CBC Pull", "Credit Check", "Approval", "Disbursement"] as const;

const scoreColor = (s: number) => (s >= 720 ? "text-green-600" : s >= 660 ? "text-amber-600" : "text-red-600");

export default function LendingPage() {
  const [apps, setApps] = React.useState<LoanApp[]>(LOAN_PIPELINE);
  const [sel, setSel] = React.useState<LoanApp | null>(null);
  const [modal, setModal] = React.useState<{ type: "approve" | "reject"; app: LoanApp } | null>(null);
  const [note, setNote] = React.useState("");
  const [toast, setToast] = React.useState<ToastMsg>(null);
  const [stageFilter, setStageFilter] = React.useState<string>("All");

  const rows = stageFilter === "All" ? apps : apps.filter((a) => a.stage === stageFilter);

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
          <button onClick={() => setToast({ message: "New application form would open here", type: "info" })}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700">
            <Icon name="add" className="text-lg" /><span className="hidden sm:inline">New application</span>
          </button>
        } />

      {/* Stage pills */}
      <div className="flex flex-wrap gap-2">
        {["All", ...STAGES].map((st) => {
          const n = st === "All" ? apps.length : apps.filter((a) => a.stage === st).length;
          return (
            <button key={st} onClick={() => setStageFilter(st)}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${stageFilter === st ? "bg-primary-600 text-white shadow" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
              {st} <span className={stageFilter === st ? "text-primary-100" : "text-slate-400"}>({n})</span>
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

        {/* Detail panel */}
        <div className="self-start lg:sticky lg:top-20">
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
                <div className="flex justify-between"><span className="text-slate-500">CBC bureau</span><span className="font-semibold text-slate-800 text-right">{sel.cbc}</span></div>
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
                <button onClick={() => setToast({ message: `${sel.id} disbursed to account — instant credit via Bakong`, type: "success" })}
                  className="w-full px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700">Disburse now</button>
              ) : (
                <div className="text-xs text-slate-400 text-center py-1">Waiting on automated checks — no action available at this stage</div>
              )}
            </div>
          )}
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
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
