"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CUSTOMERS, TRANSACTIONS, CURRENT_USER } from "@/lib/data";
import { formatDate, formatMoney, getInitial, segmentLabel } from "@/lib/format";
import { AiPanel, Badge, EmptyState, Icon, Toast, type ToastMsg } from "@/components/ui";
import type { Customer, CorporateFacet, Investment, Insurance, GiftTransaction, LocationEvent, CycleStatus, CreditAccount, AtmActivity, AtmResult, CallActivity, CallStatus, Complaint, ComplaintStatus, ComplaintPriority, MiniAppSession, MiniAppStatus, MiniAppInvestigationFlag, SalesActivity, SalesStage, IbActivity, IbEventType, IbOutcome, MbActivity, MbEventType, GeneratedReport, ReportPackKey, ReportFormat, ReportStatus } from "@/lib/types";

const TABS = [
  "Overviews", "Customer Information", "Accounts", "Payments", "Fixed Deposits", "Cards", "Loans", "Investments", "Insurances",
  "Locations", "Sales Activities", "Call Center", "Compliance", "CBC", "Reminder", "Merchants",
  "Internet Banking", "Mobile Banking", "Cash ATM", "Mini App", "Gift Zone", "Loyalty Points", "Reports", "Security", "Audit Logs",
] as const;
// Tabs added to the navigation but whose detailed content is not built yet.
// Tabs added to the navigation but whose detailed content is not built yet.
const PLACEHOLDER_TABS: readonly string[] = [];
const AUDIT_CATEGORIES = ["All", "Profile", "Access", "Servicing", "Consent & docs", "Security", "Approvals"];
const TXN_CHANNELS = ["All", "KHQR", "Bakong", "Transfer", "Bill"] as const;
type Tab = (typeof TABS)[number];

function Section({ title, children, action }: { title: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-900 text-sm">{title}</h3>{action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// Read-only field (label + value).
function Info({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <div className="text-xs font-medium text-slate-500 mb-1">{label}</div>
      <div className="text-sm font-medium text-slate-800">{value || "—"}</div>
    </div>
  );
}

// Loan detail card: a titled white card with a label/value list; one row may be highlighted.
function LoanDetailCard({ title, rows }: { title: string; rows: { label: string; value: string; highlight?: boolean }[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">{title}</h4>
      <dl>
        {rows.map((row) => (
          <div
            key={row.label}
            className={row.highlight
              ? "-mx-2 mt-1 flex items-center justify-between gap-4 rounded-lg bg-amber-50 px-2 py-3"
              : "flex items-center justify-between gap-4 py-2"}
          >
            <dt className="text-sm text-slate-500">{row.label}</dt>
            <dd className={row.highlight
              ? "m-0 text-base font-bold text-amber-700"
              : "m-0 text-sm font-semibold text-slate-800"}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// --- Location helpers ---
// The date part of an event's time string, e.g. "Sep 2, 2025 - 7:15 AM" -> "Sep 2, 2025".
function eventMonthKey(ev: LocationEvent): string {
  const parsed = new Date(ev.time.split(" - ")[0]);
  return `${parsed.getFullYear()}-${parsed.getMonth()}`;
}
// The 12 month-select options relative to today, oldest first.
function last12Months(): { key: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }) };
  });
}
// OpenStreetMap embed: fit a padded box around every visible event (pin on the most recent),
// or zoom tightly on a single focused event.
function LocationMap({ events, focus }: { events: LocationEvent[]; focus: LocationEvent | null }) {
  if (events.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
        No location to show on the map.
      </div>
    );
  }
  let minLat: number, maxLat: number, minLng: number, maxLng: number, marker: LocationEvent;
  if (focus) {
    const z = 0.03;
    minLat = focus.lat - z; maxLat = focus.lat + z; minLng = focus.lng - z; maxLng = focus.lng + z; marker = focus;
  } else {
    const pad = 0.15;
    const lats = events.map((e) => e.lat), lngs = events.map((e) => e.lng);
    minLat = Math.min(...lats) - pad; maxLat = Math.max(...lats) + pad;
    minLng = Math.min(...lngs) - pad; maxLng = Math.max(...lngs) + pad;
    marker = events[events.length - 1];
  }
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${marker.lat}%2C${marker.lng}`;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <iframe title="Customer location map" src={src} className="h-64 w-full" style={{ border: 0 }} loading="lazy" />
    </div>
  );
}

// --- CBC (credit report) helpers ---
// Account-status pill colours — one table drives every account-status badge.
const CBC_ACCOUNT_STATUS_STYLES: Record<CreditAccount["accountStatus"], string> = {
  Normal: "bg-green-100 text-green-700",
  Delinquent: "bg-amber-100 text-amber-700",
  Closed: "bg-slate-100 text-slate-600",
  "Write-off": "bg-red-100 text-red-700",
};
// Payment-cycle severity colours — drives every "Last 24 Cycles" cell and the legend.
const CBC_CYCLE_STYLES: Record<CycleStatus, string> = {
  "0": "bg-green-500/70",
  "30": "bg-amber-400/80",
  "60": "bg-orange-500/70",
  "90+": "bg-red-500/70",
};
// K-Score badge colour by band (CBC K-Score ~300–850).
function kScoreClass(score: number): string {
  if (score >= 700) return "bg-green-100 text-green-700";
  if (score >= 600) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}
// A single credit account card with a 24-cycle repayment heatmap.
function CbcAccountCard({ acc }: { acc: CreditAccount }) {
  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{acc.institution}</div>
          <div className="mt-0.5 text-xs text-slate-500">{acc.productType} · {acc.applicantStatus}</div>
        </div>
        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${CBC_ACCOUNT_STATUS_STYLES[acc.accountStatus]}`}>{acc.accountStatus}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-slate-500">Credit Limit</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-800">{formatMoney(acc.creditLimit, "USD")}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Loan Duration</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-800">{acc.loanDuration}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Current Balance</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-800">{formatMoney(acc.currentBalance, "USD")}</div>
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1.5 text-xs text-slate-500">Last 24 Cycles</div>
        <div className="flex flex-wrap gap-1">
          {acc.last24Cycles.map((c, i) => (
            <span key={i} title={`Cycle ${i + 1}: ${c === "0" ? "On time" : `${c} days past due`}`}
              className={`h-4 w-4 rounded-sm ${CBC_CYCLE_STYLES[c]}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Cash ATM helpers ---
const ATM_RESULT_STYLES: Record<AtmResult, string> = {
  Completed: "bg-green-100 text-green-700",
  Failed: "bg-red-100 text-red-700",
  Reversed: "bg-orange-100 text-orange-700",
  Pending: "bg-slate-100 text-slate-600",
  Disputed: "bg-amber-100 text-amber-700",
};
const ATM_RESULTS: AtmResult[] = ["Completed", "Failed", "Reversed", "Pending", "Disputed"];
const ATM_NOW_INPUT = "2026-07-16T11:30"; // APP_NOW default for the datetime field
function atmDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

// ATM detail drawer — read-only, right-side slide-over with an Edit action.
function AtmDrawer({ record, onClose, onEdit }: { record: AtmActivity; onClose: () => void; onEdit: () => void }) {
  const Field = ({ label, value, span }: { label: string; value: React.ReactNode; span?: boolean }) => (
    <div className={span ? "sm:col-span-2" : ""}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-md bg-white shadow-xl overflow-y-auto modal-enter flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">ATM Activity · {record.id}</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">{record.record}</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">ATM transaction information</h4>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="text-xs text-slate-500">Result</div>
                <span className={`mt-1 inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${ATM_RESULT_STYLES[record.stage]}`}>{record.stage}</span>
              </div>
              <Field label="Transaction time" value={record.date} />
              <Field label="Amount" value={formatMoney(record.value, "USD")} />
              <Field label="ATM / location" value={record.location} span />
              <Field label="Account" value={record.account} />
              <Field label="Card" value={record.card} />
              <Field label="Fee" value={formatMoney(record.fee, "USD")} />
              <Field label="Balance after" value={formatMoney(record.balanceAfter, "USD")} />
              <Field label="Last updated" value={record.updatedAt ?? "—"} />
              <Field label="Updated by" value={record.updatedBy ?? "—"} />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">Transaction description</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{record.description || "—"}</p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">Activity logs</h4>
            <ol className="border-l border-slate-200 pl-5 space-y-4">
              {record.timeline.map((t, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300" />
                  <div className="text-sm font-medium text-slate-800">{t.event}</div>
                  <div className="text-xs text-slate-400">{t.ts}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button type="button" onClick={onEdit} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gold text-navy text-sm font-semibold rounded-lg hover:brightness-95">
            <Icon name="edit" className="text-lg" />Edit ATM record
          </button>
        </div>
      </div>
    </div>
  );
}

// Create / edit ATM activity form (modal).
function AtmForm({ mode, initial, customerId, nextId, updatedBy, onClose, onSubmit }: {
  mode: "create" | "edit"; initial: AtmActivity | null; customerId: string; nextId: string; updatedBy: string;
  onClose: () => void; onSubmit: (rec: AtmActivity) => void;
}) {
  const [record, setRecord] = React.useState(initial?.record ?? "");
  const [dateISO, setDateISO] = React.useState(initial?.dateISO ?? ATM_NOW_INPUT);
  const [stage, setStage] = React.useState<AtmResult>(initial?.stage ?? "Completed");
  const [value, setValue] = React.useState(initial ? String(initial.value) : "");
  const [location, setLocation] = React.useState(initial?.location ?? "");
  const [account, setAccount] = React.useState(initial?.account ?? "");
  const [card, setCard] = React.useState(initial?.card ?? "");
  const [fee, setFee] = React.useState(initial ? String(initial.fee) : "");
  const [balanceAfter, setBalanceAfter] = React.useState(initial ? String(initial.balanceAfter) : "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [err, setErr] = React.useState("");

  const cls = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600";
  const num = (s: string) => Number(s.replace(/,/g, ""));

  const submit = () => {
    if (!record.trim() || !location.trim() || !account.trim() || !card.trim() || !description.trim()) { setErr("Please complete all required fields."); return; }
    if (value.trim() === "" || fee.trim() === "" || balanceAfter.trim() === "") { setErr("Amount, Fee and Balance after are required."); return; }
    if ([num(value), num(fee), num(balanceAfter)].some((n) => isNaN(n))) { setErr("Amount, Fee and Balance after must be numbers."); return; }
    const nowTs = atmDisplayDate(ATM_NOW_INPUT);
    const base: AtmActivity = {
      id: mode === "edit" && initial ? initial.id : nextId,
      customerId,
      dateISO,
      date: atmDisplayDate(dateISO),
      record: record.trim(), location: location.trim(), account: account.trim(), card: card.trim(),
      value: num(value), fee: num(fee), balanceAfter: num(balanceAfter), stage,
      description: description.trim(),
      sourceSystem: initial?.sourceSystem ?? "Manual entry",
      updatedAt: nowTs, updatedBy,
      timeline: mode === "edit" && initial
        ? [...initial.timeline, { ts: nowTs, event: "ATM record updated" }]
        : [{ ts: nowTs, event: "ATM activity recorded" }],
    };
    onSubmit(base);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 modal-enter" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto modal-enter" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">ATM activity form</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">{mode === "create" ? "New ATM activity" : `Edit · ${initial?.id}`}</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">ATM activity</label>
            <input value={record} onChange={(e) => setRecord(e.target.value)} placeholder="e.g. Cash withdrawal" className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Transaction time</label>
            <input type="datetime-local" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Result</label>
            <select value={stage} onChange={(e) => setStage(e.target.value as AtmResult)} className={cls}>
              {ATM_RESULTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Amount (USD)</label>
            <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.00" className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fee (USD)</label>
            <input value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0.00" className={cls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">ATM / location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. KB PRASAC ATM · Toul Kork Branch" className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Account</label>
            <input value={account} onChange={(e) => setAccount(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Card</label>
            <input value={card} onChange={(e) => setCard(e.target.value)} className={cls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Balance after (USD)</label>
            <input value={balanceAfter} onChange={(e) => setBalanceAfter(e.target.value)} placeholder="0.00" className={cls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Transaction description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={cls} />
          </div>
          {err && <div className="sm:col-span-2 text-sm text-red-600">{err}</div>}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={submit} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy hover:brightness-95">Record ATM activity</button>
        </div>
      </div>
    </div>
  );
}

// --- Call Center helpers ---
const CALL_STATUS_STYLES: Record<CallStatus, string> = {
  Resolved: "bg-green-100 text-green-700",
  "Follow-up": "bg-amber-100 text-amber-700",
  Escalated: "bg-red-100 text-red-700",
  Missed: "bg-orange-100 text-orange-700",
  "No Answer": "bg-slate-100 text-slate-600",
};
const CALL_STATUSES: CallStatus[] = ["Resolved", "Follow-up", "Escalated", "Missed", "No Answer"];

// Call detail drawer — read-only, right-side slide-over with an Edit action.
function CallDrawer({ record, onClose, onEdit }: { record: CallActivity; onClose: () => void; onEdit: () => void }) {
  const Field = ({ label, value, span }: { label: string; value: React.ReactNode; span?: boolean }) => (
    <div className={span ? "sm:col-span-2" : ""}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
  const downloadVoice = () => {
    const blob = new Blob([`Voice recording placeholder for ${record.id} (${record.voiceRecordFile})`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = record.voiceRecordFile; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-md bg-white shadow-xl overflow-y-auto modal-enter flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Call Center · {record.id}</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">{record.record}</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">Call information</h4>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center gap-2">
                <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${CALL_STATUS_STYLES[record.stage]}`}>{record.stage}</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                  <Icon name={record.direction === "Inbound" ? "call_received" : "call_made"} className="text-sm" />{record.direction}
                </span>
              </div>
              <Field label="Call date" value={record.date} />
              <Field label="Duration" value={record.duration} />
              <Field label="Agent" value={record.agent} />
              <Field label="Phone" value={record.phone} />
              <Field label="Last updated" value={record.updatedAt ?? "—"} />
              <Field label="Updated by" value={record.updatedBy ?? "—"} />
              <div className="sm:col-span-2">
                <div className="text-xs text-slate-500">Voice record file</div>
                {record.voiceRecordFile ? (
                  <button type="button" onClick={downloadVoice} className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <Icon name="download" className="text-base" />{record.voiceRecordFile}
                  </button>
                ) : (
                  <div className="mt-0.5 text-sm font-semibold text-slate-400">No file selected</div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">Call summary</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{record.summary || "—"}</p>
            {record.next && record.next !== "No action" && (
              <p className="mt-2 text-xs text-slate-500"><span className="font-semibold text-slate-600">Next action:</span> {record.next}</p>
            )}
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">Activity logs</h4>
            <ol className="border-l border-slate-200 pl-5 space-y-4">
              {record.timeline.map((t, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300" />
                  <div className="text-sm font-medium text-slate-800">{t.event}</div>
                  <div className="text-xs text-slate-400">{t.ts}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button type="button" onClick={onEdit} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gold text-navy text-sm font-semibold rounded-lg hover:brightness-95">
            <Icon name="edit" className="text-lg" />Edit call record
          </button>
        </div>
      </div>
    </div>
  );
}

// Create / edit call activity form (modal).
function CallForm({ mode, initial, customerId, nextId, updatedBy, defaultPhone, onClose, onSubmit }: {
  mode: "create" | "edit"; initial: CallActivity | null; customerId: string; nextId: string; updatedBy: string; defaultPhone: string;
  onClose: () => void; onSubmit: (rec: CallActivity) => void;
}) {
  const [record, setRecord] = React.useState(initial?.record ?? "");
  const [dateISO, setDateISO] = React.useState(initial?.dateISO ?? ATM_NOW_INPUT);
  const [duration, setDuration] = React.useState(initial?.duration ?? "");
  const [agent, setAgent] = React.useState(initial?.agent ?? updatedBy);
  const [phone, setPhone] = React.useState(initial?.phone ?? defaultPhone);
  const [voiceRecordFile, setVoiceRecordFile] = React.useState(initial?.voiceRecordFile ?? "");
  const [summary, setSummary] = React.useState(initial?.summary ?? "");
  const [err, setErr] = React.useState("");

  const cls = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600";

  const submit = () => {
    if (!record.trim() || !duration.trim() || !agent.trim() || !phone.trim() || !summary.trim()) { setErr("Please complete all required fields."); return; }
    const nowTs = atmDisplayDate(ATM_NOW_INPUT);
    const rec: CallActivity = {
      id: mode === "edit" && initial ? initial.id : nextId,
      customerId,
      dateISO,
      date: atmDisplayDate(dateISO),
      record: record.trim(), duration: duration.trim(), agent: agent.trim(), phone: phone.trim(),
      stage: initial?.stage ?? "Resolved",
      direction: initial?.direction ?? "Inbound",
      recording: voiceRecordFile.trim() ? "Recording available" : "No recording",
      voiceRecordFile: voiceRecordFile.trim(),
      summary: summary.trim(),
      next: initial?.next ?? "No action",
      sourceSystem: initial?.sourceSystem ?? "Manual entry",
      updatedAt: nowTs, updatedBy,
      timeline: mode === "edit" && initial
        ? [...initial.timeline, { ts: nowTs, event: "Call record updated" }]
        : [{ ts: nowTs, event: "Call activity logged" }],
    };
    onSubmit(rec);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 modal-enter" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto modal-enter" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Call center activity form</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">{mode === "create" ? "New call center activity" : `Edit · ${initial?.id}`}</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Call reason</label>
            <input value={record} onChange={(e) => setRecord(e.target.value)} placeholder="e.g. Card blocked inquiry" className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Call date</label>
            <input type="datetime-local" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Duration</label>
            <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 4m 12s" className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Agent</label>
            <input value={agent} onChange={(e) => setAgent(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={cls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Voice record file <span className="font-normal text-slate-400">· optional</span></label>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                <Icon name="upload_file" className="text-base" />Choose file
                <input type="file" accept="audio/*" className="hidden" onChange={(e) => setVoiceRecordFile(e.target.files?.[0]?.name ?? "")} />
              </label>
              <span className="text-sm text-slate-500 truncate">{voiceRecordFile || "No file selected"}</span>
              {voiceRecordFile && (
                <button type="button" onClick={() => setVoiceRecordFile("")} className="text-slate-400 hover:text-slate-700" aria-label="Remove file"><Icon name="close" className="text-base" /></button>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">Select an audio file from your device.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Call summary</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} className={cls} />
          </div>
          {err && <div className="sm:col-span-2 text-sm text-red-600">{err}</div>}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={submit} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy hover:brightness-95">Log call activity</button>
        </div>
      </div>
    </div>
  );
}

// --- Customer complaints (Compliance tab) helpers ---
const COMPLAINT_STATUS_STYLES: Record<ComplaintStatus, string> = {
  New: "bg-primary-100 text-primary-700",
  Investigating: "bg-amber-100 text-amber-700",
  Waiting: "bg-slate-100 text-slate-600",
  Resolved: "bg-green-100 text-green-700",
  Closed: "bg-slate-200 text-slate-700",
  Overdue: "bg-red-100 text-red-700",
};
const COMPLAINT_STATUSES: ComplaintStatus[] = ["New", "Investigating", "Waiting", "Resolved", "Closed", "Overdue"];
const COMPLAINT_PRIORITY_STYLES: Record<ComplaintPriority, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-slate-100 text-slate-600",
};
const COMPLAINT_PRIORITIES: ComplaintPriority[] = ["High", "Medium", "Low"];
const COMPLAINT_CHANNELS: Complaint["channel"][] = ["Call Center", "Branch", "Email", "Mobile App"];
const COMPLAINT_NOW_INPUT = "2026-07-15"; // default reported date for the form (date only)
const COMPLAINT_NOW_TS = "2026-07-16 11:30";

// Format a "YYYY-MM-DD" date without timezone drift.
function complaintDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Complaint detail drawer — read-only, right-side slide-over with an Edit action.
function ComplaintDrawer({ record, onClose, onEdit }: { record: Complaint; onClose: () => void; onEdit: () => void }) {
  const Field = ({ label, value, span }: { label: string; value: React.ReactNode; span?: boolean }) => (
    <div className={span ? "sm:col-span-2" : ""}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-md bg-white shadow-xl overflow-y-auto modal-enter flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Customer Complaints · {record.id}</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">{record.record}</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">Complaint information</h4>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="text-xs text-slate-500">Status</div>
                <span className={`mt-1 inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${COMPLAINT_STATUS_STYLES[record.stage]}`}>{record.stage}</span>
              </div>
              <Field label="Reported" value={record.date} />
              <Field label="Category" value={record.category} />
              <div>
                <div className="text-xs text-slate-500">Priority</div>
                <span className={`mt-1 inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${COMPLAINT_PRIORITY_STYLES[record.priority]}`}>{record.priority}</span>
              </div>
              <Field label="Assigned team" value={record.owner} />
              <Field label="Channel" value={record.channel} />
              <Field label="Impact" value={record.impact || "—"} />
              <Field label="Last updated" value={record.updatedAt ?? "—"} />
              <Field label="Updated by" value={record.updatedBy ?? "—"} />
              <Field label="Related records" value={record.related || "—"} span />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">Complaint description</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{record.description || "—"}</p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">Activity logs</h4>
            <ol className="border-l border-slate-200 pl-5 space-y-4">
              {record.timeline.map((t, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300" />
                  <div className="text-sm font-medium text-slate-800">{t.event}</div>
                  <div className="text-xs text-slate-400">{t.ts}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button type="button" onClick={onEdit} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gold text-navy text-sm font-semibold rounded-lg hover:brightness-95">
            <Icon name="edit" className="text-lg" />Edit complaint
          </button>
        </div>
      </div>
    </div>
  );
}

// Create / edit complaint form (modal). Activity logs are shown in edit mode.
function ComplaintForm({ mode, initial, customerId, nextId, updatedBy, onClose, onSubmit }: {
  mode: "create" | "edit"; initial: Complaint | null; customerId: string; nextId: string; updatedBy: string;
  onClose: () => void; onSubmit: (rec: Complaint) => void;
}) {
  const [record, setRecord] = React.useState(initial?.record ?? "");
  const [dateISO, setDateISO] = React.useState(initial?.dateISO ?? COMPLAINT_NOW_INPUT);
  const [stage, setStage] = React.useState<ComplaintStatus>(initial?.stage ?? "New");
  const [category, setCategory] = React.useState(initial?.category ?? "");
  const [priority, setPriority] = React.useState<ComplaintPriority>(initial?.priority ?? "Medium");
  const [owner, setOwner] = React.useState(initial?.owner ?? "");
  const [channel, setChannel] = React.useState<Complaint["channel"]>(initial?.channel ?? "Call Center");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [err, setErr] = React.useState("");

  const cls = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600";

  const submit = () => {
    if (!record.trim() || !dateISO || !category.trim() || !owner.trim() || !description.trim()) { setErr("Please complete all required fields."); return; }
    const rec: Complaint = {
      id: mode === "edit" && initial ? initial.id : nextId,
      customerId,
      dateISO,
      date: complaintDisplayDate(dateISO),
      record: record.trim(),
      category: category.trim(),
      priority,
      owner: owner.trim(),
      stage,
      channel,
      impact: initial?.impact ?? "",
      related: initial?.related ?? "",
      description: description.trim(),
      sourceSystem: initial?.sourceSystem ?? "Manual entry",
      updatedAt: COMPLAINT_NOW_TS, updatedBy,
      timeline: mode === "edit" && initial
        ? [...initial.timeline, { ts: COMPLAINT_NOW_TS, event: "Complaint updated" }]
        : [{ ts: COMPLAINT_NOW_TS, event: "Complaint case created" }],
    };
    onSubmit(rec);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 modal-enter" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto modal-enter" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Complaint intake form</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">{mode === "create" ? "New customer complaint" : `Edit · ${initial?.id}`}</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Complaint</label>
            <input value={record} onChange={(e) => setRecord(e.target.value)} placeholder="e.g. ATM did not dispense cash" className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Reported date</label>
            <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select value={stage} onChange={(e) => setStage(e.target.value as ComplaintStatus)} className={cls}>
              {COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. ATM / Cash" className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as ComplaintPriority)} className={cls}>
              {COMPLAINT_PRIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Assigned team</label>
            <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Disputes Team" className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as Complaint["channel"])} className={cls}>
              {COMPLAINT_CHANNELS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Complaint description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={cls} />
          </div>
          {mode === "edit" && initial && initial.timeline.length > 0 && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-2">Activity logs</label>
              <ol className="border-l border-slate-200 pl-5 space-y-3">
                {initial.timeline.map((t, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300" />
                    <div className="text-sm font-medium text-slate-800">{t.event}</div>
                    <div className="text-xs text-slate-400">{t.ts}</div>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {err && <div className="sm:col-span-2 text-sm text-red-600">{err}</div>}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={submit} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy hover:brightness-95">Create complaint</button>
        </div>
      </div>
    </div>
  );
}

// --- Mini App Activity helpers ---
const MINI_STATUS_STYLES: Record<MiniAppStatus, string> = {
  Started: "bg-primary-100 text-primary-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Completed: "bg-green-100 text-green-700",
  Abandoned: "bg-slate-100 text-slate-600",
  Cancelled: "bg-slate-200 text-slate-700",
  Expired: "bg-orange-100 text-orange-700",
  Failed: "bg-red-100 text-red-700",
  Error: "bg-red-100 text-red-700",
};
const MINI_STATUSES: MiniAppStatus[] = ["Started", "In Progress", "Completed", "Abandoned", "Cancelled", "Expired", "Failed", "Error"];
const MINI_FLAGS: MiniAppInvestigationFlag[] = ["None", "Marked for investigation", "Under investigation", "Escalated"];

// Mini App session detail drawer — read-only, right-side slide-over with an Investigate action.
function MiniAppDrawer({ record, onClose, onInvestigate }: { record: MiniAppSession; onClose: () => void; onInvestigate: () => void }) {
  const Field = ({ label, value, span }: { label: string; value: React.ReactNode; span?: boolean }) => (
    <div className={span ? "sm:col-span-2" : ""}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
  const hasTxn = !!record.transactionReference;
  const money = (n?: number) => (n == null ? "—" : formatMoney(n, record.currency ?? "USD"));
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-md bg-white shadow-xl overflow-y-auto modal-enter flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Mini App Activity · {record.id}</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">{record.record}</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">Mini app overview</h4>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Mini app name" value={record.record} span />
              <Field label="Mini app ID" value={record.miniAppId} />
              <Field label="Category" value={record.category} />
              <Field label="Provider" value={record.provider} />
              <Field label="Provider type" value={record.providerType} />
              <div className="sm:col-span-2">
                <div className="text-xs text-slate-500">Session status</div>
                <span className={`mt-1 inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${MINI_STATUS_STYLES[record.stage]}`}>{record.stage}</span>
              </div>
              <Field label="Final outcome" value={record.finalOutcome} span />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">Session information</h4>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Session ID" value={record.sessionId} />
              <Field label="Session start" value={record.date} />
              <Field label="Session end" value={record.sessionEnd} />
              <Field label="Session duration" value={record.duration} />
              <Field label="Entry source" value={record.entrySource} />
              <Field label="Entry screen" value={record.entryScreen} />
              <Field label="Exit screen" value={record.exitScreen} />
              <Field label="Screen views" value={record.screenViews} />
              <Field label="Click events" value={record.clickEvents} />
              <Field label="Abandonment step" value={record.abandonmentStep} />
              <Field label="Device ID" value={record.device} />
              <Field label="Device type" value={record.deviceType} />
              <Field label="Mobile banking version" value={record.mobileAppVersion} />
              <Field label="Mini app version" value={record.miniAppVersion} />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">Customer navigation path</h4>
            <div className="flex flex-wrap items-center gap-1.5">
              {record.navigationPath.map((step, i) => (
                <React.Fragment key={i}>
                  <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{step}</span>
                  {i < record.navigationPath.length - 1 && <Icon name="arrow_forward" className="text-slate-400 text-sm" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">Related financial transaction</h4>
            {hasTxn ? (
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <Field label="Transaction reference" value={record.transactionReference} />
                <Field label="Partner reference" value={record.partnerTransactionReference ?? "—"} />
                <Field label="Transaction type" value={record.transactionType ?? "—"} />
                <Field label="Amount" value={money(record.value)} />
                <Field label="Currency" value={record.currency ?? "—"} />
                <Field label="Fee" value={money(record.fee)} />
                <Field label="Discount" value={money(record.discount)} />
                <Field label="Net amount" value={money(record.netAmount)} />
                <Field label="Payment method" value={record.paymentMethod ?? "—"} />
                <Field label="Payment account" value={record.paymentAccount ?? "—"} />
                <Field label="Merchant / service provider" value={record.merchant ?? "—"} span />
                <Field label="Transaction status" value={record.transactionStatus ?? "—"} />
                <Field label="Settlement status" value={record.settlementStatus ?? "—"} />
                <Field label="Refund status" value={record.refundStatus ?? "—"} />
                <Field label="Transaction date and time" value={record.transactionDate ?? "—"} span />
              </div>
            ) : (
              <p className="text-sm text-slate-400">No financial transaction was made in this session.</p>
            )}
          </div>

          {(record.internalNote || record.supportCase || record.complaintLink || record.linkedTransaction ||
            record.linkedBusinessReference || (record.investigationFlag && record.investigationFlag !== "None") ||
            record.investigationResult) && (
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">Investigation</h4>
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {record.investigationFlag && record.investigationFlag !== "None" && <Field label="Investigation flag" value={record.investigationFlag} />}
                {record.refreshRequested && <Field label="Status refresh" value={record.refreshRequested} />}
                {record.supportCase && <Field label="Support case" value={record.supportCase} />}
                {record.complaintLink && <Field label="Complaint link" value={record.complaintLink} />}
                {record.linkedTransaction && <Field label="Linked transaction" value={record.linkedTransaction} />}
                {record.linkedBusinessReference && <Field label="Linked business reference" value={record.linkedBusinessReference} />}
                {record.internalNote && <Field label="Internal note" value={record.internalNote} span />}
                {record.investigationResult && <Field label="Investigation result" value={record.investigationResult} span />}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button type="button" onClick={onInvestigate} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gold text-navy text-sm font-semibold rounded-lg hover:brightness-95">
            <Icon name="policy" className="text-lg" />Investigate session
          </button>
        </div>
      </div>
    </div>
  );
}

// Mini app investigation form (modal) — layered on top of a seeded session record (edit only).
function MiniAppForm({ initial, updatedBy, onClose, onSubmit }: {
  initial: MiniAppSession; updatedBy: string; onClose: () => void; onSubmit: (rec: MiniAppSession) => void;
}) {
  const [internalNote, setInternalNote] = React.useState(initial.internalNote ?? "");
  const [supportCase, setSupportCase] = React.useState(initial.supportCase ?? "");
  const [complaintLink, setComplaintLink] = React.useState(initial.complaintLink ?? "");
  const [linkedTransaction, setLinkedTransaction] = React.useState(initial.linkedTransaction ?? "");
  const [linkedBusinessReference, setLinkedBusinessReference] = React.useState(initial.linkedBusinessReference ?? "");
  const [investigationFlag, setInvestigationFlag] = React.useState<MiniAppInvestigationFlag>(initial.investigationFlag ?? "None");
  const [refreshRequested, setRefreshRequested] = React.useState<"No" | "Requested">(initial.refreshRequested ?? "No");
  const [investigationResult, setInvestigationResult] = React.useState(initial.investigationResult ?? "");

  const cls = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600";

  const submit = () => {
    onSubmit({
      ...initial,
      internalNote: internalNote.trim(),
      supportCase: supportCase.trim(),
      complaintLink: complaintLink.trim(),
      linkedTransaction: linkedTransaction.trim(),
      linkedBusinessReference: linkedBusinessReference.trim(),
      investigationFlag,
      refreshRequested,
      investigationResult: investigationResult.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 modal-enter" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto modal-enter" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Mini app investigation actions</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">Investigate · {initial.id}</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Internal note</label>
            <textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={4} className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Support case</label>
            <input value={supportCase} onChange={(e) => setSupportCase(e.target.value)} placeholder="e.g. SUP-2026-0142" className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Complaint link</label>
            <input value={complaintLink} onChange={(e) => setComplaintLink(e.target.value)} placeholder="e.g. CMP-2026-00182" className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Linked transaction</label>
            <input value={linkedTransaction} onChange={(e) => setLinkedTransaction(e.target.value)} placeholder="e.g. TXN-778540" className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Linked business reference</label>
            <input value={linkedBusinessReference} onChange={(e) => setLinkedBusinessReference(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Investigation flag</label>
            <select value={investigationFlag} onChange={(e) => setInvestigationFlag(e.target.value as MiniAppInvestigationFlag)} className={cls}>
              {MINI_FLAGS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Request status refresh</label>
            <select value={refreshRequested} onChange={(e) => setRefreshRequested(e.target.value as "No" | "Requested")} className={cls}>
              {["No", "Requested"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Investigation result</label>
            <textarea value={investigationResult} onChange={(e) => setInvestigationResult(e.target.value)} rows={4} className={cls} />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={submit} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy hover:brightness-95">Save investigation updates</button>
        </div>
      </div>
    </div>
  );
}

// --- Sales Activities helpers ---
const SALES_STAGE_STYLES: Record<SalesStage, string> = {
  Interested: "bg-primary-100 text-primary-700",
  "Follow-up": "bg-amber-100 text-amber-700",
  Applied: "bg-slate-100 text-slate-600",
  Approved: "bg-green-100 text-green-700",
  Completed: "bg-green-200 text-green-800",
  Rejected: "bg-red-100 text-red-700",
};
const SALES_STAGES: SalesStage[] = ["Interested", "Follow-up", "Applied", "Approved", "Completed", "Rejected"];
const SALES_CHANNELS: SalesActivity["channel"][] = ["Phone", "Branch", "Meeting", "Email"];
// Base product/activity catalog; the form merges these with values already seen on the customer.
const SALES_PRODUCTS = [
  "Home Loan", "Personal Loan", "SME Loan", "Auto Loan", "Fixed Deposit Renewal",
  "Credit Card Upgrade", "Bancassurance", "Payroll Account", "Wealth / Investment", "Mobile Banking Enrollment",
];

// Sales activity detail drawer — read-only, right-side slide-over with an Edit action.
function SalesDrawer({ record, onClose, onEdit }: { record: SalesActivity; onClose: () => void; onEdit: () => void }) {
  const Field = ({ label, value, span }: { label: string; value: React.ReactNode; span?: boolean }) => (
    <div className={span ? "sm:col-span-2" : ""}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-md bg-white shadow-xl overflow-y-auto modal-enter flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Sales Activities · {record.id}</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">{record.record}</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">Sales information</h4>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="text-xs text-slate-500">Sales stage</div>
                <span className={`mt-1 inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${SALES_STAGE_STYLES[record.stage]}`}>{record.stage}</span>
              </div>
              <Field label="Activity date" value={record.date} />
              <Field label="Potential value" value={record.value} />
              <Field label="Sales owner" value={record.owner} />
              <Field label="Next action" value={record.next} />
              <Field label="Channel" value={record.channel} />
              <Field label="Probability" value={record.probability} />
              <Field label="Last updated" value={record.updatedAt ?? "—"} />
              <Field label="Updated by" value={record.updatedBy ?? "—"} />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">Purpose</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{record.purpose || "—"}</p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">Notes</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{record.notes || "—"}</p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">Activity logs</h4>
            <ol className="border-l border-slate-200 pl-5 space-y-4">
              {record.timeline.map((t, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300" />
                  <div className="text-sm font-medium text-slate-800">{t.event}</div>
                  <div className="text-xs text-slate-400">{t.ts}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button type="button" onClick={onEdit} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gold text-navy text-sm font-semibold rounded-lg hover:brightness-95">
            <Icon name="edit" className="text-lg" />Edit sales activity
          </button>
        </div>
      </div>
    </div>
  );
}

// Create / edit sales activity form (modal).
function SalesForm({ mode, initial, customerId, nextId, updatedBy, productOptions, onClose, onSubmit }: {
  mode: "create" | "edit"; initial: SalesActivity | null; customerId: string; nextId: string; updatedBy: string;
  productOptions: string[]; onClose: () => void; onSubmit: (rec: SalesActivity) => void;
}) {
  const [record, setRecord] = React.useState(initial?.record ?? "");
  const [subtitle, setSubtitle] = React.useState(initial?.subtitle ?? "");
  const [dateISO, setDateISO] = React.useState(initial?.dateISO ?? COMPLAINT_NOW_INPUT);
  const [stage, setStage] = React.useState<SalesStage>(initial?.stage ?? "Interested");
  const [value, setValue] = React.useState(initial?.value ?? "");
  const [owner, setOwner] = React.useState(initial?.owner ?? "");
  const [next, setNext] = React.useState(initial?.next ?? "");
  const [channel, setChannel] = React.useState<SalesActivity["channel"]>(initial?.channel ?? "Phone");
  const [probability, setProbability] = React.useState(initial?.probability ?? "");
  const [purpose, setPurpose] = React.useState(initial?.purpose ?? "");
  const [notes, setNotes] = React.useState(initial?.notes ?? "");
  const [err, setErr] = React.useState("");

  const cls = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600";

  const submit = () => {
    if (!record.trim() || !subtitle.trim() || !dateISO || !value.trim() || !owner.trim() || !next.trim() || !probability.trim() || !purpose.trim()) {
      setErr("Please complete all required fields."); return;
    }
    const rec: SalesActivity = {
      id: mode === "edit" && initial ? initial.id : nextId,
      customerId,
      dateISO,
      date: complaintDisplayDate(dateISO),
      record: record.trim(),
      subtitle: subtitle.trim(),
      stage,
      value: value.trim(),
      owner: owner.trim(),
      next: next.trim(),
      channel,
      probability: probability.trim(),
      purpose: purpose.trim(),
      notes: notes.trim(),
      sourceSystem: initial?.sourceSystem ?? "Manual entry",
      updatedAt: COMPLAINT_NOW_TS, updatedBy,
      timeline: mode === "edit" && initial
        ? [...initial.timeline, { ts: COMPLAINT_NOW_TS, event: "Sales activity updated" }]
        : [{ ts: COMPLAINT_NOW_TS, event: "Sales activity created" }],
    };
    onSubmit(rec);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 modal-enter" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto modal-enter" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Sales activity form</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">{mode === "create" ? "New sales activity" : `Edit · ${initial?.record}`}</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Product / activity</label>
            <select value={record} onChange={(e) => setRecord(e.target.value)} className={cls}>
              <option value="">Select product / activity</option>
              {productOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Short description</label>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. 12M FD maturing — offer renewal" className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Activity date</label>
            <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Sales stage</label>
            <select value={stage} onChange={(e) => setStage(e.target.value as SalesStage)} className={cls}>
              {SALES_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Potential value</label>
            <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. $25,000" className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Sales owner</label>
            <input value={owner} onChange={(e) => setOwner(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Next action</label>
            <input value={next} onChange={(e) => setNext(e.target.value)} placeholder="e.g. Call back Jul 20" className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as SalesActivity["channel"])} className={cls}>
              {SALES_CHANNELS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Probability</label>
            <input value={probability} onChange={(e) => setProbability(e.target.value)} placeholder="e.g. 60%" className={cls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Purpose</label>
            <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={4} className={cls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Notes <span className="font-normal text-slate-400">· optional</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={cls} />
          </div>
          {err && <div className="sm:col-span-2 text-sm text-red-600">{err}</div>}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={submit} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy hover:brightness-95">{mode === "create" ? "Create sales activity" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

// --- Internet Banking web activity helpers ---
const IB_OUTCOME_STYLES: Record<IbOutcome, string> = {
  Success: "bg-green-100 text-green-700",
  Failed: "bg-red-100 text-red-700",
  Blocked: "bg-orange-100 text-orange-700",
  Pending: "bg-amber-100 text-amber-700",
};
const IB_EVENT_ICONS: Record<IbEventType, string> = {
  Login: "login",
  "Failed login": "gpp_bad",
  Logout: "logout",
  "Account view": "visibility",
  "Statement download": "download",
  Transfer: "swap_horiz",
  "Bill payment": "receipt_long",
  "Beneficiary added": "person_add",
  "Password change": "password",
  "Profile update": "manage_accounts",
};
const IB_EVENT_TYPES: IbEventType[] = [
  "Login", "Failed login", "Logout", "Account view", "Statement download",
  "Transfer", "Bill payment", "Beneficiary added", "Password change", "Profile update",
];

// Internet Banking activity detail drawer — read-only, right-side slide-over.
function IbActivityDrawer({ record, onClose }: { record: IbActivity; onClose: () => void }) {
  const Field = ({ label, value, span }: { label: string; value: React.ReactNode; span?: boolean }) => (
    <div className={span ? "sm:col-span-2" : ""}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-md bg-white shadow-xl overflow-y-auto modal-enter flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Internet Banking · {record.id}</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">{record.description}</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">Activity</h4>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Event" value={<span className="inline-flex items-center gap-1.5"><Icon name={IB_EVENT_ICONS[record.type]} className="text-slate-400 text-base" />{record.type}</span>} />
              <div>
                <div className="text-xs text-slate-500">Outcome</div>
                <span className={`mt-1 inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${IB_OUTCOME_STYLES[record.outcome]}`}>{record.outcome}</span>
              </div>
              <Field label="Category" value={record.category} />
              <Field label="Time" value={record.date} />
              {record.account && <Field label="Account" value={record.account} />}
              {record.amount != null && <Field label="Amount" value={formatMoney(record.amount, record.ccy ?? "USD")} />}
              {record.reference && <Field label="Reference" value={record.reference} />}
              {record.failureReason && <Field label="Failure reason" value={record.failureReason} span />}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">Session &amp; device</h4>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Session ID" value={record.sessionId} />
              <Field label="Channel" value="Web browser" />
              <Field label="Browser / OS" value={record.browser} span />
              <Field label="IP address" value={record.ip} />
              <Field label="Location" value={record.location} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Mobile Banking app activity helpers ---
const MB_EVENT_ICONS: Record<MbEventType, string> = {
  Login: "login",
  "Failed login": "gpp_bad",
  Logout: "logout",
  "Account view": "visibility",
  "KHQR payment": "qr_code_2",
  Transfer: "swap_horiz",
  "Bill payment": "receipt_long",
  "Top-up": "phone_android",
  "Card control": "credit_card",
  "Biometric update": "fingerprint",
  "Push notification": "notifications",
};
const MB_EVENT_TYPES: MbEventType[] = [
  "Login", "Failed login", "Logout", "Account view", "KHQR payment", "Transfer",
  "Bill payment", "Top-up", "Card control", "Biometric update", "Push notification",
];

// Mobile Banking activity detail drawer — read-only, right-side slide-over.
function MbActivityDrawer({ record, onClose }: { record: MbActivity; onClose: () => void }) {
  const Field = ({ label, value, span }: { label: string; value: React.ReactNode; span?: boolean }) => (
    <div className={span ? "sm:col-span-2" : ""}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-md bg-white shadow-xl overflow-y-auto modal-enter flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Mobile Banking · {record.id}</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">{record.description}</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">Activity</h4>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Event" value={<span className="inline-flex items-center gap-1.5"><Icon name={MB_EVENT_ICONS[record.type]} className="text-slate-400 text-base" />{record.type}</span>} />
              <div>
                <div className="text-xs text-slate-500">Outcome</div>
                <span className={`mt-1 inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${IB_OUTCOME_STYLES[record.outcome]}`}>{record.outcome}</span>
              </div>
              <Field label="Category" value={record.category} />
              <Field label="Time" value={record.date} />
              {record.account && <Field label="Account" value={record.account} />}
              {record.amount != null && <Field label="Amount" value={formatMoney(record.amount, record.ccy ?? "USD")} />}
              {record.reference && <Field label="Reference" value={record.reference} />}
              {record.failureReason && <Field label="Failure reason" value={record.failureReason} span />}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">Device &amp; session</h4>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Session ID" value={record.sessionId} />
              <Field label="Channel" value="Mobile app" />
              <Field label="Device" value={record.device} />
              <Field label="OS" value={record.os} />
              <Field label="App version" value={record.appVersion} span />
              {record.authMethod && <Field label="Auth method" value={record.authMethod} />}
              <Field label="IP address" value={record.ip} />
              <Field label="Location" value={<span className="inline-flex items-center gap-1.5">{record.location}{record.foreign && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">Foreign</span>}</span>} span />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Customer Reports (relationship packs) ---
const REPORT_PACKS: {
  key: ReportPackKey; title: string; description: string; icon: string;
  formats: ReportFormat[]; defaultRangeDays: number;
}[] = [
  { key: "customer-summary", title: "Customer summary", description: "Profile, KYC, segment, products held, and relationship value.", icon: "badge", formats: ["PDF", "CSV"], defaultRangeDays: 365 },
  { key: "account-statement", title: "Account & balance statement", description: "CASA balances and statement movements for the selected period.", icon: "account_balance_wallet", formats: ["PDF", "CSV"], defaultRangeDays: 30 },
  { key: "loan-summary", title: "Loan / repayment summary", description: "Facilities, outstanding, installments, and repayment history.", icon: "real_estate_agent", formats: ["PDF", "CSV"], defaultRangeDays: 180 },
  { key: "channel-activity", title: "Channel activity pack", description: "Highlights from Internet Banking, Mobile Banking, and ATM activity.", icon: "devices", formats: ["PDF"], defaultRangeDays: 30 },
  { key: "complaints-sales", title: "Complaints & sales snapshot", description: "Open complaints, pipeline opportunities, and recent call outcomes.", icon: "handshake", formats: ["PDF"], defaultRangeDays: 90 },
  { key: "relationship-briefing", title: "Relationship briefing", description: "One-pager for RM visits — products, risk flags, and next actions.", icon: "description", formats: ["PDF"], defaultRangeDays: 90 },
];
const REPORT_STATUS_STYLES: Record<ReportStatus, string> = {
  Ready: "bg-green-100 text-green-700",
  Generating: "bg-amber-100 text-amber-700",
  Failed: "bg-red-100 text-red-700",
};

function daysAgoISO(days: number): string {
  const d = new Date(2026, 6, 15); // APP_NOW anchor — Jul 15, 2026
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// Generate report pack modal.
function ReportGenerateForm({ pack, customerId, nextId, generatedBy, onClose, onSubmit }: {
  pack: (typeof REPORT_PACKS)[number]; customerId: string; nextId: string; generatedBy: string;
  onClose: () => void; onSubmit: (rec: GeneratedReport) => void;
}) {
  const [format, setFormat] = React.useState<ReportFormat>(pack.formats[0]);
  const [dateFrom, setDateFrom] = React.useState(daysAgoISO(pack.defaultRangeDays));
  const [dateTo, setDateTo] = React.useState("2026-07-15");
  const [err, setErr] = React.useState("");
  const cls = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600";

  const submit = () => {
    if (!dateFrom || !dateTo) { setErr("Please select a date range."); return; }
    if (dateFrom > dateTo) { setErr("From date must be on or before To date."); return; }
    const sizeKb = format === "CSV" ? 18 + (pack.key.length % 20) : 140 + (pack.key.length * 12);
    onSubmit({
      id: nextId, customerId, packKey: pack.key, title: pack.title, format,
      dateFrom, dateTo, generatedAt: "Jul 16, 2026 - 11:32 AM", generatedBy,
      status: "Ready", size: `${sizeKb} KB`,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 modal-enter" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md modal-enter" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Generate report pack</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">{pack.title}</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="close" className="text-lg" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-500">{pack.description}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={cls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={cls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Format</label>
            <div className="flex gap-2">
              {pack.formats.map((f) => (
                <button key={f} type="button" onClick={() => setFormat(f)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${format === f ? "bg-gold text-navy border-gold" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={submit} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy hover:brightness-95">Generate report</button>
        </div>
      </div>
    </div>
  );
}

// Gift Zone status pill colours — one table drives both the row badge and the modal badge.
const GIFT_STATUS_STYLES: Record<GiftTransaction["status"], string> = {
  Sent: "bg-green-100 text-green-800",
  Pending: "bg-amber-100 text-amber-800",
  Failed: "bg-red-100 text-red-800",
};

// Editable field — shown in place of Info when the Customer Info tab is in edit mode.
// Defined at module scope so inputs keep focus across re-renders.
function Field({ label, value, onChange, type = "text", options, span }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; options?: string[]; span?: boolean;
}) {
  const cls = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-colors";
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  );
}

// KHR→USD for a single relationship-value figure (prototype rate).
const usd = (v: number, ccy: "USD" | "KHR") => (ccy === "KHR" ? v / 4100 : v);

// Product-holding label with currency folded in, e.g. "Savings (KHR)" / "Current (Business - USD)".
const acctLabel = (type: string, ccy: string) => {
  const base = type.split("·")[0].trim();
  return base.includes("(") ? base.replace(/\)\s*$/, ` - ${ccy})`) : `${base} (${ccy})`;
};

// Card network derived from the product name (display only).
const cardNetwork = (t: string) =>
  /master/i.test(t) ? "Mastercard" : /union/i.test(t) ? "UnionPay" : /jcb/i.test(t) ? "JCB" : /visa/i.test(t) ? "Visa" : "Local scheme";

function OnOff({ on }: { on: boolean }) {
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${on ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{on ? "On" : "Off"}</span>;
}

// Compact KPI tile used by the digital-channel tabs.
function StatTile({ label, value, cls = "text-slate-900" }: { label: string; value: React.ReactNode; cls?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-xl font-extrabold mt-1 ${cls}`}>{value}</div>
    </div>
  );
}

// Deterministic demo values derived from the (masked) card number.
const cardExpiry = (no: string) => { const n = parseInt(no.replace(/\D/g, "").slice(-4) || "1", 10); return `${String((n % 12) + 1).padStart(2, "0")}/${28 + (n % 3)}`; };
const cardSpend = (no: string) => { const n = parseInt(no.replace(/\D/g, "").slice(-4) || "1", 10); return 200 + (n % 1800); };

// Deterministic demo card transactions derived from the (masked) card number —
// stand-in for a real card-authorization feed until wired to a backend.
const CARD_MERCHANTS = [
  { m: "Brown Coffee — BKK1", cat: "Dining", icon: "local_cafe" },
  { m: "Lucky Supermarket", cat: "Groceries", icon: "shopping_cart" },
  { m: "TOTAL Petrol Station", cat: "Fuel", icon: "local_gas_station" },
  { m: "AEON Mall Sen Sok", cat: "Retail", icon: "storefront" },
  { m: "Smart Axiata top-up", cat: "Telecom", icon: "smartphone" },
  { m: "Grab ride", cat: "Transport", icon: "local_taxi" },
  { m: "Amazon Web Services", cat: "Online", icon: "language" },
];
function cardTxns(no: string) {
  const seed = parseInt(no.replace(/\D/g, "").slice(-4) || "1", 10);
  const count = 9 + (seed % 8); // 9–16 authorizations, enough to paginate
  return Array.from({ length: count }, (_, i) => {
    const merchant = CARD_MERCHANTS[(seed + i * 3) % CARD_MERCHANTS.length];
    const amount = Math.round(((seed % 40) + 4 + i * 6.5) * 100) / 100;
    const day = Math.max(1, 29 - i * 2); // spread across ~30 days
    return {
      id: `AUTH-${seed}${i}`,
      merchant: merchant.m,
      category: merchant.cat,
      icon: merchant.icon,
      date: `2026-07-${String(day).padStart(2, "0")}`,
      amount,
      status: i % 5 === 2 ? "Pending" : "Posted",
    };
  });
}

// Deterministic per-customer payment history — the real mock TRANSACTIONS are sparse
// (1–2 per customer), so we synthesize a fuller 30-day statement for the Payments tab.
type PayRow = { id: string; date: string; time: string; type: string; channel: string; counterparty: string; amount: number; ccy: "USD" | "KHR"; status: string };
const PAY_TEMPLATES: { type: string; channel: string; cp: string; base: number; ccy: "USD" | "KHR" }[] = [
  { type: "KHQR Payment", channel: "KHQR", cp: "Brown Coffee — BKK1", base: -12.5, ccy: "USD" },
  { type: "KHQR Payment", channel: "KHQR", cp: "Lucky Supermarket", base: -38, ccy: "USD" },
  { type: "Bakong Transfer", channel: "Bakong", cp: "→ Wing (012 345 678)", base: -25, ccy: "USD" },
  { type: "Bill Payment", channel: "Bill", cp: "EDC Electricity", base: -85000, ccy: "KHR" },
  { type: "Mobile Top-up", channel: "Bill", cp: "Smart Axiata", base: -5, ccy: "USD" },
  { type: "Interbank Transfer", channel: "Transfer", cp: "→ ACLEDA ••3391", base: -120, ccy: "USD" },
  { type: "Fund Transfer In", channel: "Transfer", cp: "← ABA ••8842", base: 300, ccy: "USD" },
  { type: "Salary Credit", channel: "Transfer", cp: "Monthly payroll", base: 900, ccy: "USD" },
];
function buildPayments(name: string, cif: string): PayRow[] {
  const seed = parseInt(cif.replace(/\D/g, "").slice(-4) || "1", 10);
  const real: PayRow[] = TRANSACTIONS.filter((t) => t.customer === name).map((t) => ({
    id: t.id, date: "2026-07-15", time: t.time, type: t.type, channel: t.channel,
    counterparty: t.counterparty, amount: t.amount, ccy: t.ccy, status: t.status,
  }));
  const count = 16 + (seed % 8);
  const base = new Date("2026-07-15");
  const gen: PayRow[] = Array.from({ length: count }, (_, i) => {
    const tpl = PAY_TEMPLATES[(seed + i) % PAY_TEMPLATES.length];
    const d = new Date(base); d.setDate(base.getDate() - ((i % 15) * 2) - 1); // within ~30 days
    const mult = 1 + ((seed + i * 7) % 60) / 100;
    const raw = tpl.base * mult;
    const amount = tpl.ccy === "KHR" ? Math.round(raw / 500) * 500 : Math.round(raw * 100) / 100;
    return {
      id: `TXN-${seed}${String(i).padStart(2, "0")}`,
      date: d.toISOString().slice(0, 10),
      time: `${String(8 + (i % 11)).padStart(2, "0")}:${String((seed * 7 + i * 13) % 60).padStart(2, "0")}`,
      type: tpl.type, channel: tpl.channel, counterparty: tpl.cp, amount, ccy: tpl.ccy,
      status: i % 11 === 4 ? "Reversed" : "Success",
    };
  });
  return [...real, ...gen].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.time < b.time ? 1 : -1));
}

// Deterministic staff/system audit trail for a customer record (read-only, immutable).
type AuditCategory = "Profile" | "Access" | "Servicing" | "Consent & docs" | "Security" | "Approvals";
type AuditRow = {
  id: string; ts: string; date: string; actor: string; role: string; actorId: string;
  category: AuditCategory; action: string; field?: string; before?: string; after?: string;
  source: string; result: "Success" | "Failed" | "Pending"; sensitive?: boolean;
};
const AUDIT_ACTORS = [
  { name: "Tit Thida", role: "Teller", id: "116005", src: "Branch · Toul Kork" },
  { name: "Mom Thavy", role: "Relationship Officer", id: "124142", src: "Branch · Pochentong" },
  { name: "Sok Chanthy", role: "Officer", id: "118330", src: "Branch · Siem Reap" },
  { name: "System", role: "Automated", id: "SYS", src: "Core Banking" },
  { name: "Dara Kong", role: "Supervisor", id: "121002", src: "HQ · Phnom Penh" },
];
const AUDIT_EVENTS: Omit<AuditRow, "id" | "ts" | "date" | "actor" | "role" | "actorId" | "source">[] = [
  { category: "Access", action: "Viewed customer profile", result: "Success" },
  { category: "Access", action: "Exported customer info for CBC", result: "Success", sensitive: true },
  { category: "Profile", action: "Updated customer address", field: "address", before: "St. 271, Toul Kork", after: "St. 315, Boeung Kak", result: "Success" },
  { category: "Profile", action: "Updated mobile number", field: "phone", before: "+855 12 456 789", after: "+855 12 456 700", result: "Success" },
  { category: "Profile", action: "Changed KYC status", field: "kyc", before: "Verified", after: "Review due", result: "Success", sensitive: true },
  { category: "Servicing", action: "Blocked debit card ••5518", field: "card.status", before: "Active", after: "Blocked", result: "Success", sensitive: true },
  { category: "Servicing", action: "Opened savings account", result: "Success" },
  { category: "Consent & docs", action: "Uploaded income document", result: "Success" },
  { category: "Consent & docs", action: "Updated marketing consent", field: "consent", before: "Not set", after: "Opted in", result: "Success" },
  { category: "Security", action: "MFA reset requested", result: "Success", sensitive: true },
  { category: "Security", action: "Failed login attempt", result: "Failed" },
  { category: "Approvals", action: "Limit-increase request submitted", result: "Pending" },
  { category: "Approvals", action: "Approved risk-rating override", field: "risk", before: "Medium", after: "Low", result: "Success", sensitive: true },
];
function buildAuditLogs(cif: string): AuditRow[] {
  const num = cif.replace(/\D/g, "").slice(-4) || "1";
  const seed = parseInt(num, 10);
  const count = 22 + (seed % 10);
  const base = new Date("2026-07-15");
  return Array.from({ length: count }, (_, i) => {
    const ev = AUDIT_EVENTS[(seed + i * 3) % AUDIT_EVENTS.length];
    const actor = AUDIT_ACTORS[(seed + i) % AUDIT_ACTORS.length];
    const d = new Date(base); d.setDate(base.getDate() - (i % 20));
    const date = d.toISOString().slice(0, 10);
    const ts = `${date} ${String(8 + (i % 10)).padStart(2, "0")}:${String((seed * 7 + i * 11) % 60).padStart(2, "0")}:${String((seed * 13 + i * 7) % 60).padStart(2, "0")}`;
    return {
      ...ev,
      id: `AUD-${num}-${String(i).padStart(4, "0")}`,
      ts, date,
      actor: actor.name, role: actor.role, actorId: actor.id,
      source: actor.name === "System" ? actor.src : `${actor.src} · 10.2.${(seed + i) % 254}`,
    };
  }).sort((a, b) => (a.ts < b.ts ? 1 : -1));
}

// The individual facet = the flat Customer fields editable from the Customer Info tab.
type IndividualView = Pick<Customer,
  "name" | "khmerName" | "dob" | "gender" | "marital" | "nationality" |
  "idType" | "idNo" | "idExpiry" | "phone" | "email" | "address" |
  "occupation" | "company" | "incomeUSD">;

const EMPTY_INDIV: IndividualView = {
  name: "", khmerName: "", dob: "", gender: "Male", marital: "Single", nationality: "Cambodia (KH)",
  idType: "National ID", idNo: "", idExpiry: "", phone: "+855 ", email: "", address: "",
  occupation: "", company: "", incomeUSD: null,
};
const EMPTY_CORP: CorporateFacet = {
  name: "", khmerName: "", businessNature: "", nationality: "Cambodia (KH)", incorporationDate: "",
  idType: "Business Registration", registrationNo: "", idExpiry: "", phone: "+855 ", email: "",
  address: "", contactPerson: "", incomeUSD: null,
};

export default function Customer360Page() {
  const params = useParams<{ cif: string }>();
  const base = CUSTOMERS.find((x) => x.id === decodeURIComponent(params.cif)) ?? CUSTOMERS[0];

  // Local edits layered over the mock record (prototype — no backend persistence).
  const [overrides, setOverrides] = React.useState<Partial<Customer>>({});
  const customer = { ...base, ...overrides };
  const isCorp = customer.customerType === "Corporate";

  // Which facets this CIF holds, and which one is active in the Customer Info tab.
  const profiles = customer.profiles ?? [customer.customerType];
  const hasIndiv = profiles.includes("Individual");
  const hasCorp = profiles.includes("Corporate");
  const dual = hasIndiv && hasCorp;
  const [facet, setFacet] = React.useState<"Individual" | "Corporate">(base.customerType);

  // Individual facet reads from the flat fields; corporate facet reads from the
  // nested object, or is derived from flat fields for a corporate-primary CIF.
  const indivView: IndividualView = {
    name: customer.name, khmerName: customer.khmerName, dob: customer.dob, gender: customer.gender,
    marital: customer.marital, nationality: customer.nationality, idType: customer.idType,
    idNo: customer.idNo, idExpiry: customer.idExpiry, phone: customer.phone, email: customer.email,
    address: customer.address, occupation: customer.occupation, company: customer.company, incomeUSD: customer.incomeUSD,
  };
  const corpView: CorporateFacet | null = customer.corporate
    ?? (customer.customerType === "Corporate"
      ? {
        name: customer.name, khmerName: customer.khmerName, businessNature: customer.businessNature ?? "",
        nationality: customer.nationality, incorporationDate: customer.incorporationDate ?? "",
        idType: customer.idType, registrationNo: customer.registrationNo ?? customer.idNo, idExpiry: customer.idExpiry,
        phone: customer.phone, email: customer.email, address: customer.address,
        contactPerson: customer.contactPerson ?? "", incomeUSD: customer.incomeUSD,
      }
      : null);
  const corpPrimary = customer.customerType === "Corporate" && !customer.corporate;

  const [tab, setTab] = React.useState<Tab>("Overviews");
  const [actCh, setActCh] = React.useState<string>("All");     // Payments: channel filter
  const [payQ, setPayQ] = React.useState("");                   // Payments: search + status + date + paging
  const [payStatus, setPayStatus] = React.useState("All");
  const [payFrom, setPayFrom] = React.useState("");
  const [payTo, setPayTo] = React.useState("");
  const [payPage, setPayPage] = React.useState(1);
  const [payPerPage, setPayPerPage] = React.useState(8);
  const [audQ, setAudQ] = React.useState("");                  // Audit Logs: filters + paging + expand
  const [audCat, setAudCat] = React.useState("All");
  const [audActor, setAudActor] = React.useState("All");
  const [audResult, setAudResult] = React.useState("All");
  const [audFrom, setAudFrom] = React.useState("");
  const [audTo, setAudTo] = React.useState("");
  const [audPage, setAudPage] = React.useState(1);
  const [audPerPage, setAudPerPage] = React.useState(8);
  const [audOpen, setAudOpen] = React.useState<string | null>(null);
  const [mblPage, setMblPage] = React.useState(1);              // Mobile Banking: filters + paging (legacy keys reused for page)
  const [mblPerPage, setMblPerPage] = React.useState(8);
  const [mbQ, setMbQ] = React.useState("");
  const [mbType, setMbType] = React.useState("All");
  const [mbOutcome, setMbOutcome] = React.useState("All");
  const [mbFrom, setMbFrom] = React.useState("");
  const [mbTo, setMbTo] = React.useState("");
  const [mbSelected, setMbSelected] = React.useState<MbActivity | null>(null);
  const [mbRefreshedAt, setMbRefreshedAt] = React.useState("Jul 16, 2026 - 11:30 AM");
  const [rptQ, setRptQ] = React.useState("");
  const [rptStatus, setRptStatus] = React.useState("All");
  const [rptFormat, setRptFormat] = React.useState("All");
  const [rptPage, setRptPage] = React.useState(1);
  const [rptPerPage, setRptPerPage] = React.useState(8);
  const [rptAdded, setRptAdded] = React.useState<GeneratedReport[]>([]);
  const [rptSeq, setRptSeq] = React.useState(42);
  const [rptForm, setRptForm] = React.useState<(typeof REPORT_PACKS)[number] | null>(null);
  const [rptRefreshedAt, setRptRefreshedAt] = React.useState("Jul 16, 2026 - 11:30 AM");
  const [selectedFdNo, setSelectedFdNo] = React.useState<string | null>(null); // selected fixed deposit
  const [cardIdx, setCardIdx] = React.useState(0);      // selected card in the Cards tab
  const [txnPage, setTxnPage] = React.useState(1);      // card-transactions pagination
  const [txnPerPage, setTxnPerPage] = React.useState(5);
  const [txnQ, setTxnQ] = React.useState("");           // card-transactions search + date filter
  const [txnFrom, setTxnFrom] = React.useState("");
  const [txnTo, setTxnTo] = React.useState("");
  const resetTxnView = () => { setTxnPage(1); setTxnQ(""); setTxnFrom(""); setTxnTo(""); };
  const [editing, setEditing] = React.useState(false);
  const [indivDraft, setIndivDraft] = React.useState<IndividualView | null>(null);
  const [corpDraft, setCorpDraft] = React.useState<CorporateFacet | null>(null);
  const [toast, setToast] = React.useState<ToastMsg>(null);
  const [selectedInvestment, setSelectedInvestment] = React.useState<Investment | null>(null); // Investments: active fund
  const [showAllHistory, setShowAllHistory] = React.useState(false); // Investments: expand performance
  const [selectedInsurance, setSelectedInsurance] = React.useState<Insurance | null>(null); // Insurances: active policy
  const [selectedGift, setSelectedGift] = React.useState<GiftTransaction | null>(null); // Gift Zone: open transaction
  const [locMonth, setLocMonth] = React.useState<string>("all"); // Locations: month filter ("all" | "YYYY-M")
  const [locEventId, setLocEventId] = React.useState<string | null>(null); // Locations: focused event
  const [atmQ, setAtmQ] = React.useState("");                 // Cash ATM: search + filters + paging
  const [atmStatus, setAtmStatus] = React.useState("All");
  const [atmFrom, setAtmFrom] = React.useState("");
  const [atmTo, setAtmTo] = React.useState("");
  const [atmPage, setAtmPage] = React.useState(1);
  const [atmPerPage, setAtmPerPage] = React.useState(8);
  const [atmSelected, setAtmSelected] = React.useState<AtmActivity | null>(null); // open detail drawer
  const [atmForm, setAtmForm] = React.useState<{ mode: "create" | "edit"; record: AtmActivity | null } | null>(null);
  const [atmAdded, setAtmAdded] = React.useState<AtmActivity[]>([]);        // locally recorded ATM activity
  const [atmEdits, setAtmEdits] = React.useState<Record<string, AtmActivity>>({}); // local edits by id
  const [atmSeq, setAtmSeq] = React.useState(600000);
  const [atmRefreshedAt, setAtmRefreshedAt] = React.useState("Jul 16, 2026 - 11:30 AM");
  const [callQ, setCallQ] = React.useState("");               // Call Center: search + filters + paging
  const [callStatus, setCallStatus] = React.useState("All");
  const [callFrom, setCallFrom] = React.useState("");
  const [callTo, setCallTo] = React.useState("");
  const [callPage, setCallPage] = React.useState(1);
  const [callPerPage, setCallPerPage] = React.useState(8);
  const [callSelected, setCallSelected] = React.useState<CallActivity | null>(null); // open detail drawer
  const [callForm, setCallForm] = React.useState<{ mode: "create" | "edit"; record: CallActivity | null } | null>(null);
  const [callAdded, setCallAdded] = React.useState<CallActivity[]>([]);        // locally logged calls
  const [callEdits, setCallEdits] = React.useState<Record<string, CallActivity>>({}); // local edits by id
  const [callSeq, setCallSeq] = React.useState(783);
  const [callRefreshedAt, setCallRefreshedAt] = React.useState("Jul 16, 2026 - 11:30 AM");
  const [cmpQ, setCmpQ] = React.useState("");                 // Compliance: search + filters + paging
  const [cmpStatus, setCmpStatus] = React.useState("All");
  const [cmpFrom, setCmpFrom] = React.useState("");
  const [cmpTo, setCmpTo] = React.useState("");
  const [cmpPage, setCmpPage] = React.useState(1);
  const [cmpPerPage, setCmpPerPage] = React.useState(8);
  const [cmpSelected, setCmpSelected] = React.useState<Complaint | null>(null); // open detail drawer
  const [cmpForm, setCmpForm] = React.useState<{ mode: "create" | "edit"; record: Complaint | null } | null>(null);
  const [cmpAdded, setCmpAdded] = React.useState<Complaint[]>([]);        // locally created complaints
  const [cmpEdits, setCmpEdits] = React.useState<Record<string, Complaint>>({}); // local edits by id
  const [cmpSeq, setCmpSeq] = React.useState(183);
  const [cmpRefreshedAt, setCmpRefreshedAt] = React.useState("Jul 16, 2026 - 11:30 AM");
  const [miniQ, setMiniQ] = React.useState("");               // Mini App: search + filters + paging
  const [miniStatus, setMiniStatus] = React.useState("All");
  const [miniFrom, setMiniFrom] = React.useState("");
  const [miniTo, setMiniTo] = React.useState("");
  const [miniPage, setMiniPage] = React.useState(1);
  const [miniPerPage, setMiniPerPage] = React.useState(8);
  const [miniSelected, setMiniSelected] = React.useState<MiniAppSession | null>(null); // open detail drawer
  const [miniForm, setMiniForm] = React.useState<MiniAppSession | null>(null);         // investigation form target
  const [miniEdits, setMiniEdits] = React.useState<Record<string, MiniAppSession>>({}); // investigation edits by id
  const [miniRefreshedAt, setMiniRefreshedAt] = React.useState("Jul 16, 2026 - 11:30 AM");
  const [salesQ, setSalesQ] = React.useState("");             // Sales Activities: search + filters + paging
  const [salesStage, setSalesStage] = React.useState("All");
  const [salesFrom, setSalesFrom] = React.useState("");
  const [salesTo, setSalesTo] = React.useState("");
  const [salesPage, setSalesPage] = React.useState(1);
  const [salesPerPage, setSalesPerPage] = React.useState(8);
  const [salesSelected, setSalesSelected] = React.useState<SalesActivity | null>(null); // open detail drawer
  const [salesForm, setSalesForm] = React.useState<{ mode: "create" | "edit"; record: SalesActivity | null } | null>(null);
  const [salesAdded, setSalesAdded] = React.useState<SalesActivity[]>([]);        // locally created activities
  const [salesEdits, setSalesEdits] = React.useState<Record<string, SalesActivity>>({}); // local edits by id
  const [salesSeq, setSalesSeq] = React.useState(129);
  const [salesRefreshedAt, setSalesRefreshedAt] = React.useState("Jul 16, 2026 - 11:30 AM");
  const [activeMerchant, setActiveMerchant] = React.useState("Cambo Coffee Hub"); // Merchants: selected business
  const [ibQ, setIbQ] = React.useState("");                   // Internet Banking: search + filters + paging
  const [ibType, setIbType] = React.useState("All");
  const [ibOutcome, setIbOutcome] = React.useState("All");
  const [ibFrom, setIbFrom] = React.useState("");
  const [ibTo, setIbTo] = React.useState("");
  const [ibPage, setIbPage] = React.useState(1);
  const [ibPerPage, setIbPerPage] = React.useState(8);
  const [ibSelected, setIbSelected] = React.useState<IbActivity | null>(null); // open detail drawer
  const [ibRefreshedAt, setIbRefreshedAt] = React.useState("Jul 16, 2026 - 11:30 AM");
  const [selectedAccountHistory, setSelectedAccountHistory] = React.useState<string | null>(null); // Accounts: focused account no.
  const [hoveredSlice, setHoveredSlice] = React.useState<number | null>(null); // Accounts: donut hover
  const [txnsLimit, setTxnsLimit] = React.useState(10); // Accounts: recent transactions shown

  // Close the Gift Zone detail modal on Escape.
  React.useEffect(() => {
    if (!selectedGift) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedGift(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedGift]);

  const startEdit = () => {
    if (facet === "Individual") setIndivDraft({ ...indivView });
    else setCorpDraft({ ...(corpView ?? EMPTY_CORP) });
    setEditing(true);
  };
  const cancelEdit = () => { setEditing(false); setIndivDraft(null); setCorpDraft(null); };
  const saveEdit = () => {
    if (facet === "Individual" && indivDraft) {
      setOverrides((o) => ({ ...o, ...indivDraft }));
    } else if (facet === "Corporate" && corpDraft) {
      if (corpPrimary) {
        // Corporate is the primary facet — persist back onto the flat fields.
        setOverrides((o) => ({
          ...o, name: corpDraft.name, khmerName: corpDraft.khmerName, businessNature: corpDraft.businessNature,
          nationality: corpDraft.nationality, incorporationDate: corpDraft.incorporationDate, idType: corpDraft.idType,
          registrationNo: corpDraft.registrationNo, idExpiry: corpDraft.idExpiry, phone: corpDraft.phone,
          email: corpDraft.email, address: corpDraft.address, contactPerson: corpDraft.contactPerson, incomeUSD: corpDraft.incomeUSD,
        }));
      } else {
        setOverrides((o) => ({ ...o, corporate: corpDraft }));
      }
    }
    setEditing(false); setIndivDraft(null); setCorpDraft(null);
    setToast({ message: `${facet} profile updated`, type: "success" });
  };
  const setIndiv = <K extends keyof IndividualView>(k: K) => (v: IndividualView[K]) =>
    setIndivDraft((d) => (d ? { ...d, [k]: v } : d));
  const setCorp = <K extends keyof CorporateFacet>(k: K) => (v: CorporateFacet[K]) =>
    setCorpDraft((d) => (d ? { ...d, [k]: v } : d));

  // Attach the missing facet to this CIF, then drop straight into editing it.
  const addFacet = (f: "Individual" | "Corporate") => {
    setOverrides((o) => ({
      ...o,
      profiles: [...profiles, f],
      ...(f === "Corporate" ? { corporate: { ...EMPTY_CORP } } : {}),
    }));
    setFacet(f);
    if (f === "Individual") setIndivDraft({ ...EMPTY_INDIV });
    else setCorpDraft({ ...EMPTY_CORP });
    setEditing(true);
  };

  const custTxns = TRANSACTIONS.filter((t) => t.customer === customer.name);
  const lifecycle = custTxns.length === 0 ? "Dormant" : custTxns.length >= 3 ? "Active" : "Low activity";

  // Payments tab — full statement, summary and channel mix.
  const payments = buildPayments(customer.name, customer.id);
  const payIn = payments.filter((t) => t.amount > 0).reduce((s, t) => s + usd(t.amount, t.ccy), 0);
  const payOut = payments.filter((t) => t.amount < 0).reduce((s, t) => s + usd(Math.abs(t.amount), t.ccy), 0);

  // Goal-based savings (Deposits capability) — synthesized demo goal for savers.
  const savingsBal = customer.accounts.filter((a) => a.type.startsWith("Savings")).reduce((s, a) => s + usd(a.balance, a.ccy), 0);
  const goalName = customer.segment === "Affluent" ? "Property downpayment" : customer.segment === "SME" ? "Business expansion fund" : "Emergency fund";
  const goalTarget = Math.max(2000, Math.round((savingsBal * 1.6) / 500) * 500);
  const goalPct = goalTarget ? Math.min(100, Math.round((savingsBal / goalTarget) * 100)) : 0;
  const paymentCount = TRANSACTIONS.filter((t) => t.customer === customer.name).length;

  // What this customer is currently using — the CRM "know" view.
  const servicesInUse = [
    { name: "Savings", icon: "savings", on: customer.accounts.some((a) => a.type.startsWith("Savings")), detail: `${customer.accounts.filter((a) => a.type.startsWith("Savings")).length} a/c` },
    { name: "Current", icon: "account_balance_wallet", on: customer.accounts.some((a) => a.type.startsWith("Current")), detail: `${customer.accounts.filter((a) => a.type.startsWith("Current")).length} a/c` },
    { name: "Fixed deposit", icon: "lock_clock", on: customer.accounts.some((a) => a.type.includes("Fixed Deposit")), detail: `${customer.accounts.filter((a) => a.type.includes("Fixed Deposit")).length} a/c` },
    { name: "Cards", icon: "credit_card", on: customer.cards.length > 0, detail: `${customer.cards.length}` },
    { name: "Loans", icon: "account_balance", on: customer.loans.length > 0, detail: `${customer.loans.length}` },
    { name: "Investments", icon: "trending_up", on: customer.investments.length > 0, detail: `${customer.investments.length}` },
    { name: "Insurance", icon: "shield", on: customer.insurance.length > 0, detail: `${customer.insurance.length}` },
    { name: "Digital banking", icon: "smartphone", on: customer.ebanking.includes("Mobile Banking"), detail: `${customer.ebanking.length} ch` },
    { name: "Payments", icon: "payments", on: paymentCount > 0, detail: `${paymentCount} txns` },
  ];
  const usedCount = servicesInUse.filter((s) => s.on).length;


  // KYC / CDD, consent & documents — synthesized for the demo (view-only).
  const kycReview = (() => { const d = new Date(customer.joined); d.setFullYear(d.getFullYear() + 3); return d.toISOString().slice(0, 10); })();
  const kycRows: [string, string][] = [
    ["KYC status", customer.kyc],
    ["CDD level", customer.risk === "High" ? "Enhanced (EDD)" : "Standard"],
    ["Sanctions / PEP", "Cleared"],
    ["Beneficial owner (UBO)", "Self (individual)"],
    ["Tax classification", customer.incomeUSD && customer.incomeUSD > 3000 ? "Taxable person" : "Non-taxable person"],
    ["Next KYC review", customer.kyc === "Review due" ? "Overdue — schedule now" : formatDate(kycReview)],
  ];
  const kycOverdue = customer.kyc === "Review due" || new Date(kycReview) < new Date();

  // Relationship value (view-only): deposits + investments (USD) and loan exposure.
  const aum = customer.accounts.reduce((s, a) => s + usd(a.balance, a.ccy), 0) + customer.investments.reduce((s, i) => s + i.value, 0);
  const loanOut = customer.loans.reduce((s, l) => s + usd(l.outstanding, l.ccy), 0);

  // Accounts vs Deposits split — CASA (Current & Savings) live under "Accounts",
  // term/fixed deposits under "Deposits" (each tab specializes its own view).
  const casaAccounts = customer.accounts.filter((a) => !a.type.includes("Fixed Deposit"));
  const termDeposits = customer.accounts.filter((a) => a.type.includes("Fixed Deposit"));

  // Tab summaries (view-only).
  const investTotal = customer.investments.reduce((s, i) => s + i.value, 0);
  const lastLogin = customer.devices[0]?.lastSeen ?? "—";
  const activeSessions = customer.devices.filter((d) => d.trusted).length;
  const tenureYears = Math.max(1, new Date().getFullYear() - new Date(customer.joined).getFullYear());
  const profileFields = [customer.name, customer.khmerName, customer.dob, customer.phone, customer.email, customer.address, customer.idNo, customer.occupation, customer.company, customer.incomeUSD];
  const completeness = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);
  // Related parties — resolve linked CIFs to real, clickable records (bidirectional).
  const relatedParties = (customer.relatedParties ?? [])
    .map((r) => {
      const c = CUSTOMERS.find((x) => x.id === r.cif);
      return c ? { cif: c.id, name: c.name, type: c.customerType, role: r.role } : null;
    })
    .filter((r): r is { cif: string; name: string; type: "Individual" | "Corporate"; role: string } => r !== null);
  const household = [
    // Only synthesize a "Business" text row when there is no real linked corporate CIF.
    ...(customer.company && !isCorp && relatedParties.length === 0 ? [{ rel: "Business", name: customer.company }] : []),
    ...(customer.marital === "Married" ? [{ rel: "Spouse", name: "Linked household account" }] : []),
  ];
  const consentRows: [string, string][] = [
    ["Marketing consent", customer.ebanking.includes("Mobile Banking") ? "Opted in" : "Not set"],
    ["Data-sharing (CBC)", "Authorized"],
    ["Communication channel", customer.ebanking.includes("SMS Alert") ? "SMS + App push" : "App push"],
    ["Preferred language", /Cambodia/.test(customer.nationality) ? "Khmer" : "English"],
  ];
  const documents = [
    { name: `${customer.idType}`, status: `Verified · exp ${customer.idExpiry}` },
    { name: "Proof of address", status: "On file" },
    { name: "Income document", status: customer.incomeUSD ? "On file" : "Pending" },
    { name: "eKYC selfie / liveness", status: "Captured" },
  ];

  return (
    <div className="page-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
        <Link href="/customers" className="hover:text-primary-600 font-medium">Customers</Link>
        <Icon name="chevron_right" className="text-base text-slate-300" />
        <span className="font-semibold text-slate-800">{customer.name}</span>
        <span className="text-slate-300">·</span>
        <span className="font-mono text-slate-500">{customer.id}</span>
      </div>

      {kycOverdue && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-2.5 mb-4">
          <Icon name="warning" className="text-amber-500 text-lg" />
          <span><b>KYC review due</b> — this customer's periodic KYC refresh is overdue{customer.kyc === "Review due" ? "" : ` (cycle ended ${formatDate(kycReview)})`}.</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr] gap-5 items-start">
        {/* ===== Left menu ===== */}
        <nav className="xl:sticky xl:top-20 bg-white border border-slate-200 rounded-xl shadow-sm p-2 flex xl:flex-col gap-1 overflow-x-auto">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${tab === t ? "bg-gold text-navy" : "text-slate-600 hover:bg-slate-100"}`}>
              <span className={`inline-flex w-5 flex-none justify-end tabular-nums ${tab === t ? "text-navy/60" : "text-slate-400"}`}>{i + 1}.</span>
              <span>{t}</span>
            </button>
          ))}
        </nav>

        {/* ===== Content area ===== */}
        <div className="space-y-5 min-w-0">
          {/* --- Overviews (customer snapshot) --- */}
          {tab === "Overviews" && (() => {
            const productCount = customer.accounts.length + customer.cards.length + customer.loans.length + customer.investments.length + customer.insurance.length;
            const kpis = [
              { icon: "account_balance_wallet", label: "Relationship value", value: formatMoney(Math.round(aum), "USD"), sub: "Deposits + investments" },
              { icon: "account_balance", label: "Loans outstanding", value: loanOut > 0 ? formatMoney(Math.round(loanOut), "USD") : "—", sub: `${customer.loans.length} active facilit${customer.loans.length === 1 ? "y" : "ies"}` },
              { icon: "inventory_2", label: "Products held", value: String(productCount), sub: "across all product lines" },
              { icon: "hub", label: "Services in use", value: `${usedCount}/${servicesInUse.length}`, sub: "capabilities active" },
            ];
            const nba = kycOverdue
              ? "KYC refresh is overdue — schedule the periodic review to keep this account compliant."
              : customer.investments.length === 0 && customer.segment === "Affluent"
              ? "Affluent client with no investment holdings — introduce a wealth or fixed-income product."
              : customer.insurance.length === 0
              ? "No protection policy on file — offer bancassurance (life / health) cover at the next contact."
              : customer.loans.length === 0 && aum > 5000
              ? "Strong balances with no active loan — a pre-approved credit line or overdraft may fit this profile."
              : "Relationship is well diversified — keep regular check-ins and monitor for upsell signals.";
            return (
            <div className="space-y-5">
              {/* Hero — customer identity */}
              <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-sm text-white"
                   style={{ background: "linear-gradient(135deg,#4E4841,#201D1A)" }}>
                <div className="absolute -right-10 -top-12 w-44 h-44 rounded-full bg-white/5" />
                <div className="absolute right-24 -bottom-16 w-44 h-44 rounded-full bg-white/5" />
                <div className="relative p-6 flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className="w-20 h-20 rounded-full bg-white/10 ring-2 ring-white/20 flex items-center justify-center text-3xl font-extrabold flex-none">
                    {isCorp ? <Icon name="corporate_fare" className="text-4xl" /> : getInitial(customer.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-extrabold leading-tight truncate">{customer.name}</h2>
                    {customer.khmerName && <div className="font-khmer text-white/70 text-sm">{customer.khmerName}</div>}
                    <div className="flex items-center gap-2 mt-1 text-xs text-white/60 flex-wrap">
                      <span className="font-mono">{customer.id}</span>
                      <span className="text-white/25">·</span>
                      <span className="inline-flex items-center gap-1"><Icon name="apartment" className="text-sm" />{customer.branch}</span>
                      <span className="text-white/25">·</span>
                      <span className="inline-flex items-center gap-1"><Icon name="call" className="text-sm" />{customer.phone}</span>
                      <span className="text-white/25">·</span>
                      <span className="inline-flex items-center gap-1"><Icon name="event" className="text-sm" />Since {formatDate(customer.joined)}</span>
                    </div>
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      <Badge label={customer.kyc} />
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.segment === "Affluent" ? "bg-purple-100 text-purple-800" : customer.segment === "SME" ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-700"}`}>{segmentLabel(customer.segment)}</span>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${lifecycle === "Active" ? "bg-green-100 text-green-700" : lifecycle === "Dormant" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{lifecycle}</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.risk === "High" ? "bg-red-100 text-red-700" : customer.risk === "Medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}><Icon name="shield" className="text-sm" />{customer.risk} risk</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((k) => (
                  <div key={k.label} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-none"><Icon name={k.icon} className="text-lg text-slate-500" /></span>
                      <span className="text-[11px] font-bold uppercase tracking-wide">{k.label}</span>
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">{k.value}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* Next best action (the one gold element) */}
              <AiPanel title="Next best action">{nba}</AiPanel>

              {/* Two-column detail grid */}
              <div className="grid gap-5 lg:grid-cols-2 items-start">
                <div className="space-y-5">
                  {/* Product holdings */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Icon name="inventory_2" className="text-slate-400 text-lg" />
                      <h3 className="font-bold text-slate-900 text-sm">Product holdings</h3>
                    </div>
                    {productCount === 0 ? (
                      <span className="text-xs text-slate-400">No products yet</span>
                    ) : (
                      <div className="space-y-4">
                        {([
                          { title: "Accounts", icon: "account_balance_wallet", items: casaAccounts.map((a) => acctLabel(a.type, a.ccy)) },
                          { title: "Fixed Deposits", icon: "lock_clock", items: termDeposits.map((a) => acctLabel(a.type, a.ccy)) },
                          { title: "Cards", icon: "credit_card", items: customer.cards.map((cd) => cd.type) },
                          { title: "Loans", icon: "account_balance", items: customer.loans.map((l) => l.product) },
                          { title: "Investments", icon: "trending_up", items: customer.investments.map((iv) => iv.type) },
                          { title: "Insurance", icon: "shield", items: customer.insurance.map((p) => p.policy) },
                        ] as const).filter((g) => g.items.length > 0).map((g) => (
                          <div key={g.title}>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">
                              <Icon name={g.icon} className="text-sm" />{g.title}
                              <span className="text-slate-300 font-semibold">{g.items.length}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {g.items.map((label, i) => (
                                <span key={i} className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">{label}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent activity */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Icon name="receipt_long" className="text-slate-400 text-lg" />
                      <h3 className="font-bold text-slate-900 text-sm">Recent activity</h3>
                    </div>
                    {custTxns.length === 0 ? (
                      <span className="text-xs text-slate-400">No recent transactions</span>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {custTxns.slice(0, 5).map((t) => (
                          <div key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-none ${t.amount < 0 ? "bg-slate-100" : "bg-green-50"}`}>
                                <Icon name={t.amount < 0 ? "arrow_upward" : "arrow_downward"} className={`text-base ${t.amount < 0 ? "text-slate-500" : "text-green-600"}`} />
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-800 truncate">{t.type}</div>
                                <div className="text-[11px] text-slate-400 truncate">{t.counterparty} · {t.time}</div>
                              </div>
                            </div>
                            <div className={`text-sm font-bold flex-none ${t.amount < 0 ? "text-slate-800" : "text-green-600"}`}>
                              {t.amount < 0 ? "−" : "+"}{formatMoney(Math.abs(t.amount), t.ccy)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Compliance & risk */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Icon name="verified_user" className="text-slate-400 text-lg" />
                        <h3 className="font-bold text-slate-900 text-sm">Compliance &amp; risk</h3>
                      </div>
                      {kycOverdue && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 rounded-full px-2 py-0.5"><Icon name="warning" className="text-sm" />Review due</span>}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center border-b border-dashed border-slate-100 pb-1.5">
                        <span className="text-slate-400 text-xs">KYC status</span>
                        <Badge label={customer.kyc} />
                      </div>
                      <div className="flex justify-between items-center border-b border-dashed border-slate-100 pb-1.5">
                        <span className="text-slate-400 text-xs">Risk rating</span>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.risk === "High" ? "bg-red-100 text-red-700" : customer.risk === "Medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{customer.risk}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-dashed border-slate-100 pb-1.5">
                        <span className="text-slate-400 text-xs">CDD level</span>
                        <span className="font-semibold text-slate-700 text-xs">{customer.risk === "High" ? "Enhanced (EDD)" : "Standard"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-xs">Next KYC review</span>
                        <span className={`font-semibold text-xs ${kycOverdue ? "text-red-600" : "text-slate-700"}`}>{customer.kyc === "Review due" ? "Overdue" : formatDate(kycReview)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Services & capabilities — visual grid */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Icon name="hub" className="text-slate-400 text-lg" />
                        <h3 className="font-bold text-slate-900 text-sm">Services &amp; capabilities</h3>
                      </div>
                      <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 rounded-full px-2 py-0.5">{usedCount}/{servicesInUse.length} active</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {servicesInUse.map((s) => (
                        <div key={s.name} className={`rounded-lg border p-2.5 text-center ${s.on ? "border-slate-200 bg-white" : "border-dashed border-slate-200 bg-slate-50/60"}`}>
                          <Icon name={s.icon} className={`text-xl ${s.on ? "text-primary-600" : "text-slate-300"}`} />
                          <div className={`text-[11px] font-semibold mt-1 leading-tight ${s.on ? "text-slate-700" : "text-slate-400"}`}>{s.name}</div>
                          <div className={`text-[10px] mt-0.5 ${s.on ? "text-slate-400" : "text-amber-600 font-semibold"}`}>{s.on ? s.detail : "Offer"}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent interactions */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Icon name="forum" className="text-slate-400 text-lg" />
                      <h3 className="font-bold text-slate-900 text-sm">Recent interactions</h3>
                    </div>
                    {customer.interactions.length === 0 ? (
                      <span className="text-xs text-slate-400">No recorded interactions</span>
                    ) : (
                      <div className="space-y-3">
                        {customer.interactions.slice(0, 3).map((it, i) => (
                          <div key={i} className="flex gap-3">
                            <Icon name="chat_bubble_outline" className="text-slate-300 text-lg mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 rounded px-1.5 py-0.5">{it.channel}</span>
                                <span className="text-[11px] text-slate-400">{formatDate(it.date)}</span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1 leading-snug">{it.note}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* --- Customer Information (view / edit, per facet) --- */}
          {tab === "Customer Information" && (
            <div className="space-y-5">
              {/* Facet sub-tabs (Individual | Corporate) + edit controls */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                  {(["Individual", "Corporate"] as const).map((f) => {
                    const present = profiles.includes(f);
                    const active = facet === f;
                    return present ? (
                      <button key={f} disabled={editing} onClick={() => setFacet(f)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${active ? "bg-gold text-navy" : "text-slate-500 hover:text-slate-800"}`}>
                        <Icon name={f === "Corporate" ? "corporate_fare" : "person"} className="text-base" />{f}
                      </button>
                    ) : (
                      <button key={f} disabled={editing} onClick={() => addFacet(f)}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <Icon name="add" className="text-base" />Add {f.toLowerCase()}
                      </button>
                    );
                  })}
                </div>
                {editing ? (
                  <div className="flex gap-2">
                    <button onClick={cancelEdit} className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">Cancel</button>
                    <button onClick={saveEdit} className="px-4 py-2 bg-gold text-navy text-sm font-semibold rounded-lg hover:brightness-95">Save changes</button>
                  </div>
                ) : (
                  <button onClick={startEdit} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gold text-navy text-sm font-semibold rounded-lg hover:brightness-95">
                    <Icon name="edit" className="text-base" /> Edit{dual ? ` ${facet.toLowerCase()}` : ""}
                  </button>
                )}
              </div>

              {dual && (
                <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                  <Icon name="info" className="text-primary-600 text-base" />
                  <span>This CIF holds both an individual and a corporate profile. You are viewing the <b className="text-slate-700">{facet}</b> facet — each facet keeps its own KYC and details.</span>
                </div>
              )}

              {/* ===== Individual facet ===== */}
              {facet === "Individual" && (
                <>
                  <Section title="Basic information">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {editing && indivDraft ? (
                        <>
                          <Field label="Full name (Latin)" value={indivDraft.name} onChange={setIndiv("name")} />
                          <Field label="Khmer name · ឈ្មោះខ្មែរ" value={indivDraft.khmerName} onChange={setIndiv("khmerName")} />
                          <Field label="Date of birth" type="date" value={indivDraft.dob} onChange={setIndiv("dob")} />
                          <Field label="Gender" options={["Male", "Female"]} value={indivDraft.gender} onChange={(v) => setIndiv("gender")(v as Customer["gender"])} />
                          <Field label="Marital status" options={["Single", "Married", "Divorced", "Widowed"]} value={indivDraft.marital} onChange={setIndiv("marital")} />
                          <Field label="Nationality" value={indivDraft.nationality} onChange={setIndiv("nationality")} />
                        </>
                      ) : (
                        <>
                          <Info label="Full name (Latin)" value={indivView.name} />
                          <Info label="Khmer name · ឈ្មោះខ្មែរ" value={indivView.khmerName} />
                          <Info label="Date of birth" value={indivView.dob} />
                          <Info label="Gender" value={indivView.gender} />
                          <Info label="Marital status" value={indivView.marital} />
                          <Info label="Nationality" value={indivView.nationality} />
                        </>
                      )}
                    </div>
                  </Section>

                  <Section title="Identification">
                    <div className="grid sm:grid-cols-3 gap-4">
                      {editing && indivDraft ? (
                        <>
                          <Field label="ID type" options={["National ID", "Passport"]} value={indivDraft.idType} onChange={setIndiv("idType")} />
                          <Field label="ID number" value={indivDraft.idNo} onChange={setIndiv("idNo")} />
                          <Field label="ID expiry date" type="date" value={indivDraft.idExpiry} onChange={setIndiv("idExpiry")} />
                        </>
                      ) : (
                        <>
                          <Info label="ID type" value={indivView.idType} />
                          <Info label="ID number" value={indivView.idNo} />
                          <Info label="ID expiry date" value={indivView.idExpiry} />
                        </>
                      )}
                    </div>
                  </Section>

                  <Section title="Contact & address">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {editing && indivDraft ? (
                        <>
                          <Field label="Mobile phone" value={indivDraft.phone} onChange={setIndiv("phone")} />
                          <Field label="E-mail" type="email" value={indivDraft.email} onChange={setIndiv("email")} />
                          <Field label="Personal address" span value={indivDraft.address} onChange={setIndiv("address")} />
                        </>
                      ) : (
                        <>
                          <Info label="Mobile phone" value={indivView.phone} />
                          <Info label="E-mail" value={indivView.email} />
                          <Info label="Personal address" value={indivView.address} span />
                        </>
                      )}
                    </div>
                  </Section>

                  <Section title="Occupation & income">
                    <div className="grid sm:grid-cols-3 gap-4">
                      {editing && indivDraft ? (
                        <>
                          <Field label="Occupation" value={indivDraft.occupation} onChange={setIndiv("occupation")} />
                          <Field label="Company name" value={indivDraft.company} onChange={setIndiv("company")} />
                          <Field label="Annual income (USD)" type="number" value={indivDraft.incomeUSD != null ? String(indivDraft.incomeUSD) : ""} onChange={(v) => setIndiv("incomeUSD")(v.trim() === "" ? null : Number(v))} />
                        </>
                      ) : (
                        <>
                          <Info label="Occupation" value={indivView.occupation} />
                          <Info label="Company name" value={indivView.company} />
                          <Info label="Annual income (USD)" value={indivView.incomeUSD != null ? `$${indivView.incomeUSD.toLocaleString()}` : "—"} />
                        </>
                      )}
                    </div>
                  </Section>
                </>
              )}

              {/* ===== Corporate facet ===== */}
              {facet === "Corporate" && (corpView || corpDraft) && (
                <>
                  <Section title="Company information">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {editing && corpDraft ? (
                        <>
                          <Field label="Company name (Latin)" value={corpDraft.name} onChange={setCorp("name")} />
                          <Field label="Khmer name · ឈ្មោះខ្មែរ" value={corpDraft.khmerName} onChange={setCorp("khmerName")} />
                          <Field label="Nature of business" value={corpDraft.businessNature} onChange={setCorp("businessNature")} />
                          <Field label="Country of incorporation" value={corpDraft.nationality} onChange={setCorp("nationality")} />
                          <Field label="Date of incorporation" type="date" value={corpDraft.incorporationDate} onChange={setCorp("incorporationDate")} />
                        </>
                      ) : corpView ? (
                        <>
                          <Info label="Company name (Latin)" value={corpView.name} />
                          <Info label="Khmer name · ឈ្មោះខ្មែរ" value={corpView.khmerName} />
                          <Info label="Nature of business" value={corpView.businessNature} />
                          <Info label="Country of incorporation" value={corpView.nationality} />
                          <Info label="Date of incorporation" value={corpView.incorporationDate} />
                        </>
                      ) : null}
                    </div>
                  </Section>

                  <Section title="Registration & identification">
                    <div className="grid sm:grid-cols-3 gap-4">
                      {editing && corpDraft ? (
                        <>
                          <Field label="Registration document" value={corpDraft.idType} onChange={setCorp("idType")} />
                          <Field label="Registration number" value={corpDraft.registrationNo} onChange={setCorp("registrationNo")} />
                          <Field label="Registration expiry" type="date" value={corpDraft.idExpiry} onChange={setCorp("idExpiry")} />
                        </>
                      ) : corpView ? (
                        <>
                          <Info label="Registration document" value={corpView.idType} />
                          <Info label="Registration number" value={corpView.registrationNo} />
                          <Info label="Registration expiry" value={corpView.idExpiry} />
                        </>
                      ) : null}
                    </div>
                  </Section>

                  <Section title="Contact & address">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {editing && corpDraft ? (
                        <>
                          <Field label="Office phone" value={corpDraft.phone} onChange={setCorp("phone")} />
                          <Field label="E-mail" type="email" value={corpDraft.email} onChange={setCorp("email")} />
                          <Field label="Registered address" span value={corpDraft.address} onChange={setCorp("address")} />
                          <Field label="Authorized contact person" span value={corpDraft.contactPerson} onChange={setCorp("contactPerson")} />
                        </>
                      ) : corpView ? (
                        <>
                          <Info label="Office phone" value={corpView.phone} />
                          <Info label="E-mail" value={corpView.email} />
                          <Info label="Registered address" value={corpView.address} span />
                          <Info label="Authorized contact person" value={corpView.contactPerson} span />
                        </>
                      ) : null}
                    </div>
                  </Section>

                  <Section title="Business & revenue">
                    <div className="grid sm:grid-cols-3 gap-4">
                      {editing && corpDraft ? (
                        <>
                          <Field label="Nature of business" value={corpDraft.businessNature} onChange={setCorp("businessNature")} />
                          <Field label="Annual revenue (USD)" type="number" value={corpDraft.incomeUSD != null ? String(corpDraft.incomeUSD) : ""} onChange={(v) => setCorp("incomeUSD")(v.trim() === "" ? null : Number(v))} />
                        </>
                      ) : corpView ? (
                        <>
                          <Info label="Nature of business" value={corpView.businessNature} />
                          <Info label="Annual revenue (USD)" value={corpView.incomeUSD != null ? `$${corpView.incomeUSD.toLocaleString()}` : "—"} />
                        </>
                      ) : null}
                    </div>
                  </Section>
                </>
              )}

              <Section title="Household & relationships">
                <div className="grid sm:grid-cols-3 gap-4 mb-4">
                  <Info label="Assigned RM" value={CURRENT_USER.name} />
                  <Info label="Relationship tenure" value={`${tenureYears} year${tenureYears > 1 ? "s" : ""}`} />
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1">Profile completeness</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gold rounded-full" style={{ width: `${completeness}%` }} /></div>
                      <span className="text-sm font-semibold text-slate-800">{completeness}%</span>
                    </div>
                  </div>
                </div>
                {relatedParties.length === 0 && household.length === 0 ? <p className="text-sm text-slate-400">No linked relationships</p> : (
                  <div className="divide-y divide-slate-100">
                    {relatedParties.map((r) => (
                      <Link key={r.cif} href={`/customers/${r.cif}`}
                        className="py-2.5 flex items-center gap-3 group -mx-2 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <Icon name={r.type === "Corporate" ? "corporate_fare" : "person"} className="text-primary-600 bg-primary-50 rounded-lg p-1.5 text-xl" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-800 truncate group-hover:text-primary-700">{r.name}</div>
                          <div className="text-xs text-slate-400">{r.type} · {r.cif}</div>
                        </div>
                        <span className="text-xs text-slate-400 flex-none">{r.role}</span>
                        <Icon name="chevron_right" className="text-slate-300 flex-none" />
                      </Link>
                    ))}
                    {household.map((h) => (
                      <div key={h.rel} className="py-2.5 flex items-center gap-3">
                        <Icon name={h.rel === "Business" ? "storefront" : "family_restroom"} className="text-primary-600 bg-primary-50 rounded-lg p-1.5 text-xl" />
                        <div className="flex-1 text-sm font-medium text-slate-800">{h.name}</div>
                        <span className="text-xs text-slate-400">{h.rel}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="KYC & CDD">
                <div className="grid sm:grid-cols-3 gap-4">
                  {kycRows.map(([k, v]) => <Info key={k} label={k} value={v} />)}
                </div>
              </Section>

              <Section title="Consent & preferences">
                <div className="grid sm:grid-cols-2 gap-4">
                  {consentRows.map(([k, v]) => <Info key={k} label={k} value={v} />)}
                </div>
              </Section>

              <Section title="Documents vault">
                <div className="divide-y divide-slate-100">
                  {documents.map((d) => (
                    <div key={d.name} className="py-2.5 flex items-center gap-3">
                      <Icon name="description" className="text-primary-600 bg-primary-50 rounded-lg p-1.5 text-xl" />
                      <div className="flex-1 text-sm font-medium text-slate-800">{d.name}</div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.status.startsWith("Pending") ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{d.status}</span>
                    </div>
                  ))}
                </div>
              </Section>

            </div>
          )}

          {/* --- Payments / transaction statement (read-only) --- */}
          {tab === "Payments" && (() => {
            const payFiltering = !!(payQ || payStatus !== "All" || payFrom || payTo || actCh !== "All");
            const rows = payments.filter((t) => {
              const chOk = actCh === "All" || t.channel === actCh;
              const stOk = payStatus === "All" || t.status === payStatus;
              const q = payQ.trim().toLowerCase();
              const qOk = !q || (t.counterparty + " " + t.type + " " + t.id).toLowerCase().includes(q);
              const fOk = !payFrom || t.date >= payFrom;
              const tOk = !payTo || t.date <= payTo;
              return chOk && stOk && qOk && fOk && tOk;
            });
            const totalPages = Math.max(1, Math.ceil(rows.length / payPerPage));
            const pageC = Math.min(payPage, totalPages);
            const start = (pageC - 1) * payPerPage;
            const pageRows = rows.slice(start, start + payPerPage);
            const net = payIn - payOut;
            return (
            <div className="space-y-5">
              {/* Summary tiles */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Money in</div>
                  <div className="text-xl font-extrabold text-green-600 mt-1">{formatMoney(Math.round(payIn), "USD")}</div>
                  <div className="text-xs text-slate-400 mt-1">Credits (USD)</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Money out</div>
                  <div className="text-xl font-extrabold text-slate-900 mt-1">{formatMoney(Math.round(payOut), "USD")}</div>
                  <div className="text-xs text-slate-400 mt-1">Debits (USD)</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Net flow</div>
                  <div className={`text-xl font-extrabold mt-1 ${net >= 0 ? "text-green-600" : "text-red-600"}`}>{net >= 0 ? "+" : "−"}{formatMoney(Math.abs(Math.round(net)), "USD")}</div>
                  <div className="text-xs text-slate-400 mt-1">In − out (USD)</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Transactions</div>
                  <div className="text-xl font-extrabold text-slate-900 mt-1">{payments.length}</div>
                  <div className="text-xs text-slate-400 mt-1">Last 30 days</div>
                </div>
              </div>

              {/* Transactions table */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">Transactions</h3>
                  <span className="text-xs text-slate-400">Last 30 days</span>
                </div>

                {/* Filters: search + channel + status + date range */}
                <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
                  <div className="relative w-44">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                    <input value={payQ} onChange={(e) => { setPayQ(e.target.value); setPayPage(1); }} placeholder="Search…"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                  </div>
                  <select value={actCh} onChange={(e) => { setActCh(e.target.value); setPayPage(1); }}
                    className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                    {TXN_CHANNELS.map((c) => <option key={c} value={c}>{c === "All" ? "All channels" : c}</option>)}
                  </select>
                  <select value={payStatus} onChange={(e) => { setPayStatus(e.target.value); setPayPage(1); }}
                    className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                    {["All", "Success", "Reversed"].map((s) => <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>)}
                  </select>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-xs font-medium text-slate-500">From</span>
                    <input type="date" value={payFrom} onChange={(e) => { setPayFrom(e.target.value); setPayPage(1); }}
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                    <span className="text-xs font-medium text-slate-500">To</span>
                    <input type="date" value={payTo} onChange={(e) => { setPayTo(e.target.value); setPayPage(1); }}
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                  </div>
                  {payFiltering && (
                    <button onClick={() => { setPayQ(""); setActCh("All"); setPayStatus("All"); setPayFrom(""); setPayTo(""); setPayPage(1); }}
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">
                      <Icon name="close" className="text-base" />Clear
                    </button>
                  )}
                </div>

                {rows.length === 0 ? (
                  <EmptyState icon="receipt_long" message="No transactions match your filters" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Description</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Channel</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Reference</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                          <th className="text-right px-4 py-3 font-semibold text-slate-600">Amount</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {pageRows.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Icon name={t.channel === "KHQR" ? "qr_code_2" : t.channel === "Bakong" ? "currency_exchange" : t.channel === "Bill" ? "receipt" : "swap_horiz"}
                                  className="text-primary-600 bg-primary-50 rounded-lg p-1.5 text-lg flex-none" />
                                <div className="min-w-0">
                                  <div className="font-medium text-slate-800 truncate">{t.type}</div>
                                  <div className="text-xs text-slate-400 truncate">{t.counterparty}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{t.channel}</td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-xs hidden lg:table-cell">{t.id}</td>
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(t.date)} · {t.time}</td>
                            <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${t.amount > 0 ? "text-green-600" : "text-slate-800"}`}>{t.amount > 0 ? "+" : "−"}{formatMoney(Math.abs(t.amount), t.ccy)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${t.status === "Reversed" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>{t.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
                      <div className="text-slate-500">Showing {start + 1}–{Math.min(start + payPerPage, rows.length)} of {rows.length} transactions</div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-slate-500">
                          <span className="whitespace-nowrap">Rows per page</span>
                          <select value={payPerPage} onChange={(e) => { setPayPerPage(Number(e.target.value)); setPayPage(1); }}
                            className="border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600">
                            {[8, 15, 30].map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                        <div className="flex items-center gap-2">
                          <button disabled={pageC <= 1} onClick={() => setPayPage(pageC - 1)} className={`px-2.5 py-1 rounded-md ${pageC <= 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Previous</button>
                          <span className="text-slate-500">Page {pageC} of {totalPages}</span>
                          <button disabled={pageC >= totalPages} onClick={() => setPayPage(pageC + 1)} className={`px-2.5 py-1 rounded-md ${pageC >= totalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Next</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            );
          })()}

          {/* --- Accounts (CASA — Current & Savings) --- */}
          {tab === "Accounts" && (() => {
            // On-brand palette (gold + charcoal primary + slate only) for the selector dots and donut.
            const PAL = [
              { dot: "bg-gold", stroke: "stroke-gold" },
              { dot: "bg-primary-600", stroke: "stroke-primary-600" },
              { dot: "bg-slate-400", stroke: "stroke-slate-400" },
              { dot: "bg-primary-400", stroke: "stroke-primary-400" },
              { dot: "bg-slate-600", stroke: "stroke-slate-600" },
              { dot: "bg-primary-800", stroke: "stroke-primary-800" },
              { dot: "bg-slate-300", stroke: "stroke-slate-300" },
            ];
            const activeAcc = (selectedAccountHistory ? casaAccounts.find((x) => x.no === selectedAccountHistory) : casaAccounts[0]) ?? casaAccounts[0];
            const totalUsdEq = casaAccounts.reduce((sum, a) => sum + usd(a.balance, a.ccy), 0);
            const radius = 15.91549431;
            return (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Current &amp; savings</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Manage everyday banking and savings accounts.</p>
                </div>

                {casaAccounts.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    <EmptyState icon="account_balance_wallet" message="No current or savings accounts" />
                  </div>
                ) : (
                  <>
                    {/* Account selector + portfolio donut */}
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {casaAccounts.map((a, i) => {
                        const isActive = activeAcc?.no === a.no;
                        return (
                          <button key={a.no} onClick={() => setSelectedAccountHistory(a.no)}
                            className={`flex-none w-60 text-left p-4 rounded-xl border transition-all ${isActive ? "border-gold bg-goldbg shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-2 pr-2 min-w-0">
                                <span className={`w-2.5 h-2.5 rounded-full flex-none ${PAL[i % PAL.length].dot}`} />
                                <span className="text-xs font-bold tracking-wide text-slate-800 truncate">{a.type}</span>
                              </div>
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{a.ccy}</span>
                            </div>
                            <div className="text-xl font-extrabold text-slate-900 tracking-tight">{formatMoney(a.balance, a.ccy)}</div>
                            <div className="text-[11px] font-mono text-slate-500 mt-1">{a.no}</div>
                          </button>
                        );
                      })}

                      {/* Portfolio donut */}
                      <div className="flex-none w-60 p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 h-4 flex items-center justify-center w-full px-2 truncate">
                          {hoveredSlice !== null && casaAccounts[hoveredSlice] ? (
                            <span className="flex items-center gap-1.5 text-slate-700">
                              <span className={`w-2 h-2 rounded-full ${PAL[hoveredSlice % PAL.length].dot}`} />
                              <span className="truncate">{casaAccounts[hoveredSlice].type}</span>
                            </span>
                          ) : "Total portfolio"}
                        </div>
                        <div className="relative w-16 h-16 mb-3">
                          <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
                            <circle cx="21" cy="21" r={radius} fill="transparent" className="stroke-slate-200" strokeWidth="8" />
                            {(() => {
                              let currentAngle = 0;
                              return casaAccounts.map((a, i) => {
                                const pct = totalUsdEq > 0 ? (usd(a.balance, a.ccy) / totalUsdEq) * 100 : 0;
                                const dashArray = `${pct} ${100 - pct}`;
                                const offset = -currentAngle;
                                currentAngle += pct;
                                return (
                                  <circle key={a.no} cx="21" cy="21" r={radius} fill="transparent"
                                    onMouseEnter={() => setHoveredSlice(i)} onMouseLeave={() => setHoveredSlice(null)}
                                    className={`${PAL[i % PAL.length].stroke} transition-all duration-300 outline-none cursor-pointer ${hoveredSlice === i ? "opacity-100" : hoveredSlice !== null ? "opacity-40" : ""}`}
                                    strokeWidth={hoveredSlice === i ? 10 : 8} strokeDasharray={dashArray} strokeDashoffset={offset} />
                                );
                              });
                            })()}
                          </svg>
                        </div>
                        <div className="text-base font-extrabold text-slate-900 tracking-tight h-6 flex items-center">
                          {hoveredSlice !== null && casaAccounts[hoveredSlice]
                            ? formatMoney(casaAccounts[hoveredSlice].balance, casaAccounts[hoveredSlice].ccy)
                            : formatMoney(Math.round(totalUsdEq), "USD")}
                        </div>
                      </div>
                    </div>

                    {/* Active account detail */}
                    {activeAcc && (() => {
                      const aTypeLower = activeAcc.type.toLowerCase();
                      const isVIP = aTypeLower.includes("vip") || aTypeLower.includes("wealth") || aTypeLower.includes("premium") || aTypeLower.includes("priority");
                      const isBusiness = aTypeLower.includes("business") || aTypeLower.includes("corporate") || aTypeLower.includes("sme");
                      const isForeigner = aTypeLower.includes("expat") || aTypeLower.includes("foreign");
                      const isJoint = activeAcc.ownership === "Joint";
                      const isJunior = activeAcc.ownership === "Junior";
                      const activeAccTxns = custTxns.filter((t) => t.ccy === activeAcc.ccy);
                      const chipBase = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap";
                      const btnPrimary = "flex-1 md:flex-none px-4 py-2 text-sm font-semibold text-navy bg-gold hover:brightness-95 rounded-lg transition-colors";
                      const btnSecondary = "flex-1 md:flex-none px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors";
                      return (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 md:p-8">
                          <div className="flex flex-col md:flex-row justify-between items-start mb-8 pb-8 border-b border-slate-100">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="text-[10px] font-bold tracking-wide text-primary-700 uppercase bg-primary-50 px-2 py-1 rounded">{activeAcc.type}</span>
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">ACC: {activeAcc.no}</span>
                                {isForeigner && <span className={`${chipBase} bg-primary-50 text-primary-700 border border-primary-200`}>Expat</span>}
                                {isJoint && <span className={`${chipBase} bg-slate-100 text-slate-600 border border-slate-200`}>Joint account</span>}
                                {isJunior && <span className={`${chipBase} bg-slate-100 text-slate-600 border border-slate-200`}>Junior account</span>}
                                <Badge label={activeAcc.status} />
                              </div>
                              <div className="mt-4">
                                <div className="text-4xl font-extrabold tracking-tight text-slate-900">{formatMoney(activeAcc.balance, activeAcc.ccy)}</div>
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1 mb-3">Available balance</div>
                                {activeAcc.linkedTo && activeAcc.linkedTo.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-4">
                                    {activeAcc.linkedTo.map((link) => (
                                      <span key={link} className="flex items-center gap-1.5 text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200 px-2 py-1 rounded-md uppercase tracking-wider">
                                        <Icon name="link" className="text-[12px] text-slate-400" />Linked: {link}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-6 md:mt-0 flex gap-2 w-full md:w-auto">
                              {isVIP ? (
                                <>
                                  <button className={btnPrimary}>Wealth Hub</button>
                                  <button className={btnSecondary}>Concierge</button>
                                  <button className={btnSecondary}>Transfer</button>
                                </>
                              ) : isBusiness ? (
                                <>
                                  <button className={btnSecondary}>Payroll</button>
                                  <button className={btnSecondary}>Invoicing</button>
                                  <button className={btnPrimary}>Bulk txn</button>
                                </>
                              ) : isForeigner ? (
                                <>
                                  <button className={btnSecondary}>FX rates</button>
                                  <button className={btnSecondary}>Remittance</button>
                                  <button className={btnPrimary}>Transfer</button>
                                </>
                              ) : (
                                <>
                                  <button className={btnSecondary}>View statement</button>
                                  <button className={btnPrimary}>Transfer</button>
                                </>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent transactions</h4>
                              {activeAccTxns.length > 0 && (
                                <select value={txnsLimit} onChange={(e) => setTxnsLimit(Number(e.target.value))}
                                  className="text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 cursor-pointer">
                                  <option value={10}>Show 10</option>
                                  <option value={50}>Show 50</option>
                                  <option value={100}>Show 100</option>
                                </select>
                              )}
                            </div>
                            {activeAccTxns.length === 0 ? (
                              <div className="text-sm text-slate-500 py-4">No recent transactions for this account.</div>
                            ) : (
                              <div className="space-y-4">
                                {activeAccTxns.slice(0, txnsLimit).map((txn) => (
                                  <div key={txn.id} className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-4">
                                      <div className={`p-3 rounded-xl ${txn.amount > 0 ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-600"}`}>
                                        <Icon name={txn.amount > 0 ? "arrow_downward" : "arrow_upward"} className="text-[20px]" />
                                      </div>
                                      <div>
                                        <div className="text-sm font-bold text-slate-900">{txn.counterparty}</div>
                                        <div className="text-xs font-medium text-slate-500 mt-0.5">{txn.time} · {txn.channel} · Ref: {txn.id}</div>
                                      </div>
                                    </div>
                                    <div className={`text-base font-bold ${txn.amount > 0 ? "text-green-600" : "text-slate-900"}`}>
                                      {txn.amount > 0 ? "+" : ""}{formatMoney(txn.amount, txn.ccy)}
                                    </div>
                                  </div>
                                ))}
                                <button onClick={() => setTab("Payments")}
                                  className="w-full mt-2 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors">
                                  View full history →
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

                {savingsBal > 0 && (
                  <Section title="Savings goals">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{goalName}</div>
                        <div className="text-xs text-slate-400">Round-up savings · On · auto-save monthly</div>
                      </div>
                      <div className="text-sm font-bold text-slate-900 text-right">{formatMoney(Math.round(savingsBal), "USD")} <span className="text-slate-400 font-normal">/ {formatMoney(goalTarget, "USD")}</span></div>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${goalPct}%` }} />
                    </div>
                    <div className="text-xs text-slate-400 mt-1.5">{goalPct}% funded</div>
                  </Section>
                )}
              </div>
            );
          })()}

          {/* --- Fixed Deposits (master / detail) --- */}
          {tab === "Fixed Deposits" && (
            <div className="space-y-5">
              <Section title="Fixed Deposits">
                {(() => {
                  // Map the customer's real fixed-deposit accounts to a consistent shape.
                  const mappedActual = termDeposits.map((a) => {
                    const [name, ratePart] = a.type.split("·");
                    const rate = ratePart ? ratePart.trim() : "5.25%";
                    const termMatch = name.match(/(\d+)\s*M/i);
                    const termNum = termMatch ? parseInt(termMatch[1]) : 12;
                    const projected = a.balance * (parseFloat(rate) / 100) * (termNum / 12);
                    return { no: a.no, type: name.trim(), ccy: a.ccy, balance: a.balance, status: a.status, rate: rate.includes("%") ? rate : `${rate}%`, term: `${termNum} months`, projected };
                  });
                  // Demo products so the master/detail view is populated.
                  const dummyFDs = [
                    { no: "001-999-001", type: "Regular Fixed Deposit", ccy: "USD" as const, balance: 10000, status: "Matures 2027-01-15", rate: "4.50%", term: "6 months", projected: 225 },
                    { no: "001-999-002", type: "Flexible Fixed Deposit", ccy: "USD" as const, balance: 5000, status: "Matures 2026-10-15", rate: "3.75%", term: "3 months", projected: 46.88 },
                    { no: "001-999-005", type: "Premium / VIP Fixed Deposit", ccy: "USD" as const, balance: 150000, status: "Matures 2028-07-15", rate: "6.25%", term: "24 months", projected: 18750 },
                  ];
                  const allFDs = [...mappedActual, ...dummyFDs];
                  if (allFDs.length === 0) return <EmptyState icon="savings" message="No fixed deposits" />;
                  const activeFD = allFDs.find((f) => f.no === selectedFdNo) || allFDs[0];

                  return (
                    <div>
                      {/* Top row: selectable thumbnails */}
                      <div className="flex gap-4 overflow-x-auto pb-4 mb-2">
                        {allFDs.map((fd) => {
                          const isActive = activeFD.no === fd.no;
                          return (
                            <div key={fd.no} onClick={() => setSelectedFdNo(fd.no)}
                              className={`flex-none w-64 p-4 rounded-xl border cursor-pointer transition-all ${isActive ? "border-gold bg-goldbg shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
                              <div className="flex justify-between items-start mb-4">
                                <div className="text-xs font-bold tracking-wide text-slate-800 truncate pr-2">{fd.type}</div>
                                <div className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{fd.ccy}</div>
                              </div>
                              <div className="text-xl font-extrabold text-slate-900 tracking-tight">{formatMoney(fd.balance, fd.ccy)}</div>
                              <div className="text-[11px] font-mono text-slate-500 mt-1">{fd.no}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom: unified detail view */}
                      <div className="border border-slate-200 bg-white rounded-xl shadow-sm p-6 md:p-8 mt-4">
                        <div className="flex flex-col md:flex-row justify-between items-start mb-8 pb-8 border-b border-slate-100">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-[10px] font-bold tracking-wide text-primary-700 uppercase bg-primary-50 px-2 py-1 rounded">{activeFD.type}</div>
                              <div className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">ACC: {activeFD.no}</div>
                            </div>
                            <div className="mt-4">
                              <div className="text-4xl font-extrabold tracking-tight text-slate-900">{formatMoney(activeFD.balance, activeFD.ccy)}</div>
                              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Principal placed</div>
                            </div>
                          </div>
                          <div className="mt-6 md:mt-0 md:text-right">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Maturity date</div>
                            <div className="text-lg font-bold text-slate-900">{activeFD.status.replace("Matures ", "")}</div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                          <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Interest rate</div>
                                <div className="text-sm font-semibold text-slate-900">{activeFD.rate} p.a.</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Term</div>
                                <div className="text-sm font-semibold text-slate-900">{activeFD.term}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Projected int.</div>
                                <div className="text-sm font-bold text-green-600">{formatMoney(activeFD.projected, activeFD.ccy)}</div>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Account instructions</h4>
                              <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center"><span className="text-slate-600">Interest payment</span><span className="font-semibold text-slate-800">{activeFD.type.includes("Monthly") ? "Monthly" : "At maturity"}</span></div>
                                <div className="flex justify-between items-center"><span className="text-slate-600">Maturity action</span><span className="font-semibold text-slate-800 text-right">{activeFD.type.includes("Auto") ? "Auto-renew" : "Transfer to Current"}</span></div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Recent interest income</h4>
                            <div className="space-y-3 text-sm">
                              {[
                                { date: "Jul 1, 2026", amount: activeFD.balance * (parseFloat(activeFD.rate) / 100) / 12 },
                                { date: "Jun 1, 2026", amount: activeFD.balance * (parseFloat(activeFD.rate) / 100) / 12 },
                              ].map((txn, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                  <span className="text-slate-600">{txn.date}</span>
                                  <span className="font-bold text-green-600">+{formatMoney(txn.amount, activeFD.ccy)}</span>
                                </div>
                              ))}
                              <button className="w-full mt-2 py-2 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors border border-transparent hover:border-primary-100 flex items-center justify-center gap-1">
                                View all history <Icon name="arrow_forward" className="text-[14px]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Section>
            </div>
          )}

          {/* --- Cards (read-only) — master/detail --- */}
          {tab === "Cards" && (
            customer.cards.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl">
                <EmptyState icon="credit_card" message="No cards issued" />
              </div>
            ) : (() => {
              const card = customer.cards[Math.min(cardIdx, customer.cards.length - 1)];
              const isCredit = /credit|world|platinum/i.test(card.type);
              const allTxns = card.status === "Blocked" ? [] : cardTxns(card.no);
              const filtering = !!(txnQ || txnFrom || txnTo);
              const txns = allTxns.filter((t) => {
                const mq = !txnQ || t.merchant.toLowerCase().includes(txnQ.toLowerCase());
                const df = !txnFrom || t.date >= txnFrom;   // ISO dates → string compare
                const dt = !txnTo || t.date <= txnTo;
                return mq && df && dt;
              });
              const txnTotalPages = Math.max(1, Math.ceil(txns.length / txnPerPage));
              const txnPageC = Math.min(txnPage, txnTotalPages);
              const txnStart = (txnPageC - 1) * txnPerPage;
              const txnRows = txns.slice(txnStart, txnStart + txnPerPage);
              return (
                <div className="space-y-5">
                  {/* Card picker — only when the customer holds more than one card */}
                  {customer.cards.length > 1 && (
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {customer.cards.map((c, i) => {
                        const active = i === Math.min(cardIdx, customer.cards.length - 1);
                        return (
                          <button key={c.no} onClick={() => { setCardIdx(i); resetTxnView(); }}
                            className={`flex-none w-56 text-left rounded-xl p-3 border transition-all ${active ? "border-gold bg-goldbg shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-700 truncate">{c.type}</span>
                              <Icon name="credit_card" className={active ? "text-amber-600" : "text-slate-300"} />
                            </div>
                            <div className="text-sm font-bold tracking-widest text-slate-800 mt-2">{c.no}</div>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[11px] text-slate-400">{cardNetwork(c.type)}</span>
                              <Badge label={c.status} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Card info — two columns so it fills the width and stays compact */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <div className="rounded-xl p-5 text-white"
                          style={{ background: card.status === "Blocked" ? "linear-gradient(135deg,#64748B,#334155)" : "linear-gradient(135deg,#3C3833,#201D1A)" }}>
                          <div className="flex justify-between items-start">
                            <span className="text-xs tracking-widest opacity-80 uppercase">{card.type}</span>
                            <Icon name="contactless" />
                          </div>
                          <div className="text-xl font-bold tracking-widest mt-6">{card.no}</div>
                          <div className="flex justify-between items-end text-xs mt-3 opacity-80">
                            <span>{customer.name.toUpperCase()}</span>
                            <span className="text-sm font-bold tracking-wide">{cardNetwork(card.type)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <Badge label={card.status} />
                          <span className="text-xs text-slate-400">Expires {cardExpiry(card.no)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="bg-slate-50 rounded-lg p-2.5">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wide">Spend · 30d</div>
                            <div className="text-sm font-bold text-slate-800">${cardSpend(card.no).toLocaleString()}</div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2.5">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wide">{isCredit ? "Utilization" : "Daily limit"}</div>
                            <div className="text-sm font-bold text-slate-800">{isCredit ? `${Math.min(99, Math.round((cardSpend(card.no) / (parseInt(card.limits.replace(/[^0-9]/g, "")) || 5000)) * 100))}%` : card.limits}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div>
                          <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Card controls</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Online payments</span><OnOff on={card.controls.online} /></div>
                            <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Contactless / NFC</span><OnOff on={card.controls.contactless} /></div>
                            <div className="flex items-center justify-between text-sm"><span className="text-slate-600">International (geo)</span><OnOff on={card.controls.intl} /></div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Card rewards</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-slate-600">Cashback engine</span><span className="font-semibold text-slate-800">{isCredit ? "1.5% on POS & QR" : "0.5% on QR"}</span></div>
                            <div className="flex justify-between"><span className="text-slate-600">Points balance</span><span className="font-semibold text-slate-800">{isCredit ? "12,480 pts" : "3,120 pts"}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card transactions — full-width table with pagination */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-sm">Card transactions</h3>
                      <span className="text-xs text-slate-400">Last 30 days</span>
                    </div>
                    {card.status === "Blocked" ? (
                      <EmptyState icon="credit_card_off" message="Card blocked — no recent authorizations" />
                    ) : (
                      <>
                      {/* Search (left) + date-range filter */}
                      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
                        <div className="relative w-44">
                          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                          <input value={txnQ} onChange={(e) => { setTxnQ(e.target.value); setTxnPage(1); }} placeholder="Search…"
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-xs font-medium text-slate-500">From</span>
                          <input type="date" value={txnFrom} onChange={(e) => { setTxnFrom(e.target.value); setTxnPage(1); }}
                            className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                          <span className="text-xs font-medium text-slate-500">To</span>
                          <input type="date" value={txnTo} onChange={(e) => { setTxnTo(e.target.value); setTxnPage(1); }}
                            className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                          {filtering && (
                            <button onClick={() => { setTxnQ(""); setTxnFrom(""); setTxnTo(""); setTxnPage(1); }}
                              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">
                              <Icon name="close" className="text-base" />Clear
                            </button>
                          )}
                        </div>
                      </div>
                      {txns.length === 0 ? (
                        <EmptyState icon="search_off" message="No transactions match your filters" />
                      ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="text-left px-4 py-3 font-semibold text-slate-600">Merchant</th>
                              <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                              <th className="text-right px-4 py-3 font-semibold text-slate-600">Amount</th>
                              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {txnRows.map((t) => (
                              <tr key={t.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <Icon name={t.icon} className="text-primary-600 bg-primary-50 rounded-lg p-1.5 text-lg flex-none" />
                                    <span className="font-medium text-slate-800">{t.merchant}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-slate-500">{formatDate(t.date)}</td>
                                <td className="px-4 py-3 text-right font-semibold text-slate-800">${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${t.status === "Pending" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{t.status}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
                          <div className="text-slate-500">Showing {txnStart + 1}–{Math.min(txnStart + txnPerPage, txns.length)} of {txns.length} transactions</div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-slate-500">
                              <span className="whitespace-nowrap">Rows per page</span>
                              <select value={txnPerPage} onChange={(e) => { setTxnPerPage(Number(e.target.value)); setTxnPage(1); }}
                                className="border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600">
                                {[5, 10, 20].map((n) => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </label>
                            <div className="flex items-center gap-2">
                              <button disabled={txnPageC <= 1} onClick={() => setTxnPage(txnPageC - 1)} className={`px-2.5 py-1 rounded-md ${txnPageC <= 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Previous</button>
                              <span className="text-slate-500">Page {txnPageC} of {txnTotalPages}</span>
                              <button disabled={txnPageC >= txnTotalPages} onClick={() => setTxnPage(txnPageC + 1)} className={`px-2.5 py-1 rounded-md ${txnPageC >= txnTotalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Next</button>
                            </div>
                          </div>
                        </div>
                      </div>
                      )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()
          )}

          {/* --- Loans (read-only) --- */}
          {tab === "Loans" && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900">{customer.name}</h2>
                {customer.loans.length > 0 ? (
                  <span className="whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">Active Loan</span>
                ) : (
                  <span className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">No Active Loan</span>
                )}
              </div>

              {customer.loans.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                  <EmptyState icon="account_balance" message="This customer does not have any loans." />
                </div>
              ) : (
                customer.loans.map((l) => (
                  <div key={l.id} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{l.product}</h3>
                      <Badge label={l.status} />
                    </div>
                    {l.status.includes("DPD") && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
                        <Icon name="warning" className="text-red-500 text-base" /> In arrears — {l.status}. Collections workflow applies.
                      </div>
                    )}
                    <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
                      <LoanDetailCard
                        title="Loan Overview"
                        rows={[
                          { label: "Loan ID", value: l.id },
                          { label: "Loan Product", value: l.product },
                          { label: "Loan Amount", value: formatMoney(l.amount, l.ccy) },
                          { label: "Interest Rate", value: `${l.rate} p.a.` },
                          { label: "Start Date", value: formatDate(l.startDate) },
                          { label: "Loan Term", value: `${l.termMonths} months` },
                          { label: "Remaining Balance", value: formatMoney(l.outstanding, l.ccy), highlight: true },
                        ]}
                      />
                      <LoanDetailCard
                        title="Upcoming Repayment"
                        rows={[
                          { label: "Next Payment", value: formatDate(l.nextDue) },
                          { label: "Repayment Amount", value: formatMoney(l.installment, l.ccy) },
                          { label: "Months Left", value: `${l.monthsRemaining} months` },
                        ]}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* --- Investments (read-only) --- */}
          {tab === "Investments" && (
            <div className="space-y-5">
              <Section title="Investment Portfolio">
                {(() => {
                  if (customer.investments.length === 0) return <EmptyState icon="trending_up" message="No investments" />;

                  const activeInvestment = selectedInvestment || customer.investments[0];

                  return (
                    <div>
                      {/* Top Row: Selectable Thumbnails */}
                      <div className="flex gap-4 overflow-x-auto pb-4 mb-2 no-scrollbar">
                        {customer.investments.map((iv, i) => {
                          const isActive = activeInvestment.type === iv.type && activeInvestment.detail === iv.detail;
                          return (
                            <div key={i} onClick={() => setSelectedInvestment(iv)}
                                 className={`flex-none w-64 p-4 rounded-xl border cursor-pointer transition-all ${isActive ? 'border-gold bg-goldbg shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                              <div className="flex justify-between items-start mb-4">
                                <div className="text-xs font-bold tracking-wide text-slate-800 truncate pr-2">{iv.type}</div>
                                <div className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">USD</div>
                              </div>
                              <div className="text-xl font-extrabold text-slate-900 tracking-tight">{formatMoney(iv.value, "USD")}</div>
                              <div className="text-[11px] font-mono text-slate-500 mt-1">Value</div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Bottom Area: Unified Detail View */}
                      <div className="border border-slate-200 bg-white rounded-xl shadow-sm p-6 md:p-8 mt-4">
                        <div className="flex flex-col md:flex-row justify-between items-start mb-8 pb-8 border-b border-slate-100">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-[10px] font-bold tracking-wide text-primary-700 uppercase bg-primary-50 px-2 py-1 rounded">{activeInvestment.type}</div>
                              <div className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">PORTFOLIO: {investTotal ? Math.round((activeInvestment.value / investTotal) * 100) : 0}%</div>
                            </div>
                            <div className="mt-4">
                              <div className="text-4xl font-extrabold tracking-tight text-slate-900">{formatMoney(activeInvestment.value, "USD")}</div>
                              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Current Value</div>
                            </div>
                          </div>
                          <div className="mt-6 md:mt-0 md:text-right">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Portfolio Value</div>
                            <div className="text-lg font-bold text-slate-900">{formatMoney(investTotal, "USD")}</div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                          <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fund Detail</div>
                                <div className="text-sm font-semibold text-slate-900">{activeInvestment.detail}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Broker (Cambodia)</div>
                                <div className="text-sm font-semibold text-slate-900">{activeInvestment.type.includes("CSX") ? "SBI Royal Securities" : "Cana Securities"}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Deposit</div>
                                <div className="text-sm font-semibold text-slate-900">{formatMoney(activeInvestment.value * 0.85, "USD")}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Withdraw</div>
                                <div className="text-sm font-semibold text-slate-900">$0.00</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Open Date</div>
                                <div className="text-sm font-semibold text-slate-900">Oct 12, 2023</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Risk Profile</div>
                                <div className="text-sm font-semibold text-slate-900">Moderate</div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Performance</h4>
                            <div className="space-y-3 text-sm">
                              {(showAllHistory ? [
                                { date: "1M Return", amount: activeInvestment.value * 0.012, pct: "+1.2%" },
                                { date: "3M Return", amount: activeInvestment.value * 0.034, pct: "+3.4%" },
                                { date: "YTD Return", amount: activeInvestment.value * 0.081, pct: "+8.1%" },
                                { date: "1Y Return", amount: activeInvestment.value * 0.12, pct: "+12.0%" },
                                { date: "3Y Return", amount: activeInvestment.value * 0.25, pct: "+25.0%" },
                                { date: "Since Inception", amount: activeInvestment.value * 0.42, pct: "+42.0%" },
                              ] : [
                                { date: "1M Return", amount: activeInvestment.value * 0.012, pct: "+1.2%" },
                                { date: "3M Return", amount: activeInvestment.value * 0.034, pct: "+3.4%" },
                                { date: "YTD Return", amount: activeInvestment.value * 0.081, pct: "+8.1%" },
                              ]).map((perf, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                  <span className="text-slate-600">{perf.date}</span>
                                  <span className="font-bold text-green-600">+{formatMoney(perf.amount, "USD")} ({perf.pct})</span>
                                </div>
                              ))}

                              <button onClick={() => setShowAllHistory(!showAllHistory)} className="w-full mt-2 py-2 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors border border-transparent hover:border-primary-100 flex items-center justify-center gap-1">
                                {showAllHistory ? "Show less" : "View detailed analysis"} <Icon name={showAllHistory ? "arrow_upward" : "arrow_forward"} className="text-[14px]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Section>
            </div>
          )}

          {/* --- Insurances (read-only) --- */}
          {tab === "Insurances" && (
            <div className="space-y-5">
              <Section title="Insurance policies">
                {(() => {
                  if (customer.insurance.length === 0) return <EmptyState icon="health_and_safety" message="No policies" />;

                  const allInsurances = customer.insurance;
                  const activeInsurance = selectedInsurance || allInsurances[0];
                  const premNumActive = parseInt(activeInsurance.premium.replace(/[^0-9]/g, "")) || 0;

                  return (
                    <div>
                      {/* Top Row: Selectable Thumbnails */}
                      <div className="flex gap-4 overflow-x-auto pb-4 mb-2 no-scrollbar">
                        {allInsurances.map((p, i) => {
                          const isActive = activeInsurance.policy === p.policy;
                          const premNum = parseInt(p.premium.replace(/[^0-9]/g, "")) || 0;
                          return (
                            <div key={i} onClick={() => setSelectedInsurance(p)}
                                 className={`flex-none w-64 p-4 rounded-xl border cursor-pointer transition-all ${isActive ? 'border-gold bg-goldbg shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                              <div className="flex justify-between items-start mb-4">
                                <div className="text-xs font-bold tracking-wide text-slate-800 truncate pr-2">{p.policy}</div>
                                <Badge label={p.status} />
                              </div>
                              <div className="text-xl font-extrabold text-slate-900 tracking-tight">~${(premNum * 1000).toLocaleString()}</div>
                              <div className="text-[11px] font-mono text-slate-500 mt-1">Coverage</div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Bottom Area: Unified Detail View */}
                      <div className="border border-slate-200 bg-white rounded-xl shadow-sm p-6 md:p-8 mt-4">
                        <div className="flex flex-col md:flex-row justify-between items-start mb-8 pb-8 border-b border-slate-100">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-[10px] font-bold tracking-wide text-primary-700 uppercase bg-primary-50 px-2 py-1 rounded">INSURANCE</div>
                              <Badge label={activeInsurance.status} />
                            </div>
                            <div className="mt-4">
                              <div className="text-4xl font-extrabold tracking-tight text-slate-900">~${(premNumActive * 1000).toLocaleString()}</div>
                              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Total Coverage</div>
                            </div>
                          </div>
                          <div className="mt-6 md:mt-0 md:text-right">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Policy Type</div>
                            <div className="text-lg font-bold text-slate-900">{activeInsurance.policy}</div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                          <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Premium</div>
                                <div className="text-sm font-semibold text-slate-900">{activeInsurance.premium}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Renewal Date</div>
                                <div className="text-sm font-semibold text-slate-900">{activeInsurance.renewal}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Claims</div>
                                <div className="text-sm font-bold text-slate-900">0 filed</div>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Policy Instructions</h4>
                              <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center"><span className="text-slate-600">Payment Method</span><span className="font-semibold text-slate-800">Auto-deduct</span></div>
                                <div className="flex justify-between items-center"><span className="text-slate-600">Renewal Action</span><span className="font-semibold text-slate-800 text-right">Auto-renew</span></div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Premium Payments</h4>
                            <div className="space-y-3 text-sm">
                              {(showAllHistory ? [
                                { date: "Jul 1, 2026", amount: activeInsurance.premium, desc: "Premium paid" },
                                { date: "Jun 1, 2026", amount: activeInsurance.premium, desc: "Premium paid" },
                                { date: "May 1, 2026", amount: activeInsurance.premium, desc: "Premium paid" },
                                { date: "Apr 1, 2026", amount: activeInsurance.premium, desc: "Premium paid" },
                                { date: "Mar 1, 2026", amount: activeInsurance.premium, desc: "Premium paid" },
                                { date: "Feb 1, 2026", amount: activeInsurance.premium, desc: "Premium paid" },
                              ] : [
                                { date: "Jul 1, 2026", amount: activeInsurance.premium, desc: "Premium paid" },
                                { date: "Jun 1, 2026", amount: activeInsurance.premium, desc: "Premium paid" },
                              ]).map((txn, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                  <span className="text-slate-600">{txn.date}</span>
                                  <span className="font-bold text-slate-900">{txn.amount}</span>
                                </div>
                              ))}

                              <button onClick={() => setShowAllHistory(!showAllHistory)} className="w-full mt-2 py-2 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors border border-transparent hover:border-primary-100 flex items-center justify-center gap-1">
                                {showAllHistory ? "Show less" : "View all history"} <Icon name={showAllHistory ? "arrow_upward" : "arrow_forward"} className="text-[14px]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Section>
            </div>
          )}

          {/* --- Security (read-only) --- */}
          {tab === "Security" && (
            <div className="space-y-5">
            <Section title="Security overview">
              <div className="grid sm:grid-cols-2 gap-4">
                <Info label="Last login" value={lastLogin} />
                <Info label="MFA" value="Enabled · OTP + biometric" />
                <Info label="Active sessions" value={String(activeSessions)} />
                <Info label="Registered devices" value={String(customer.devices.length)} />
              </div>
            </Section>
            <Section title="Registered devices">
              <div className="divide-y divide-slate-100">
                {customer.devices.map((d, i) => (
                  <div key={i} className="py-3 flex items-center gap-3">
                    <Icon name="smartphone" className="text-slate-400" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-800">{d.name}</div>
                      <div className="text-xs text-slate-400">Last seen {d.lastSeen}</div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${d.trusted ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{d.trusted ? "Trusted" : "Untrusted"}</span>
                  </div>
                ))}
              </div>
            </Section>
            </div>
          )}

          {/* --- Internet Banking (channel view) --- */}
          {tab === "Internet Banking" && (() => {
            const enrolled = customer.ebanking.length > 0;
            if (!enrolled) return (
              <div className="bg-white border border-slate-200 rounded-xl"><EmptyState icon="desktop_windows" message="Not enrolled in Internet Banking — customer uses other channels." /></div>
            );
            const seed = parseInt(customer.id.replace(/\D/g, "").slice(-4) || "1", 10);
            const loginId = `${customer.name.split(" ")[0].toLowerCase()}****${customer.id.slice(-3)}`;
            const dailyLimit = customer.segment === "Affluent" ? 20000 : hasCorp ? 50000 : 5000;
            const entitlements = [
              { k: "View accounts & balances", on: true },
              { k: "Fund transfers", on: true },
              { k: "Bill payments", on: true },
              { k: "Beneficiary management", on: true },
              { k: "Statement download", on: true },
              { k: "Bulk / payroll", on: hasCorp },
            ];

            // Online (web) activity — the staff-facing centrepiece.
            const acts = [...(customer.ibActivity ?? [])].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
            const status = acts[0]?.outcome === "Blocked" ? "Locked" : "Active";
            const logins = acts.filter((a) => a.type === "Login" && a.outcome === "Success").length;
            const failed = acts.filter((a) => a.type === "Failed login" || a.outcome === "Blocked").length;
            const txns = acts.filter((a) => a.category === "Transfer" || a.category === "Payment").length;
            const valueMoved = acts
              .filter((a) => (a.category === "Transfer" || a.category === "Payment") && a.outcome === "Success" && a.amount != null)
              .reduce((s, a) => s + usd(a.amount ?? 0, a.ccy ?? "USD"), 0);

            // Derive web sessions from the activity stream.
            const bySession = new Map<string, IbActivity[]>();
            acts.forEach((a) => { const arr = bySession.get(a.sessionId) ?? []; arr.push(a); bySession.set(a.sessionId, arr); });
            const sessions = Array.from(bySession.entries()).map(([sid, evs]) => {
              const last = [...evs].sort((a, b) => b.dateISO.localeCompare(a.dateISO))[0];
              const ended = evs.some((e) => e.type === "Logout") || evs.some((e) => e.outcome === "Blocked");
              return { sid, browser: last.browser, ip: last.ip, location: last.location, when: last.date, active: !ended };
            }).sort((a, b) => Number(b.active) - Number(a.active));
            const activeSessions = sessions.filter((s) => s.active).length;

            const ibFiltering = !!(ibQ || ibType !== "All" || ibOutcome !== "All" || ibFrom || ibTo);
            const rows = acts.filter((a) => {
              const q = ibQ.trim().toLowerCase();
              const qOk = !q || (`${a.id} ${a.type} ${a.description} ${a.account ?? ""} ${a.reference ?? ""} ${a.browser} ${a.ip} ${a.location} ${a.sessionId}`).toLowerCase().includes(q);
              const tOk = ibType === "All" || a.type === ibType;
              const oOk = ibOutcome === "All" || a.outcome === ibOutcome;
              const day = a.dateISO.slice(0, 10);
              const fOk = !ibFrom || day >= ibFrom;
              const toOk = !ibTo || day <= ibTo;
              return qOk && tOk && oOk && fOk && toOk;
            });
            const totalPages = Math.max(1, Math.ceil(rows.length / ibPerPage));
            const pageC = Math.min(ibPage, totalPages);
            const startI = (pageC - 1) * ibPerPage;
            const pageRows = rows.slice(startI, startI + ibPerPage);
            return (
            <div className="space-y-5">
              {/* Enrollment header */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon name="desktop_windows" className="text-primary-600 bg-primary-50 rounded-lg p-2 text-2xl" />
                  <div>
                    <div className="font-bold text-slate-900">Internet Banking <span className="font-normal text-slate-400 text-sm">· web browser</span></div>
                    <div className="text-xs text-slate-400">Login ID <b className="text-slate-600 font-mono">{loginId}</b> · enrolled {formatDate(customer.joined)} · updated {ibRefreshedAt}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${status === "Locked" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{status}</span>
                  <button onClick={() => { setIbRefreshedAt("Jul 16, 2026 - 11:31 AM"); setToast({ message: "Internet Banking activity refreshed", type: "info" }); }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">
                    <Icon name="refresh" className="text-lg" /><span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>

              {/* Activity summary */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatTile label="Logins" value={logins} />
                <StatTile label="Failed / blocked" value={failed} cls={failed ? "text-red-600" : "text-slate-900"} />
                <StatTile label="Transfers & payments" value={txns} />
                <StatTile label="Value moved" value={formatMoney(Math.round(valueMoved), "USD")} />
                <StatTile label="Active sessions" value={activeSessions} />
              </div>

              {/* Online activity log */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm">Online activity</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Logins, account access, transfers, payments, session status, and outcomes.</p>
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
                  <div className="relative w-56">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                    <input value={ibQ} onChange={(e) => { setIbQ(e.target.value); setIbPage(1); }} placeholder="Search activity, session, or IP…"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                  </div>
                  <select value={ibType} onChange={(e) => { setIbType(e.target.value); setIbPage(1); }}
                    className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                    {["All", ...IB_EVENT_TYPES].map((s) => <option key={s} value={s}>{s === "All" ? "All events" : s}</option>)}
                  </select>
                  <select value={ibOutcome} onChange={(e) => { setIbOutcome(e.target.value); setIbPage(1); }}
                    className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                    {["All", "Success", "Failed", "Blocked", "Pending"].map((s) => <option key={s} value={s}>{s === "All" ? "All outcomes" : s}</option>)}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">From</span>
                    <input type="date" value={ibFrom} onChange={(e) => { setIbFrom(e.target.value); setIbPage(1); }}
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                    <span className="text-xs font-medium text-slate-500">To</span>
                    <input type="date" value={ibTo} onChange={(e) => { setIbTo(e.target.value); setIbPage(1); }}
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                  </div>
                  {ibFiltering && (
                    <button onClick={() => { setIbQ(""); setIbType("All"); setIbOutcome("All"); setIbFrom(""); setIbTo(""); setIbPage(1); }}
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">
                      <Icon name="close" className="text-base" />Clear
                    </button>
                  )}
                </div>

                {rows.length === 0 ? (
                  <EmptyState icon="desktop_windows" message={acts.length === 0 ? "No online (web) activity recorded for this customer" : "No activity matches your filters"} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Time</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Activity</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Account</th>
                          <th className="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Amount</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Browser / IP</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Outcome</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {pageRows.map((a) => (
                          <tr key={a.id} role="button" tabIndex={0}
                            onClick={() => setIbSelected(a)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIbSelected(a); } }}
                            className="hover:bg-slate-50 cursor-pointer focus:outline-none focus:bg-primary-50/50">
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{a.date}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Icon name={IB_EVENT_ICONS[a.type]} className="text-slate-400 text-base flex-none" />
                                <div className="min-w-0">
                                  <div className="font-medium text-slate-800">{a.description}</div>
                                  <div className="text-xs text-slate-400">{a.type} · {a.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 hidden md:table-cell font-mono text-xs">{a.account ?? "—"}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">{a.amount == null ? "—" : formatMoney(a.amount, a.ccy ?? "USD")}</td>
                            <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                              <div className="text-slate-700">{a.browser}</div>
                              <div className="text-xs text-slate-400 font-mono">{a.ip} · {a.location}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${IB_OUTCOME_STYLES[a.outcome]}`}>{a.outcome}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
                      <div className="text-slate-500">Showing {startI + 1}–{Math.min(startI + ibPerPage, rows.length)} of {rows.length}</div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-slate-500">
                          <span className="whitespace-nowrap">Rows per page</span>
                          <select value={ibPerPage} onChange={(e) => { setIbPerPage(Number(e.target.value)); setIbPage(1); }}
                            className="border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600">
                            {[8, 15, 30].map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                        <div className="flex items-center gap-2">
                          <button disabled={pageC <= 1} onClick={() => setIbPage(pageC - 1)} className={`px-2.5 py-1 rounded-md ${pageC <= 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Previous</button>
                          <span className="text-slate-500">Page {pageC} of {totalPages}</span>
                          <button disabled={pageC >= totalPages} onClick={() => setIbPage(pageC + 1)} className={`px-2.5 py-1 rounded-md ${pageC >= totalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Next</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Active web sessions (derived from activity) */}
              <Section title="Web sessions">
                {sessions.length === 0 ? (
                  <div className="text-sm text-slate-500 py-2">No web sessions on record.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {sessions.map((s) => (
                      <div key={s.sid} className="py-2.5 flex items-center gap-3">
                        <Icon name="language" className="text-primary-600 bg-primary-50 rounded-lg p-1.5 text-lg flex-none" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-800">{s.browser}</div>
                          <div className="text-xs text-slate-400 font-mono">{s.sid} · {s.ip} · {s.location} · {s.when}</div>
                        </div>
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{s.active ? "Active" : "Ended"}</span>
                        {s.active && (
                          <button onClick={() => setToast({ message: "Session terminated", type: "success" })}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1">Terminate</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Entitlements + limits overview */}
              <div className="grid md:grid-cols-2 gap-5">
                <Section title="Feature entitlements">
                  <div className="space-y-2">
                    {entitlements.map((e) => (
                      <div key={e.k} className="flex items-center justify-between text-sm"><span className="text-slate-600">{e.k}</span><OnOff on={e.on} /></div>
                    ))}
                  </div>
                </Section>
                <Section title="Transaction limits">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-slate-600">Per transaction</span><span className="font-semibold text-slate-800">{formatMoney(Math.round(dailyLimit / 2), "USD")}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Daily</span><span className="font-semibold text-slate-800">{formatMoney(dailyLimit, "USD")}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Monthly</span><span className="font-semibold text-slate-800">{formatMoney(dailyLimit * 10, "USD")}</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-2"><span className="text-slate-600">Saved beneficiaries</span><span className="font-semibold text-slate-800">{1 + (seed % 6)}</span></div>
                  </div>
                </Section>
              </div>
            </div>
            );
          })()}

          {/* --- Mobile Banking (app channel activity) --- */}
          {tab === "Mobile Banking" && (() => {
            const enrolled = customer.ebanking.includes("Mobile Banking");
            if (!enrolled) return (
              <div className="bg-white border border-slate-200 rounded-xl"><EmptyState icon="smartphone" message="Not enrolled in Mobile Banking — customer uses other channels." /></div>
            );
            const seed = parseInt(customer.id.replace(/\D/g, "").slice(-4) || "1", 10);
            const device = customer.devices[0];
            const biometric = seed % 3 !== 0;
            const push = customer.ebanking.includes("SMS Alert") || seed % 2 === 0;
            const dailyLimit = customer.segment === "Affluent" ? 10000 : hasCorp ? 20000 : 3000;

            const acts = [...(customer.mbActivity ?? [])].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
            const status = acts[0]?.outcome === "Blocked" ? "Locked" : "Active";
            const logins = acts.filter((a) => a.type === "Login" && a.outcome === "Success").length;
            const failed = acts.filter((a) => a.type === "Failed login" || a.outcome === "Blocked").length;
            const foreignActs = acts.filter((a) => a.foreign).length;
            const payTxns = acts.filter((a) => a.category === "Payment" || a.category === "Transfer").length;
            const valueMoved = acts
              .filter((a) => (a.category === "Payment" || a.category === "Transfer") && a.outcome === "Success" && a.amount != null)
              .reduce((s, a) => s + usd(a.amount ?? 0, a.ccy ?? "USD"), 0);

            const bySession = new Map<string, MbActivity[]>();
            acts.forEach((a) => { const arr = bySession.get(a.sessionId) ?? []; arr.push(a); bySession.set(a.sessionId, arr); });
            const sessions = Array.from(bySession.entries()).map(([sid, evs]) => {
              const last = [...evs].sort((a, b) => b.dateISO.localeCompare(a.dateISO))[0];
              const ended = evs.some((e) => e.type === "Logout") || evs.some((e) => e.outcome === "Blocked");
              return { sid, device: last.device, os: last.os, ip: last.ip, location: last.location, when: last.date, foreign: !!last.foreign, active: !ended };
            }).sort((a, b) => Number(b.active) - Number(a.active));
            const activeSessions = sessions.filter((s) => s.active).length;

            const mbFiltering = !!(mbQ || mbType !== "All" || mbOutcome !== "All" || mbFrom || mbTo);
            const rows = acts.filter((a) => {
              const q = mbQ.trim().toLowerCase();
              const qOk = !q || (`${a.id} ${a.type} ${a.description} ${a.account ?? ""} ${a.reference ?? ""} ${a.device} ${a.ip} ${a.location} ${a.sessionId}`).toLowerCase().includes(q);
              const tOk = mbType === "All" || a.type === mbType;
              const oOk = mbOutcome === "All" || a.outcome === mbOutcome;
              const day = a.dateISO.slice(0, 10);
              const fOk = !mbFrom || day >= mbFrom;
              const toOk = !mbTo || day <= mbTo;
              return qOk && tOk && oOk && fOk && toOk;
            });
            const totalPages = Math.max(1, Math.ceil(rows.length / mblPerPage));
            const pageC = Math.min(mblPage, totalPages);
            const startI = (pageC - 1) * mblPerPage;
            const pageRows = rows.slice(startI, startI + mblPerPage);
            return (
            <div className="space-y-5">
              {/* Enrollment header */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon name="smartphone" className="text-primary-600 bg-primary-50 rounded-lg p-2 text-2xl" />
                  <div>
                    <div className="font-bold text-slate-900">Mobile Banking <span className="font-normal text-slate-400 text-sm">· mobile app</span></div>
                    <div className="text-xs text-slate-400">App v5.8.{seed % 9} · last login {device?.lastSeen ?? "—"} ({biometric ? "biometric" : "PIN"}) · updated {mbRefreshedAt}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${status === "Locked" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{status}</span>
                  <button onClick={() => { setMbRefreshedAt("Jul 16, 2026 - 11:31 AM"); setToast({ message: "Mobile Banking activity refreshed", type: "info" }); }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">
                    <Icon name="refresh" className="text-lg" /><span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>

              {/* Activity summary */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatTile label="Logins" value={logins} />
                <StatTile label="Failed / blocked" value={failed} cls={failed ? "text-red-600" : "text-slate-900"} />
                <StatTile label="Foreign activity" value={foreignActs} cls={foreignActs ? "text-amber-600" : "text-slate-900"} />
                <StatTile label="Payments & transfers" value={payTxns} />
                <StatTile label="Value moved" value={formatMoney(Math.round(valueMoved), "USD")} />
              </div>

              {/* Bound device */}
              <Section title="Bound device">
                <div className="flex items-center gap-3">
                  <Icon name="phone_iphone" className="text-primary-600 bg-primary-50 rounded-lg p-2 text-2xl flex-none" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800">{device?.name ?? "—"}</div>
                    <div className="text-xs text-slate-400">Bound to {customer.phone} · last seen {device?.lastSeen ?? "—"} · {activeSessions} active session{activeSessions === 1 ? "" : "s"}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${device?.trusted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{device?.trusted ? "Trusted" : "Pending"}</span>
                  <button onClick={() => setToast({ message: "Device de-registered — customer must re-bind", type: "info" })}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1">De-register</button>
                </div>
              </Section>

              {/* In-app activity log */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm">In-app activity</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Logins, account access, KHQR payments, transfers, session status, and outcomes.</p>
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
                  <div className="relative w-56">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                    <input value={mbQ} onChange={(e) => { setMbQ(e.target.value); setMblPage(1); }} placeholder="Search activity, device, or IP…"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                  </div>
                  <select value={mbType} onChange={(e) => { setMbType(e.target.value); setMblPage(1); }}
                    className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                    {["All", ...MB_EVENT_TYPES].map((s) => <option key={s} value={s}>{s === "All" ? "All events" : s}</option>)}
                  </select>
                  <select value={mbOutcome} onChange={(e) => { setMbOutcome(e.target.value); setMblPage(1); }}
                    className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                    {["All", "Success", "Failed", "Blocked", "Pending"].map((s) => <option key={s} value={s}>{s === "All" ? "All outcomes" : s}</option>)}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">From</span>
                    <input type="date" value={mbFrom} onChange={(e) => { setMbFrom(e.target.value); setMblPage(1); }}
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                    <span className="text-xs font-medium text-slate-500">To</span>
                    <input type="date" value={mbTo} onChange={(e) => { setMbTo(e.target.value); setMblPage(1); }}
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                  </div>
                  {mbFiltering && (
                    <button onClick={() => { setMbQ(""); setMbType("All"); setMbOutcome("All"); setMbFrom(""); setMbTo(""); setMblPage(1); }}
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">
                      <Icon name="close" className="text-base" />Clear
                    </button>
                  )}
                </div>

                {rows.length === 0 ? (
                  <EmptyState icon="smartphone" message={acts.length === 0 ? "No in-app activity recorded for this customer" : "No activity matches your filters"} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Time</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Activity</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Device</th>
                          <th className="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Amount</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Location</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Outcome</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {pageRows.map((a) => (
                          <tr key={a.id} role="button" tabIndex={0}
                            onClick={() => setMbSelected(a)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setMbSelected(a); } }}
                            className="hover:bg-slate-50 cursor-pointer focus:outline-none focus:bg-primary-50/50">
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{a.date}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Icon name={MB_EVENT_ICONS[a.type]} className="text-slate-400 text-base flex-none" />
                                <div className="min-w-0">
                                  <div className="font-medium text-slate-800">{a.description}</div>
                                  <div className="text-xs text-slate-400">{a.type} · {a.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                              <div>{a.device}</div>
                              <div className="text-xs text-slate-400">{a.authMethod ?? a.os}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">{a.amount == null ? "—" : formatMoney(a.amount, a.ccy ?? "USD")}</td>
                            <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                              <div className="flex items-center gap-1.5">
                                <span>{a.location}</span>
                                {a.foreign && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">Foreign</span>}
                              </div>
                              <div className="text-xs text-slate-400 font-mono">{a.ip}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${IB_OUTCOME_STYLES[a.outcome]}`}>{a.outcome}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
                      <div className="text-slate-500">Showing {startI + 1}–{Math.min(startI + mblPerPage, rows.length)} of {rows.length}</div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-slate-500">
                          <span className="whitespace-nowrap">Rows per page</span>
                          <select value={mblPerPage} onChange={(e) => { setMblPerPage(Number(e.target.value)); setMblPage(1); }}
                            className="border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600">
                            {[8, 15, 30].map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                        <div className="flex items-center gap-2">
                          <button disabled={pageC <= 1} onClick={() => setMblPage(pageC - 1)} className={`px-2.5 py-1 rounded-md ${pageC <= 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Previous</button>
                          <span className="text-slate-500">Page {pageC} of {totalPages}</span>
                          <button disabled={pageC >= totalPages} onClick={() => setMblPage(pageC + 1)} className={`px-2.5 py-1 rounded-md ${pageC >= totalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Next</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* App sessions */}
              <Section title="App sessions">
                {sessions.length === 0 ? (
                  <div className="text-sm text-slate-500 py-2">No app sessions on record.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {sessions.map((s) => (
                      <div key={s.sid} className="py-2.5 flex items-center gap-3">
                        <Icon name={s.foreign ? "travel_explore" : "phone_iphone"} className={`rounded-lg p-1.5 text-lg flex-none ${s.foreign ? "text-amber-600 bg-amber-50" : "text-primary-600 bg-primary-50"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-800">{s.device} · {s.os}</div>
                          <div className="text-xs text-slate-400 font-mono">{s.sid} · {s.ip} · {s.location} · {s.when}</div>
                        </div>
                        {s.foreign && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">Foreign</span>}
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{s.active ? "Active" : "Ended"}</span>
                        {s.active && (
                          <button onClick={() => setToast({ message: "App session terminated", type: "success" })}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1">Terminate</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Auth + limits */}
              <div className="grid md:grid-cols-2 gap-5">
                <Section title="Authentication &amp; alerts">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span className="text-slate-600">Biometric login</span><OnOff on={biometric} /></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">PIN / passcode</span><OnOff on={true} /></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">Push notifications</span><OnOff on={push} /></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">SMS alerts</span><OnOff on={customer.ebanking.includes("SMS Alert")} /></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">Single-device binding</span><OnOff on={true} /></div>
                  </div>
                </Section>
                <Section title="In-app limits">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-slate-600">Per transaction</span><span className="font-semibold text-slate-800">{formatMoney(Math.round(dailyLimit / 2), "USD")}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Daily</span><span className="font-semibold text-slate-800">{formatMoney(dailyLimit, "USD")}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Monthly</span><span className="font-semibold text-slate-800">{formatMoney(dailyLimit * 10, "USD")}</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-2"><span className="text-slate-600">KHQR daily cap</span><span className="font-semibold text-slate-800">{formatMoney(Math.min(dailyLimit, 2000), "USD")}</span></div>
                  </div>
                </Section>
              </div>
            </div>
            );
          })()}

          {/* --- Audit Logs (read-only, immutable) --- */}
          {tab === "Audit Logs" && (() => {
            const logs = buildAuditLogs(customer.id);
            const audFiltering = !!(audQ || audCat !== "All" || audActor !== "All" || audResult !== "All" || audFrom || audTo);
            const rows = logs.filter((l) => {
              const cOk = audCat === "All" || l.category === audCat;
              const aOk = audActor === "All" || l.actor === audActor;
              const rOk = audResult === "All" || l.result === audResult;
              const q = audQ.trim().toLowerCase();
              const qOk = !q || (l.action + " " + l.actor + " " + l.id + " " + (l.field ?? "")).toLowerCase().includes(q);
              const fOk = !audFrom || l.date >= audFrom;
              const tOk = !audTo || l.date <= audTo;
              return cOk && aOk && rOk && qOk && fOk && tOk;
            });
            const totalPages = Math.max(1, Math.ceil(rows.length / audPerPage));
            const pageC = Math.min(audPage, totalPages);
            const start = (pageC - 1) * audPerPage;
            const pageRows = rows.slice(start, start + audPerPage);
            const summary = {
              total: logs.length,
              profile: logs.filter((l) => l.category === "Profile").length,
              access: logs.filter((l) => l.category === "Access").length,
              security: logs.filter((l) => l.category === "Security").length,
              failed: logs.filter((l) => l.result === "Failed").length,
            };
            const actors = ["All", ...Array.from(new Set(logs.map((l) => l.actor)))];
            const resultPill = (r: string) => r === "Failed" ? "bg-red-100 text-red-700" : r === "Pending" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
            const exportCsv = () => {
              const head = ["Timestamp", "Actor", "Role", "Category", "Action", "Field", "Before", "After", "Source", "Result"];
              const csv = [head.join(","), ...rows.map((r) => [r.ts, r.actor, r.role, r.category, r.action, r.field ?? "", r.before ?? "", r.after ?? "", r.source, r.result]
                .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
              const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
              const a = document.createElement("a"); a.href = url; a.download = `audit-log-${customer.id}.csv`; a.click();
              URL.revokeObjectURL(url);
              setToast({ message: `Exported ${rows.length} audit entries (CSV)`, type: "success" });
            };
            return (
            <div className="space-y-5">
              {/* Summary strip */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  ["Total events", summary.total, "text-slate-900"],
                  ["Profile changes", summary.profile, "text-slate-900"],
                  ["Data access", summary.access, "text-slate-900"],
                  ["Security", summary.security, "text-slate-900"],
                  ["Failed", summary.failed, summary.failed ? "text-red-600" : "text-slate-900"],
                ].map(([label, val, cls]) => (
                  <div key={label as string} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
                    <div className={`text-xl font-extrabold mt-1 ${cls}`}>{val}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">Audit trail</h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400"><Icon name="lock" className="text-sm" />Read-only · immutable</span>
                  </div>
                  <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50">
                    <Icon name="download" className="text-base" />Export
                  </button>
                </div>

                {/* Filters */}
                <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
                  <div className="relative w-44">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                    <input value={audQ} onChange={(e) => { setAudQ(e.target.value); setAudPage(1); }} placeholder="Search…"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                  </div>
                  <select value={audCat} onChange={(e) => { setAudCat(e.target.value); setAudPage(1); }}
                    className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                    {AUDIT_CATEGORIES.map((c) => <option key={c} value={c}>{c === "All" ? "All categories" : c}</option>)}
                  </select>
                  <select value={audActor} onChange={(e) => { setAudActor(e.target.value); setAudPage(1); }}
                    className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                    {actors.map((a) => <option key={a} value={a}>{a === "All" ? "All actors" : a}</option>)}
                  </select>
                  <select value={audResult} onChange={(e) => { setAudResult(e.target.value); setAudPage(1); }}
                    className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                    {["All", "Success", "Failed", "Pending"].map((s) => <option key={s} value={s}>{s === "All" ? "All results" : s}</option>)}
                  </select>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-xs font-medium text-slate-500">From</span>
                    <input type="date" value={audFrom} onChange={(e) => { setAudFrom(e.target.value); setAudPage(1); }}
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                    <span className="text-xs font-medium text-slate-500">To</span>
                    <input type="date" value={audTo} onChange={(e) => { setAudTo(e.target.value); setAudPage(1); }}
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                  </div>
                  {audFiltering && (
                    <button onClick={() => { setAudQ(""); setAudCat("All"); setAudActor("All"); setAudResult("All"); setAudFrom(""); setAudTo(""); setAudPage(1); }}
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">
                      <Icon name="close" className="text-base" />Clear
                    </button>
                  )}
                </div>

                {rows.length === 0 ? (
                  <EmptyState icon="history" message="No audit events match your filters" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Timestamp</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Actor</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Category</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Action</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Result</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {pageRows.map((l) => {
                          const open = audOpen === l.id;
                          return (
                            <React.Fragment key={l.id}>
                              <tr onClick={() => setAudOpen(open ? null : l.id)} className="hover:bg-slate-50 cursor-pointer">
                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">{l.ts}</td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                  <div className="font-medium text-slate-800">{l.actor}</div>
                                  <div className="text-xs text-slate-400">{l.role}</div>
                                </td>
                                <td className="px-4 py-3 hidden lg:table-cell">
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">{l.category}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-slate-800">{l.action}</span>
                                    {l.sensitive && <span title="Sensitive action"><Icon name="flag" className="text-amber-500 text-base" /></span>}
                                  </div>
                                  {l.field && <div className="text-xs text-slate-400 font-mono">{l.field}</div>}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${resultPill(l.result)}`}>{l.result}</span>
                                </td>
                                <td className="px-4 py-3 text-right"><Icon name={open ? "expand_less" : "expand_more"} className="text-slate-400" /></td>
                              </tr>
                              {open && (
                                <tr className="bg-slate-50/60">
                                  <td colSpan={6} className="px-4 py-3">
                                    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                      {l.before != null && <div><span className="text-slate-400 text-xs">Before</span><div className="font-medium text-slate-700">{l.before}</div></div>}
                                      {l.after != null && <div><span className="text-slate-400 text-xs">After</span><div className="font-medium text-slate-700">{l.after}</div></div>}
                                      <div><span className="text-slate-400 text-xs">Actor</span><div className="font-medium text-slate-700">{l.actor} · {l.role} ({l.actorId})</div></div>
                                      <div><span className="text-slate-400 text-xs">Source</span><div className="font-medium text-slate-700">{l.source}</div></div>
                                      <div><span className="text-slate-400 text-xs">Reference</span><div className="font-mono text-xs text-slate-700">{l.id}</div></div>
                                      <div><span className="text-slate-400 text-xs">Category</span><div className="font-medium text-slate-700">{l.category}</div></div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
                      <div className="text-slate-500">Showing {start + 1}–{Math.min(start + audPerPage, rows.length)} of {rows.length} events</div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-slate-500">
                          <span className="whitespace-nowrap">Rows per page</span>
                          <select value={audPerPage} onChange={(e) => { setAudPerPage(Number(e.target.value)); setAudPage(1); }}
                            className="border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600">
                            {[8, 15, 30].map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                        <div className="flex items-center gap-2">
                          <button disabled={pageC <= 1} onClick={() => setAudPage(pageC - 1)} className={`px-2.5 py-1 rounded-md ${pageC <= 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Previous</button>
                          <span className="text-slate-500">Page {pageC} of {totalPages}</span>
                          <button disabled={pageC >= totalPages} onClick={() => setAudPage(pageC + 1)} className={`px-2.5 py-1 rounded-md ${pageC >= totalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Next</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            );
          })()}

          {/* --- Merchants --- */}
          {tab === "Merchants" && (() => {
            const isCoffee = activeMerchant === "Cambo Coffee Hub";
            const merchants = [
              { name: "Cambo Coffee Hub", icon: "store", mid: "77823901" },
              { name: "Cambo Bakery", icon: "storefront", mid: "88939212" },
            ];
            const settlements = [
              { date: "Jul 14, 2026", batch: "BAT-9921", count: 312, amount: "$8,450.00" },
              { date: "Jul 13, 2026", batch: "BAT-9920", count: 289, amount: "$7,120.50" },
              { date: "Jul 12, 2026", batch: "BAT-9919", count: 254, amount: "$6,890.00" },
            ];
            const terminals = [
              { icon: "point_of_sale", iconClass: "bg-slate-100 text-slate-600", name: "POS - Counter 1", tid: "8820101" },
              { icon: "point_of_sale", iconClass: "bg-slate-100 text-slate-600", name: "POS - Counter 2", tid: "8820102" },
              { icon: "qr_code_2", iconClass: "bg-blue-50 text-blue-600", name: "KHQR Standee", tid: "8820103" },
            ];
            return (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Merchant Services</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage business accounts, track sales, and view settlement histories.</p>
                  </div>
                </div>

                {/* Account Selector */}
                <div className="flex items-center gap-4 pb-6 overflow-x-auto border-b border-slate-100 mb-6">
                  {merchants.map((m) => {
                    const active = activeMerchant === m.name;
                    return (
                      <div key={m.name} onClick={() => setActiveMerchant(m.name)}
                        className={`flex items-center gap-3 rounded-xl p-3 w-64 flex-shrink-0 cursor-pointer shadow-sm transition-all border text-slate-700 ${active ? "border-gold bg-goldbg" : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                        <div className={active ? "bg-white p-2 rounded-lg text-amber-600" : "bg-slate-100 p-2 rounded-lg text-slate-500"}>
                          <Icon name={m.icon} className="text-[20px]" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold truncate text-slate-900">{m.name}</div>
                          <div className="text-[10px] font-mono mt-0.5 text-slate-400">MID: {m.mid}</div>
                        </div>
                        {active && <Icon name="check_circle" className="text-amber-600 text-[18px]" />}
                      </div>
                    );
                  })}

                  <button className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-dashed border-slate-300 text-blue-600 hover:bg-blue-50 hover:border-blue-300 rounded-xl text-sm font-bold transition-colors flex-shrink-0">
                    <Icon name="add" className="text-[20px]" />
                    <span>Link Account</span>
                  </button>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Left Column: Metrics & Settlements */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Metrics Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today&apos;s Sales</span>
                          <Icon name="point_of_sale" className="text-emerald-500" />
                        </div>
                        <div>
                          <div className="text-2xl font-black text-slate-900">{isCoffee ? "$4,250.00" : "$1,200.00"}</div>
                          <div className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                            <Icon name="trending_up" className="text-[14px]" /> {isCoffee ? "+12%" : "+5%"} vs yesterday
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transactions</span>
                          <Icon name="receipt_long" className="text-blue-500" />
                        </div>
                        <div>
                          <div className="text-2xl font-black text-slate-900">{isCoffee ? "142" : "45"}</div>
                          <div className="text-xs font-semibold text-slate-400 mt-1">Avg Ticket: {isCoffee ? "$29.92" : "$26.66"}</div>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Settlement</span>
                          <Icon name="account_balance_wallet" className="text-amber-500" />
                        </div>
                        <div>
                          <div className="text-2xl font-black text-slate-900">{isCoffee ? "$1,800.50" : "$450.00"}</div>
                          <div className="text-xs font-semibold text-amber-600 mt-1 flex items-center gap-1">
                            <Icon name="schedule" className="text-[14px]" /> Settles at 10:00 PM
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Settlements Table */}
                    <Section title="Recent Settlements" action={<button className="text-blue-600 text-xs font-bold hover:underline">View All</button>}>
                      <div className="overflow-x-auto -mx-5 -mb-5 rounded-b-xl">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                          <thead>
                            <tr className="bg-slate-50 border-y border-slate-100 text-[10px] uppercase tracking-widest text-slate-500">
                              <th className="px-5 py-3 font-bold">Date</th>
                              <th className="px-5 py-3 font-bold">Batch ID</th>
                              <th className="px-5 py-3 font-bold">Txn Count</th>
                              <th className="px-5 py-3 font-bold text-right">Amount</th>
                              <th className="px-5 py-3 font-bold text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {settlements.map((s) => (
                              <tr key={s.batch} className="hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-3 font-medium text-slate-600">{s.date}</td>
                                <td className="px-5 py-3 font-mono text-xs text-slate-500">{s.batch}</td>
                                <td className="px-5 py-3 text-slate-600">{s.count}</td>
                                <td className="px-5 py-3 font-bold text-slate-900 text-right">{s.amount}</td>
                                <td className="px-5 py-3 text-center">
                                  <span className="inline-block text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded">Completed</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Pagination Footer */}
                        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                            <span>Show</span>
                            <select className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 outline-none hover:border-slate-300 transition-colors focus:ring-2 focus:ring-blue-100">
                              <option>5</option>
                              <option>10</option>
                              <option>25</option>
                              <option>50</option>
                              <option>100</option>
                            </select>
                            <span>rows</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                            <span>1-3 of 42</span>
                            <div className="flex items-center gap-1">
                              <button className="p-1 rounded hover:bg-slate-200 text-slate-400 cursor-not-allowed transition-colors" disabled><Icon name="chevron_left" className="text-[18px]" /></button>
                              <button className="p-1 rounded hover:bg-slate-200 text-slate-700 transition-colors"><Icon name="chevron_right" className="text-[18px]" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Section>
                  </div>

                  {/* Right Column: Profile & Terminals */}
                  <div className="space-y-6">
                    {/* Business Profile */}
                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2">
                        <Icon name="store" className="text-8xl text-white" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                            <Icon name="storefront" className="text-white" />
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Active</span>
                        </div>
                        <h3 className="text-xl font-bold mb-1">{activeMerchant}</h3>
                        <p className="text-slate-400 text-xs mb-6">DBA Name</p>

                        <div className="space-y-3">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Merchant Type</div>
                            <button className="flex items-center gap-1 text-sm font-semibold text-blue-300 hover:text-blue-200 transition-colors group">
                              {isCoffee ? "SME Retail" : "Food & Beverage"}
                              <Icon name="expand_more" className="text-[16px] group-hover:translate-y-0.5 transition-transform" />
                            </button>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Merchant ID (MID)</div>
                            <div className="font-mono text-sm">{isCoffee ? "MER-77823901" : "MER-88939212"}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Linked Account</div>
                            <div className="text-sm">{isCoffee ? "Main Checking •••• 8812" : "Business Checking •••• 9920"}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">MCC Category</div>
                            <div className="text-sm">{isCoffee ? "5814 - Fast Food Restaurants" : "5411 - Bakeries"}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Terminals */}
                    <Section title="Active Terminals" action={<button className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition-colors"><Icon name="add" className="text-[18px]" /></button>}>
                      <div className="space-y-4">
                        {terminals.map((t, ti) => (
                          <React.Fragment key={t.tid}>
                            {ti > 0 && <div className="border-t border-slate-100"></div>}
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-lg ${t.iconClass}`}>
                                <Icon name={t.icon} />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <div className="text-sm font-bold text-slate-900">{t.name}</div>
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                                </div>
                                <div className="text-xs font-mono text-slate-500">TID: {t.tid}</div>
                              </div>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </Section>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* --- Reminder --- */}
          {tab === "Reminder" && (() => {
            const groups = [
              {
                icon: "error_outline", iconColor: "text-rose-500", title: "My Alerts",
                count: "2 Alerts", countClass: "bg-rose-100 text-rose-700",
                meta: "Time", tagHead: "Status",
                rows: [
                  { subject: "KYC Update Required", details: "Customer's National ID expires in 3 days. Please request updated documents.", when: "2 hours ago", tag: "Action Needed", tagClass: "text-rose-500 bg-rose-50" },
                  { subject: "Address Proof Missing", details: "Utility bill upload failed validation.", when: "Yesterday", tag: "Pending", tagClass: "text-amber-500 bg-amber-50" },
                ],
              },
              {
                icon: "swap_horiz", iconColor: "text-blue-500", title: "Transactions",
                count: "2 Upcoming", countClass: "bg-blue-100 text-blue-700",
                meta: "Date", tagHead: "Type",
                rows: [
                  { subject: "Fixed Deposit Maturity", details: "FD Account *8812 ($50,000) is maturing. Contact for renewal.", when: "Tomorrow", tag: "System", tagClass: "text-blue-600 bg-blue-50" },
                  { subject: "Scheduled Transfer", details: "$500.00 to EDC Billing. Funds are available.", when: "Today", tag: "Auto-Pay", tagClass: "text-emerald-600 bg-emerald-50" },
                ],
              },
              {
                icon: "campaign", iconColor: "text-purple-500", title: "Announcements",
                count: "2 Notices", countClass: "bg-purple-100 text-purple-700",
                meta: "Origin", tagHead: "Tag",
                rows: [
                  { subject: "New Premium Card Launch", details: "This customer is eligible for the new Visa Infinite. Mention during next contact.", when: "Marketing", tag: "Campaign", tagClass: "text-purple-600 bg-purple-50", dim: false },
                  { subject: "Branch Holiday Notice", details: "All branches will be closed next Monday. Digital channels remain open.", when: "Admin", tag: "Info", tagClass: "text-slate-500 bg-slate-100", dim: true },
                ],
              },
            ];
            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Notification Center</h2>
                    <p className="text-sm text-slate-500 mt-1">Important alerts, upcoming transactions, and announcements for this customer.</p>
                  </div>
                  <button className="px-4 py-2 bg-white border border-slate-200 text-sm font-bold text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-colors">
                    Mark all as read
                  </button>
                </div>

                {groups.map((g, gi) => (
                  <Section key={gi}
                    title={<span className="flex items-center gap-2"><Icon name={g.icon} className={g.iconColor} /> {g.title}</span>}
                    action={<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${g.countClass}`}>{g.count}</span>}
                  >
                    <div className="overflow-x-auto -mx-5 -mb-5 rounded-b-xl">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-50 border-y border-slate-100 text-[10px] uppercase tracking-widest text-slate-500">
                            <th className="px-5 py-3 font-bold w-1/4">Subject</th>
                            <th className="px-5 py-3 font-bold w-1/2">Details</th>
                            <th className="px-5 py-3 font-bold">{g.meta}</th>
                            <th className="px-5 py-3 font-bold text-right">{g.tagHead}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {g.rows.map((r, ri) => (
                            <tr key={ri} className={`hover:bg-slate-50 transition-colors group ${"dim" in r && r.dim ? "opacity-70" : ""}`}>
                              <td className="px-5 py-3 font-bold text-slate-900">{r.subject}</td>
                              <td className="px-5 py-3 text-slate-500 whitespace-normal">{r.details}</td>
                              <td className="px-5 py-3 text-slate-400 font-medium text-xs">{r.when}</td>
                              <td className="px-5 py-3 text-right">
                                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${r.tagClass}`}>{r.tag}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Section>
                ))}
              </div>
            );
          })()}

          {/* --- Loyalty Points --- */}
          {tab === "Loyalty Points" && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="md:col-span-1 space-y-6">
                <div className="bg-white border border-amber-200 shadow-[0_4px_20px_-4px_rgba(255,182,0,0.12)] rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                    <Icon name="stars" className="text-9xl text-amber-500" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="bg-amber-100 text-amber-700 p-2 rounded-xl">
                        <Icon name="workspace_premium" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Loyalty Status</h3>
                    </div>

                    <div className="mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Available Balance</div>
                    <div className="text-5xl font-black text-slate-900 tracking-tighter mb-4">
                      2,350<span className="text-2xl text-amber-500 ml-1">pts</span>
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                      <Badge label="Premium Tier" />
                      <span className="text-xs font-medium text-slate-500">Member since &apos;23</span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-slate-500">Next: Premium Plus</span>
                        <span className="text-slate-800">15%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2 overflow-hidden">
                        <div className="bg-amber-500 h-1.5 rounded-full relative" style={{ width: '15%' }}>
                          <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider text-right">
                        12,650 pts remaining
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button className="w-full py-3 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 transition-all flex items-center justify-between group">
                      <span>Manual Point Adjustment</span>
                      <Icon name="add_circle_outline" className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                    </button>
                    <button className="w-full py-3 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 transition-all flex items-center justify-between group">
                      <span>Redeem on Behalf</span>
                      <Icon name="redeem" className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Ledger */}
              <div className="md:col-span-2">
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden h-full">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Points Ledger</h3>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 transition-colors text-slate-700">Last 30 Days</button>
                      <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"><Icon name="filter_list" /></button>
                    </div>
                  </div>

                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-white border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400">
                          <th className="px-6 py-4 font-bold">Date</th>
                          <th className="px-6 py-4 font-bold">Transaction Description</th>
                          <th className="px-6 py-4 font-bold">Ref No.</th>
                          <th className="px-6 py-4 font-bold text-right">Points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm">
                        {[
                          { date: "Jul 13, 2026", desc: "Pay to Other Bank", ref: "TXN-9382", pts: 50 },
                          { date: "Jul 10, 2026", desc: "Bill Payment - EDC", ref: "TXN-4112", pts: 20 },
                          { date: "Jul 05, 2026", desc: "Coffee Shop Voucher", ref: "RDM-1099", pts: -150 },
                          { date: "Jun 28, 2026", desc: "Credit Card Spend", ref: "CC-8821", pts: 340 },
                          { date: "Jun 15, 2026", desc: "Anniversary Bonus", ref: "SYS-BNS", pts: 500 },
                        ].map((row, i) => {
                          const credit = row.pts > 0;
                          return (
                            <tr key={i} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-6 py-4 font-medium text-slate-500">{row.date}</td>
                              <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${credit ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                                  <Icon name={credit ? "arrow_downward" : "arrow_upward"} className="text-[16px]" />
                                </div>
                                {row.desc}
                              </td>
                              <td className="px-6 py-4 font-mono text-xs text-slate-400">{row.ref}</td>
                              <td className={`px-6 py-4 font-bold text-right ${credit ? "text-green-600" : "text-red-500"}`}>{credit ? "+" : "-"} {Math.abs(row.pts)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 border-t border-slate-100 flex justify-center bg-white">
                    <button className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1">
                      View older transactions <Icon name="expand_more" className="text-[16px]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- Call Center (call activity tracker) --- */}
          {tab === "Call Center" && (() => {
            const base = (customer.calls ?? []).map((r) => callEdits[r.id] ?? r);
            const added = callAdded.filter((r) => r.customerId === customer.id).map((r) => callEdits[r.id] ?? r);
            const all = [...added, ...base].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
            const callFiltering = !!(callQ || callStatus !== "All" || callFrom || callTo);
            const rows = all.filter((r) => {
              const q = callQ.trim().toLowerCase();
              const qOk = !q || (`${r.id} ${r.record} ${r.agent} ${r.phone} ${r.duration} ${r.stage} ${r.direction}`).toLowerCase().includes(q);
              const sOk = callStatus === "All" || r.stage === callStatus;
              const day = r.dateISO.slice(0, 10);
              const fOk = !callFrom || day >= callFrom;
              const tOk = !callTo || day <= callTo;
              return qOk && sOk && fOk && tOk;
            });
            const totalPages = Math.max(1, Math.ceil(rows.length / callPerPage));
            const pageC = Math.min(callPage, totalPages);
            const startI = (pageC - 1) * callPerPage;
            const pageRows = rows.slice(startI, startI + callPerPage);
            const resolved = all.filter((r) => r.stage === "Resolved").length;
            const followUp = all.filter((r) => r.stage === "Follow-up").length;
            const escalated = all.filter((r) => r.stage === "Escalated").length;
            return (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Call Center</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Review inbound and outbound calls, call reasons, outcomes, and follow-up actions.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Updated {callRefreshedAt}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setCallRefreshedAt("Jul 16, 2026 - 11:31 AM"); setToast({ message: "Call activity refreshed", type: "info" }); }}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">
                      <Icon name="refresh" className="text-lg" /><span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button onClick={() => setCallForm({ mode: "create", record: null })}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gold text-navy text-sm font-semibold rounded-lg hover:brightness-95">
                      <Icon name="add" className="text-lg" /><span className="hidden sm:inline">Log call activity</span>
                    </button>
                  </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatTile label="Total calls" value={all.length} />
                  <StatTile label="Resolved" value={resolved} />
                  <StatTile label="Follow-up" value={followUp} cls={followUp ? "text-amber-600" : "text-slate-900"} />
                  <StatTile label="Escalated" value={escalated} cls={escalated ? "text-red-600" : "text-slate-900"} />
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Filters */}
                  <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
                    <div className="relative w-48">
                      <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                      <input value={callQ} onChange={(e) => { setCallQ(e.target.value); setCallPage(1); }} placeholder="Search calls…"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                    </div>
                    <select value={callStatus} onChange={(e) => { setCallStatus(e.target.value); setCallPage(1); }}
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                      {["All", ...CALL_STATUSES].map((s) => <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">From</span>
                      <input type="date" value={callFrom} onChange={(e) => { setCallFrom(e.target.value); setCallPage(1); }}
                        className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                      <span className="text-xs font-medium text-slate-500">To</span>
                      <input type="date" value={callTo} onChange={(e) => { setCallTo(e.target.value); setCallPage(1); }}
                        className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                    </div>
                    {callFiltering && (
                      <button onClick={() => { setCallQ(""); setCallStatus("All"); setCallFrom(""); setCallTo(""); setCallPage(1); }}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">
                        <Icon name="close" className="text-base" />Clear
                      </button>
                    )}
                  </div>

                  {rows.length === 0 ? (
                    <EmptyState icon="support_agent" message={all.length === 0 ? "No call activity for this customer" : "No calls match your filters"} />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Call date</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600">Call reason</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Duration</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Agent</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Phone</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {pageRows.map((r) => (
                            <tr key={r.id} role="button" tabIndex={0}
                              onClick={() => setCallSelected(r)}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCallSelected(r); } }}
                              className="hover:bg-slate-50 cursor-pointer focus:outline-none focus:bg-primary-50/50">
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.date}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Icon name={r.direction === "Inbound" ? "call_received" : "call_made"} className="text-slate-400 text-base flex-none" />
                                  <div>
                                    <div className="font-medium text-slate-800">{r.record}</div>
                                    <div className="text-xs text-slate-400 font-mono">{r.id}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.duration}</td>
                              <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{r.agent}</td>
                              <td className="px-4 py-3 text-slate-600 hidden lg:table-cell font-mono text-xs">{r.phone}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
                        <div className="text-slate-500">Showing {startI + 1}–{Math.min(startI + callPerPage, rows.length)} of {rows.length}</div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-slate-500">
                            <span className="whitespace-nowrap">Rows per page</span>
                            <select value={callPerPage} onChange={(e) => { setCallPerPage(Number(e.target.value)); setCallPage(1); }}
                              className="border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600">
                              {[8, 15, 30].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </label>
                          <div className="flex items-center gap-2">
                            <button disabled={pageC <= 1} onClick={() => setCallPage(pageC - 1)} className={`px-2.5 py-1 rounded-md ${pageC <= 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Previous</button>
                            <span className="text-slate-500">Page {pageC} of {totalPages}</span>
                            <button disabled={pageC >= totalPages} onClick={() => setCallPage(pageC + 1)} className={`px-2.5 py-1 rounded-md ${pageC >= totalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Next</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* --- Compliance (customer complaints tracker) --- */}
          {tab === "Compliance" && (() => {
            const base = (customer.complaints ?? []).map((r) => cmpEdits[r.id] ?? r);
            const added = cmpAdded.filter((r) => r.customerId === customer.id).map((r) => cmpEdits[r.id] ?? r);
            const all = [...added, ...base].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
            const cmpFiltering = !!(cmpQ || cmpStatus !== "All" || cmpFrom || cmpTo);
            const rows = all.filter((r) => {
              const q = cmpQ.trim().toLowerCase();
              const qOk = !q || (`${r.id} ${r.record} ${r.category} ${r.priority} ${r.owner} ${r.stage} ${r.channel}`).toLowerCase().includes(q);
              const sOk = cmpStatus === "All" || r.stage === cmpStatus;
              const day = r.dateISO.slice(0, 10);
              const fOk = !cmpFrom || day >= cmpFrom;
              const tOk = !cmpTo || day <= cmpTo;
              return qOk && sOk && fOk && tOk;
            });
            const totalPages = Math.max(1, Math.ceil(rows.length / cmpPerPage));
            const pageC = Math.min(cmpPage, totalPages);
            const startI = (pageC - 1) * cmpPerPage;
            const pageRows = rows.slice(startI, startI + cmpPerPage);
            const open = all.filter((r) => r.stage === "New" || r.stage === "Investigating" || r.stage === "Waiting").length;
            const overdue = all.filter((r) => r.stage === "Overdue").length;
            const resolved = all.filter((r) => r.stage === "Resolved" || r.stage === "Closed").length;
            return (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Customer Complaints</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Track complaint details, ownership, SLA, investigation, and final resolution.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Updated {cmpRefreshedAt}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setCmpRefreshedAt("Jul 16, 2026 - 11:31 AM"); setToast({ message: "Complaints refreshed", type: "info" }); }}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">
                      <Icon name="refresh" className="text-lg" /><span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button onClick={() => setCmpForm({ mode: "create", record: null })}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gold text-navy text-sm font-semibold rounded-lg hover:brightness-95">
                      <Icon name="add" className="text-lg" /><span className="hidden sm:inline">Create complaint</span>
                    </button>
                  </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatTile label="Total complaints" value={all.length} />
                  <StatTile label="Open" value={open} cls={open ? "text-amber-600" : "text-slate-900"} />
                  <StatTile label="Overdue" value={overdue} cls={overdue ? "text-red-600" : "text-slate-900"} />
                  <StatTile label="Resolved / closed" value={resolved} />
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Filters */}
                  <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
                    <div className="relative w-48">
                      <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                      <input value={cmpQ} onChange={(e) => { setCmpQ(e.target.value); setCmpPage(1); }} placeholder="Search complaints…"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                    </div>
                    <select value={cmpStatus} onChange={(e) => { setCmpStatus(e.target.value); setCmpPage(1); }}
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                      {["All", ...COMPLAINT_STATUSES].map((s) => <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">From</span>
                      <input type="date" value={cmpFrom} onChange={(e) => { setCmpFrom(e.target.value); setCmpPage(1); }}
                        className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                      <span className="text-xs font-medium text-slate-500">To</span>
                      <input type="date" value={cmpTo} onChange={(e) => { setCmpTo(e.target.value); setCmpPage(1); }}
                        className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                    </div>
                    {cmpFiltering && (
                      <button onClick={() => { setCmpQ(""); setCmpStatus("All"); setCmpFrom(""); setCmpTo(""); setCmpPage(1); }}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">
                        <Icon name="close" className="text-base" />Clear
                      </button>
                    )}
                  </div>

                  {rows.length === 0 ? (
                    <EmptyState icon="gavel" message={all.length === 0 ? "No complaints for this customer" : "No complaints match your filters"} />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Reported</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600">Complaint</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Category</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600">Priority</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Assigned team</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {pageRows.map((r) => (
                            <tr key={r.id} role="button" tabIndex={0}
                              onClick={() => setCmpSelected(r)}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCmpSelected(r); } }}
                              className="hover:bg-slate-50 cursor-pointer focus:outline-none focus:bg-primary-50/50">
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.date}</td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-800">{r.record}</div>
                                <div className="text-xs text-slate-400 font-mono">{r.id}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{r.category}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${COMPLAINT_PRIORITY_STYLES[r.priority]}`}>{r.priority}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{r.owner}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${COMPLAINT_STATUS_STYLES[r.stage]}`}>{r.stage}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
                        <div className="text-slate-500">Showing {startI + 1}–{Math.min(startI + cmpPerPage, rows.length)} of {rows.length}</div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-slate-500">
                            <span className="whitespace-nowrap">Rows per page</span>
                            <select value={cmpPerPage} onChange={(e) => { setCmpPerPage(Number(e.target.value)); setCmpPage(1); }}
                              className="border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600">
                              {[8, 15, 30].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </label>
                          <div className="flex items-center gap-2">
                            <button disabled={pageC <= 1} onClick={() => setCmpPage(pageC - 1)} className={`px-2.5 py-1 rounded-md ${pageC <= 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Previous</button>
                            <span className="text-slate-500">Page {pageC} of {totalPages}</span>
                            <button disabled={pageC >= totalPages} onClick={() => setCmpPage(pageC + 1)} className={`px-2.5 py-1 rounded-md ${pageC >= totalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Next</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* --- Sales Activities (pipeline tracker) --- */}
          {tab === "Sales Activities" && (() => {
            const base = (customer.sales ?? []).map((r) => salesEdits[r.id] ?? r);
            const added = salesAdded.filter((r) => r.customerId === customer.id).map((r) => salesEdits[r.id] ?? r);
            const all = [...added, ...base].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
            const productOptions = Array.from(new Set([...SALES_PRODUCTS, ...all.map((r) => r.record)])).sort();
            const salesFiltering = !!(salesQ || salesStage !== "All" || salesFrom || salesTo);
            const rows = all.filter((r) => {
              const q = salesQ.trim().toLowerCase();
              const qOk = !q || (`${r.id} ${r.record} ${r.subtitle} ${r.stage} ${r.value} ${r.owner} ${r.next} ${r.channel} ${r.probability}`).toLowerCase().includes(q);
              const sOk = salesStage === "All" || r.stage === salesStage;
              const day = r.dateISO.slice(0, 10);
              const fOk = !salesFrom || day >= salesFrom;
              const tOk = !salesTo || day <= salesTo;
              return qOk && sOk && fOk && tOk;
            });
            const totalPages = Math.max(1, Math.ceil(rows.length / salesPerPage));
            const pageC = Math.min(salesPage, totalPages);
            const startI = (pageC - 1) * salesPerPage;
            const pageRows = rows.slice(startI, startI + salesPerPage);
            const pipeline = all.filter((r) => r.stage === "Interested" || r.stage === "Follow-up" || r.stage === "Applied" || r.stage === "Approved").length;
            const completed = all.filter((r) => r.stage === "Completed").length;
            const rejected = all.filter((r) => r.stage === "Rejected").length;
            return (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Sales Activities</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Track products offered, applications, follow-ups, and successful sales.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Updated {salesRefreshedAt}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setSalesRefreshedAt("Jul 16, 2026 - 11:31 AM"); setToast({ message: "Sales activities refreshed", type: "info" }); }}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">
                      <Icon name="refresh" className="text-lg" /><span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button onClick={() => setSalesForm({ mode: "create", record: null })}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gold text-navy text-sm font-semibold rounded-lg hover:brightness-95">
                      <Icon name="add" className="text-lg" /><span className="hidden sm:inline">Add sales activity</span>
                    </button>
                  </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatTile label="Total activities" value={all.length} />
                  <StatTile label="In pipeline" value={pipeline} cls={pipeline ? "text-amber-600" : "text-slate-900"} />
                  <StatTile label="Completed" value={completed} cls={completed ? "text-green-600" : "text-slate-900"} />
                  <StatTile label="Rejected" value={rejected} cls={rejected ? "text-red-600" : "text-slate-900"} />
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Filters */}
                  <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
                    <div className="relative w-48">
                      <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                      <input value={salesQ} onChange={(e) => { setSalesQ(e.target.value); setSalesPage(1); }} placeholder="Search sales activities…"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                    </div>
                    <select value={salesStage} onChange={(e) => { setSalesStage(e.target.value); setSalesPage(1); }}
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                      {["All", ...SALES_STAGES].map((s) => <option key={s} value={s}>{s === "All" ? "All stages" : s}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">From</span>
                      <input type="date" value={salesFrom} onChange={(e) => { setSalesFrom(e.target.value); setSalesPage(1); }}
                        className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                      <span className="text-xs font-medium text-slate-500">To</span>
                      <input type="date" value={salesTo} onChange={(e) => { setSalesTo(e.target.value); setSalesPage(1); }}
                        className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                    </div>
                    {salesFiltering && (
                      <button onClick={() => { setSalesQ(""); setSalesStage("All"); setSalesFrom(""); setSalesTo(""); setSalesPage(1); }}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">
                        <Icon name="close" className="text-base" />Clear
                      </button>
                    )}
                  </div>

                  {rows.length === 0 ? (
                    <EmptyState icon="sell" message={all.length === 0 ? "No sales activities for this customer" : "No records found — try changing the search or filters"} />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Activity date</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600">Product / activity</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Short description</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600">Sales stage</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell whitespace-nowrap">Potential value</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Sales owner</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden xl:table-cell">Next action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {pageRows.map((r) => (
                            <tr key={r.id} role="button" tabIndex={0}
                              onClick={() => setSalesSelected(r)}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSalesSelected(r); } }}
                              className="hover:bg-slate-50 cursor-pointer focus:outline-none focus:bg-primary-50/50">
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.date}</td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-800">{r.record}</div>
                                <div className="text-xs text-slate-400 font-mono">{r.id}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{r.subtitle}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${SALES_STAGE_STYLES[r.stage]}`}>{r.stage}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-700 font-medium hidden sm:table-cell whitespace-nowrap">{r.value}</td>
                              <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{r.owner}</td>
                              <td className="px-4 py-3 text-slate-500 hidden xl:table-cell">{r.next}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
                        <div className="text-slate-500">Showing {startI + 1}–{Math.min(startI + salesPerPage, rows.length)} of {rows.length}</div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-slate-500">
                            <span className="whitespace-nowrap">Rows per page</span>
                            <select value={salesPerPage} onChange={(e) => { setSalesPerPage(Number(e.target.value)); setSalesPage(1); }}
                              className="border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600">
                              {[8, 15, 30].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </label>
                          <div className="flex items-center gap-2">
                            <button disabled={pageC <= 1} onClick={() => setSalesPage(pageC - 1)} className={`px-2.5 py-1 rounded-md ${pageC <= 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Previous</button>
                            <span className="text-slate-500">Page {pageC} of {totalPages}</span>
                            <button disabled={pageC >= totalPages} onClick={() => setSalesPage(pageC + 1)} className={`px-2.5 py-1 rounded-md ${pageC >= totalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Next</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* --- Mini App (mini app activity / investigation view) --- */}
          {tab === "Mini App" && (() => {
            const all = (customer.miniApps ?? []).map((r) => miniEdits[r.id] ?? r)
              .sort((a, b) => b.dateISO.localeCompare(a.dateISO));
            const miniFiltering = !!(miniQ || miniStatus !== "All" || miniFrom || miniTo);
            const rows = all.filter((r) => {
              const q = miniQ.trim().toLowerCase();
              const qOk = !q || (`${r.id} ${r.sessionId} ${r.record} ${r.category} ${r.provider} ${r.transactionReference ?? ""} ${r.stage} ${r.navigationPath.join(" ")}`).toLowerCase().includes(q);
              const sOk = miniStatus === "All" || r.stage === miniStatus;
              const day = r.dateISO.slice(0, 10);
              const fOk = !miniFrom || day >= miniFrom;
              const tOk = !miniTo || day <= miniTo;
              return qOk && sOk && fOk && tOk;
            });
            const totalPages = Math.max(1, Math.ceil(rows.length / miniPerPage));
            const pageC = Math.min(miniPage, totalPages);
            const startI = (pageC - 1) * miniPerPage;
            const pageRows = rows.slice(startI, startI + miniPerPage);
            return (
              <div className="space-y-5">
                {/* Header — no create button for this tab (investigation-only) */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Mini App Activity</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Track customer navigation, screens viewed, clicks, outcomes, consent, and linked records inside mobile-banking mini apps.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Updated {miniRefreshedAt}</p>
                  </div>
                  <button onClick={() => { setMiniRefreshedAt("Jul 16, 2026 - 11:31 AM"); setToast({ message: "Mini app activity refreshed", type: "info" }); }}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">
                    <Icon name="refresh" className="text-lg" /><span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Filters */}
                  <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
                    <div className="relative w-64">
                      <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                      <input value={miniQ} onChange={(e) => { setMiniQ(e.target.value); setMiniPage(1); }} placeholder="Search mini app, session, or reference"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                    </div>
                    <select value={miniStatus} onChange={(e) => { setMiniStatus(e.target.value); setMiniPage(1); }}
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                      {["All", ...MINI_STATUSES].map((s) => <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">From</span>
                      <input type="date" value={miniFrom} onChange={(e) => { setMiniFrom(e.target.value); setMiniPage(1); }}
                        className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                      <span className="text-xs font-medium text-slate-500">To</span>
                      <input type="date" value={miniTo} onChange={(e) => { setMiniTo(e.target.value); setMiniPage(1); }}
                        className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                    </div>
                    {miniFiltering && (
                      <button onClick={() => { setMiniQ(""); setMiniStatus("All"); setMiniFrom(""); setMiniTo(""); setMiniPage(1); }}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">
                        <Icon name="close" className="text-base" />Clear
                      </button>
                    )}
                  </div>

                  {rows.length === 0 ? (
                    <EmptyState icon="apps" message={all.length === 0 ? "No mini app activity for this customer" : "No sessions match your filters"} />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Session start</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600">Mini app</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Category</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell whitespace-nowrap">Session duration</th>
                            <th className="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Transaction amount</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600">Session status</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden xl:table-cell">Final result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {pageRows.map((r) => (
                            <tr key={r.id} role="button" tabIndex={0} title="View details"
                              onClick={() => setMiniSelected(r)}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setMiniSelected(r); } }}
                              className="hover:bg-slate-50 cursor-pointer focus:outline-none focus:bg-primary-50/50">
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.date}</td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-800">{r.record}</div>
                                <div className="text-xs text-slate-400 font-mono">{r.id}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{r.category}</td>
                              <td className="px-4 py-3 text-slate-600 hidden lg:table-cell whitespace-nowrap">{r.duration}</td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">{r.value == null ? "-" : formatMoney(r.value, r.currency ?? "USD")}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${MINI_STATUS_STYLES[r.stage]}`}>{r.stage}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-500 hidden xl:table-cell">{r.finalOutcome}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
                        <div className="text-slate-500">Showing {startI + 1}–{Math.min(startI + miniPerPage, rows.length)} of {rows.length}</div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-slate-500">
                            <span className="whitespace-nowrap">Rows per page</span>
                            <select value={miniPerPage} onChange={(e) => { setMiniPerPage(Number(e.target.value)); setMiniPage(1); }}
                              className="border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600">
                              {[8, 15, 30].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </label>
                          <div className="flex items-center gap-2">
                            <button disabled={pageC <= 1} onClick={() => setMiniPage(pageC - 1)} className={`px-2.5 py-1 rounded-md ${pageC <= 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Previous</button>
                            <span className="text-slate-500">Page {pageC} of {totalPages}</span>
                            <button disabled={pageC >= totalPages} onClick={() => setMiniPage(pageC + 1)} className={`px-2.5 py-1 rounded-md ${pageC >= totalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Next</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* --- Cash ATM (ATM activity tracker) --- */}
          {tab === "Cash ATM" && (() => {
            const base = (customer.atm ?? []).map((r) => atmEdits[r.id] ?? r);
            const added = atmAdded.filter((r) => r.customerId === customer.id).map((r) => atmEdits[r.id] ?? r);
            const all = [...added, ...base].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
            const atmFiltering = !!(atmQ || atmStatus !== "All" || atmFrom || atmTo);
            const rows = all.filter((r) => {
              const q = atmQ.trim().toLowerCase();
              const qOk = !q || (`${r.id} ${r.record} ${r.location} ${r.account} ${r.card} ${r.value} ${r.fee} ${r.stage}`).toLowerCase().includes(q);
              const sOk = atmStatus === "All" || r.stage === atmStatus;
              const day = r.dateISO.slice(0, 10);
              const fOk = !atmFrom || day >= atmFrom;
              const tOk = !atmTo || day <= atmTo;
              return qOk && sOk && fOk && tOk;
            });
            const totalPages = Math.max(1, Math.ceil(rows.length / atmPerPage));
            const pageC = Math.min(atmPage, totalPages);
            const startI = (pageC - 1) * atmPerPage;
            const pageRows = rows.slice(startI, startI + atmPerPage);
            const cashOut = all.filter((r) => r.stage === "Completed" && /withdrawal/i.test(r.record)).reduce((s, r) => s + r.value, 0);
            const fees = all.filter((r) => r.stage === "Completed").reduce((s, r) => s + r.fee, 0);
            const completed = all.filter((r) => r.stage === "Completed").length;
            const issues = all.filter((r) => r.stage === "Failed" || r.stage === "Reversed" || r.stage === "Disputed").length;
            return (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">ATM Activity</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Review ATM cash flow, transaction results, fees, reversals, and terminal location.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Updated {atmRefreshedAt}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setAtmRefreshedAt("Jul 16, 2026 - 11:31 AM"); setToast({ message: "ATM activity refreshed", type: "info" }); }}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">
                      <Icon name="refresh" className="text-lg" /><span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button onClick={() => setAtmForm({ mode: "create", record: null })}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gold text-navy text-sm font-semibold rounded-lg hover:brightness-95">
                      <Icon name="add" className="text-lg" /><span className="hidden sm:inline">Record ATM activity</span>
                    </button>
                  </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatTile label="Cash withdrawn" value={formatMoney(cashOut, "USD")} />
                  <StatTile label="Fees charged" value={formatMoney(fees, "USD")} />
                  <StatTile label="Completed" value={completed} />
                  <StatTile label="Failed / reversed" value={issues} cls={issues ? "text-red-600" : "text-slate-900"} />
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Filters */}
                  <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
                    <div className="relative w-48">
                      <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                      <input value={atmQ} onChange={(e) => { setAtmQ(e.target.value); setAtmPage(1); }} placeholder="Search ATM activity…"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                    </div>
                    <select value={atmStatus} onChange={(e) => { setAtmStatus(e.target.value); setAtmPage(1); }}
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                      {["All", ...ATM_RESULTS].map((s) => <option key={s} value={s}>{s === "All" ? "All results" : s}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">From</span>
                      <input type="date" value={atmFrom} onChange={(e) => { setAtmFrom(e.target.value); setAtmPage(1); }}
                        className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                      <span className="text-xs font-medium text-slate-500">To</span>
                      <input type="date" value={atmTo} onChange={(e) => { setAtmTo(e.target.value); setAtmPage(1); }}
                        className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                    </div>
                    {atmFiltering && (
                      <button onClick={() => { setAtmQ(""); setAtmStatus("All"); setAtmFrom(""); setAtmTo(""); setAtmPage(1); }}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">
                        <Icon name="close" className="text-base" />Clear
                      </button>
                    )}
                  </div>

                  {rows.length === 0 ? (
                    <EmptyState icon="atm" message={all.length === 0 ? "No ATM activity for this customer" : "No ATM activity matches your filters"} />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Transaction time</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600">ATM activity</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">ATM / location</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Account</th>
                            <th className="text-right px-4 py-3 font-semibold text-slate-600">Amount</th>
                            <th className="text-right px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Fee</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {pageRows.map((r) => (
                            <tr key={r.id} role="button" tabIndex={0}
                              onClick={() => setAtmSelected(r)}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAtmSelected(r); } }}
                              className="hover:bg-slate-50 cursor-pointer focus:outline-none focus:bg-primary-50/50">
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.date}</td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-800">{r.record}</div>
                                <div className="text-xs text-slate-400 font-mono">{r.id}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{r.location}</td>
                              <td className="px-4 py-3 text-slate-600 hidden md:table-cell font-mono text-xs">{r.account}</td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">{formatMoney(r.value, "USD")}</td>
                              <td className="px-4 py-3 text-right text-slate-600 hidden sm:table-cell whitespace-nowrap">{formatMoney(r.fee, "USD")}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${ATM_RESULT_STYLES[r.stage]}`}>{r.stage}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
                        <div className="text-slate-500">Showing {startI + 1}–{Math.min(startI + atmPerPage, rows.length)} of {rows.length}</div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-slate-500">
                            <span className="whitespace-nowrap">Rows per page</span>
                            <select value={atmPerPage} onChange={(e) => { setAtmPerPage(Number(e.target.value)); setAtmPage(1); }}
                              className="border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600">
                              {[8, 15, 30].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </label>
                          <div className="flex items-center gap-2">
                            <button disabled={pageC <= 1} onClick={() => setAtmPage(pageC - 1)} className={`px-2.5 py-1 rounded-md ${pageC <= 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Previous</button>
                            <span className="text-slate-500">Page {pageC} of {totalPages}</span>
                            <button disabled={pageC >= totalPages} onClick={() => setAtmPage(pageC + 1)} className={`px-2.5 py-1 rounded-md ${pageC >= totalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Next</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* --- CBC (Credit Bureau Cambodia report) --- */}
          {tab === "CBC" && (() => {
            const report = customer.creditReport;
            if (!report) return (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <EmptyState icon="fact_check" message="No CBC report on record for this customer." />
              </div>
            );
            const sum = report.accountSummary;
            const identity: { label: string; value: string; span?: boolean }[] = [
              { label: "ID Type", value: customer.idType },
              { label: "ID Number", value: customer.idNo },
              { label: "ID Expiry Date", value: formatDate(customer.idExpiry) },
              { label: "Date of Birth", value: formatDate(customer.dob) },
              { label: "Place of Birth", value: report.placeOfBirth },
              { label: "Gender", value: customer.gender },
              { label: "Marital Status", value: customer.marital },
              { label: "Nationality", value: customer.nationality },
              { label: "Address", value: customer.address, span: true },
            ];
            const legend: { c: CycleStatus; label: string }[] = [
              { c: "0", label: "Paid on time" }, { c: "30", label: "30 days late" },
              { c: "60", label: "60 days late" }, { c: "90+", label: "90+ days late" },
            ];
            return (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-900">{customer.name}</h2>
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${kScoreClass(report.kScore)}`}>K-Score {report.kScore}</span>
                </div>

                {/* Report Overview */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Report Overview</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                      <div className="text-sm text-slate-500">Prior Inquiries</div>
                      <div className="mt-1 text-lg font-bold text-slate-900">{report.inquiries.length}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                      <div className="text-sm text-slate-500">Total Credit Limit</div>
                      <div className="mt-1 text-lg font-bold text-slate-900">{formatMoney(report.totalCreditLimit, "USD")}</div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 shadow-sm p-4">
                      <div className="text-sm text-slate-500">Outstanding Liabilities</div>
                      <div className="mt-1 text-lg font-bold text-amber-700">{formatMoney(report.totalOutstandingLiabilities, "USD")}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                      <div className="text-sm text-slate-500">Accounts</div>
                      <div className="mt-1 text-sm font-semibold text-slate-800">
                        {sum.normal} Normal · {sum.delinquent} Delinquent<br />
                        {sum.closed} Closed · {sum.writeOff} Write-off
                      </div>
                    </div>
                  </div>
                </div>

                {/* Identity */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">Identity</h3>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                    {identity.map((f) => (
                      <div key={f.label} className={f.span ? "sm:col-span-2" : ""}>
                        <div className="text-xs text-slate-500">{f.label}</div>
                        <div className="mt-0.5 text-sm font-semibold text-slate-800">{f.value || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Account Details */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Account Details</h3>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {report.accounts.map((acc) => <CbcAccountCard key={acc.id} acc={acc} />)}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    {legend.map((l) => (
                      <span key={l.c} className="flex items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${CBC_CYCLE_STYLES[l.c]}`} /> {l.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Previous Inquiries */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Previous Inquiries</h3>
                  {report.inquiries.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                      <EmptyState icon="search_off" message="No inquiries on record." />
                    </div>
                  ) : (
                    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      {report.inquiries.map((inq, i) => (
                        <div key={inq.id} className={`flex items-center justify-between gap-4 px-4 py-3 ${i !== report.inquiries.length - 1 ? "border-b border-slate-100" : ""}`}>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{inq.institution}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{inq.productCategory} · {inq.applicantClassification} · {formatDate(inq.date)}</div>
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{formatMoney(inq.amount, "USD")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dishonored Checks — only when present */}
                {report.dishonoredChecks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Dishonored Checks</h3>
                    <div className="flex flex-col overflow-hidden rounded-xl border border-red-200">
                      {report.dishonoredChecks.map((chk, i) => (
                        <div key={chk.id} className={`flex items-center justify-between gap-4 bg-red-50 px-4 py-3 ${i !== report.dishonoredChecks.length - 1 ? "border-b border-red-200" : ""}`}>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{chk.checkNumber} · {chk.bank}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{chk.reason} · {formatDate(chk.date)}</div>
                          </div>
                          <span className="text-sm font-semibold text-red-600">{formatMoney(chk.amount, "USD")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-400">Report date: {formatDate(report.reportDate)}</p>
              </div>
            );
          })()}

          {/* --- Locations (read-only app-activity timeline) --- */}
          {tab === "Locations" && (() => {
            const events = customer.locations ?? [];
            const months = last12Months();
            const filtered = locMonth === "all" ? events : events.filter((e) => eventMonthKey(e) === locMonth);
            const focusEvent = filtered.find((e) => e.id === locEventId) ?? null;
            return (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">Where this customer opened the app over time, and what they used it for.</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-slate-900">{customer.name}</h2>
                  <select
                    value={locMonth}
                    onChange={(e) => { setLocMonth(e.target.value); setLocEventId(null); }}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
                  >
                    <option value="all">Last 12 Months</option>
                    {months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                </div>

                <LocationMap events={filtered} focus={focusEvent} />

                {events.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    <EmptyState icon="location_off" message="No recorded app activity for this customer." />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    <EmptyState icon="event_busy" message="No activity in this month." />
                  </div>
                ) : (
                  <ol className="border-l border-slate-200 pl-5">
                    {filtered.map((ev) => {
                      const isSelected = ev.id === locEventId;
                      return (
                        <li key={ev.id} className="relative pb-5 last:pb-0">
                          <span className={`absolute -left-5 top-[18px] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${isSelected ? "bg-gold" : "bg-slate-300"}`} />
                          <button
                            type="button"
                            onClick={() => setLocEventId(isSelected ? null : ev.id)}
                            className={`-mx-2 flex w-[calc(100%+0.5rem)] flex-col rounded-lg px-2 py-1.5 text-left transition-colors ${isSelected ? "bg-slate-100" : "hover:bg-slate-50"}`}
                          >
                            <span className="text-xs text-slate-500">{ev.time}</span>
                            <span className="mt-0.5 text-sm font-semibold text-slate-900">{ev.location}</span>
                            <span className="mt-0.5 text-sm text-slate-500">{ev.purpose} · {ev.device}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            );
          })()}

          {/* --- Gift Zone (read-only) --- */}
          {tab === "Gift Zone" && (() => {
            const gifts = customer.gifts ?? [];
            const totalSent = gifts.reduce((s, g) => s + g.amount, 0);
            return (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-slate-900">{customer.name}</h2>

                {gifts.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    <EmptyState icon="redeem" message="This customer hasn't sent any gifts yet." />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                        <div className="text-sm text-slate-500">Gifts Sent</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{gifts.length}</div>
                      </div>
                      <div className="border border-amber-200 bg-amber-50 rounded-xl shadow-sm p-5">
                        <div className="text-sm text-slate-500">Total Amount Sent</div>
                        <div className="mt-1 text-lg font-bold text-amber-700">{formatMoney(totalSent, "USD")}</div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-3">Gift History</h3>
                      <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        {gifts.map((g, i) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setSelectedGift(g)}
                            className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${i !== gifts.length - 1 ? "border-b border-slate-100" : ""}`}
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                To {g.recipientName} <span className="font-normal text-slate-500">· {g.occasion}</span>
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">{g.recipientPhone} · {g.date}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-slate-900">{formatMoney(g.amount, g.ccy)}</span>
                              <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${GIFT_STATUS_STYLES[g.status]}`}>{g.status}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* --- Reports (customer relationship packs) --- */}
          {tab === "Reports" && (() => {
            const base = customer.reports ?? [];
            const added = rptAdded.filter((r) => r.customerId === customer.id);
            const all = [...added, ...base];
            const ready = all.filter((r) => r.status === "Ready").length;
            const failed = all.filter((r) => r.status === "Failed").length;
            const rptFiltering = !!(rptQ || rptStatus !== "All" || rptFormat !== "All");
            const rows = all.filter((r) => {
              const q = rptQ.trim().toLowerCase();
              const qOk = !q || (`${r.id} ${r.title} ${r.format} ${r.generatedBy} ${r.packKey}`).toLowerCase().includes(q);
              const sOk = rptStatus === "All" || r.status === rptStatus;
              const fOk = rptFormat === "All" || r.format === rptFormat;
              return qOk && sOk && fOk;
            });
            const totalPages = Math.max(1, Math.ceil(rows.length / rptPerPage));
            const pageC = Math.min(rptPage, totalPages);
            const startI = (pageC - 1) * rptPerPage;
            const pageRows = rows.slice(startI, startI + rptPerPage);
            const download = (r: GeneratedReport) => {
              if (r.status !== "Ready") { setToast({ message: `Cannot download — report is ${r.status.toLowerCase()}`, type: "error" }); return; }
              const blob = new Blob([`WeCRM365 · ${r.title}\nCustomer: ${customer.name} (${customer.id})\nPeriod: ${r.dateFrom} → ${r.dateTo}\nGenerated: ${r.generatedAt} by ${r.generatedBy}\nFormat: ${r.format}\n\n(Demo placeholder — no real file content.)\n`], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = `${r.id}-${r.packKey}.${r.format.toLowerCase()}`; a.click();
              URL.revokeObjectURL(url);
              setToast({ message: `Downloaded ${r.title} (${r.format})`, type: "success" });
            };
            return (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Reports</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Generate and download customer relationship packs for RM visits, credit review, or branch handover.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Updated {rptRefreshedAt}</p>
                  </div>
                  <button onClick={() => { setRptRefreshedAt("Jul 16, 2026 - 11:31 AM"); setToast({ message: "Report history refreshed", type: "info" }); }}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">
                    <Icon name="refresh" className="text-lg" /><span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatTile label="Packs available" value={REPORT_PACKS.length} />
                  <StatTile label="Generated" value={all.length} />
                  <StatTile label="Ready" value={ready} cls={ready ? "text-green-600" : "text-slate-900"} />
                  <StatTile label="Failed" value={failed} cls={failed ? "text-red-600" : "text-slate-900"} />
                </div>

                {/* Catalog */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Report catalog</h3>
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {REPORT_PACKS.map((pack) => (
                      <div key={pack.key} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col">
                        <div className="flex items-start gap-3 mb-3">
                          <Icon name={pack.icon} className="text-primary-600 bg-primary-50 rounded-lg p-2 text-xl flex-none" />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900">{pack.title}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{pack.formats.join(" · ")} · last {pack.defaultRangeDays}d default</div>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 flex-1 mb-4">{pack.description}</p>
                        <button onClick={() => setRptForm(pack)}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">
                          <Icon name="file_download" className="text-lg" />Generate
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generation history */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm">Generation history</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Reports previously generated for this customer.</p>
                  </div>
                  <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
                    <div className="relative w-48">
                      <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                      <input value={rptQ} onChange={(e) => { setRptQ(e.target.value); setRptPage(1); }} placeholder="Search reports…"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                    </div>
                    <select value={rptStatus} onChange={(e) => { setRptStatus(e.target.value); setRptPage(1); }}
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                      {["All", "Ready", "Generating", "Failed"].map((s) => <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>)}
                    </select>
                    <select value={rptFormat} onChange={(e) => { setRptFormat(e.target.value); setRptPage(1); }}
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                      {["All", "PDF", "CSV"].map((s) => <option key={s} value={s}>{s === "All" ? "All formats" : s}</option>)}
                    </select>
                    {rptFiltering && (
                      <button onClick={() => { setRptQ(""); setRptStatus("All"); setRptFormat("All"); setRptPage(1); }}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">
                        <Icon name="close" className="text-base" />Clear
                      </button>
                    )}
                  </div>

                  {rows.length === 0 ? (
                    <EmptyState icon="description" message={all.length === 0 ? "No reports generated yet — pick a pack above" : "No reports match your filters"} />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Generated</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600">Report</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Period</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600">Format</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">By</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                            <th className="text-right px-4 py-3 font-semibold text-slate-600">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {pageRows.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.generatedAt}</td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-800">{r.title}</div>
                                <div className="text-xs text-slate-400 font-mono">{r.id} · {r.size}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-600 hidden md:table-cell whitespace-nowrap text-xs">{r.dateFrom} → {r.dateTo}</td>
                              <td className="px-4 py-3"><span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{r.format}</span></td>
                              <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{r.generatedBy}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${REPORT_STATUS_STYLES[r.status]}`}>{r.status}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => download(r)} disabled={r.status !== "Ready"}
                                  className={`inline-flex items-center gap-1 text-xs font-semibold ${r.status === "Ready" ? "text-primary-600 hover:text-primary-700" : "text-slate-300 cursor-not-allowed"}`}>
                                  <Icon name="download" className="text-base" />Download
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
                        <div className="text-slate-500">Showing {startI + 1}–{Math.min(startI + rptPerPage, rows.length)} of {rows.length}</div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-slate-500">
                            <span className="whitespace-nowrap">Rows per page</span>
                            <select value={rptPerPage} onChange={(e) => { setRptPerPage(Number(e.target.value)); setRptPage(1); }}
                              className="border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600">
                              {[8, 15, 30].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </label>
                          <div className="flex items-center gap-2">
                            <button disabled={pageC <= 1} onClick={() => setRptPage(pageC - 1)} className={`px-2.5 py-1 rounded-md ${pageC <= 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Previous</button>
                            <span className="text-slate-500">Page {pageC} of {totalPages}</span>
                            <button disabled={pageC >= totalPages} onClick={() => setRptPage(pageC + 1)} className={`px-2.5 py-1 rounded-md ${pageC >= totalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Next</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* --- Tabs added to nav; detailed content not built yet --- */}
          {PLACEHOLDER_TABS.includes(tab) && (
            <div className="bg-white border border-slate-200 rounded-xl">
              <EmptyState icon="construction" message={`${tab} — coming soon`} />
            </div>
          )}
        </div>
      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {atmSelected && (
        <AtmDrawer
          record={atmSelected}
          onClose={() => setAtmSelected(null)}
          onEdit={() => { setAtmForm({ mode: "edit", record: atmSelected }); setAtmSelected(null); }}
        />
      )}

      {atmForm && (
        <AtmForm
          mode={atmForm.mode}
          initial={atmForm.record}
          customerId={customer.id}
          nextId={`ATM-TXN-${atmSeq}`}
          updatedBy={CURRENT_USER.name}
          onClose={() => setAtmForm(null)}
          onSubmit={(rec) => {
            if (atmForm.mode === "edit") {
              setAtmEdits((m) => ({ ...m, [rec.id]: rec }));
              setToast({ message: `ATM record ${rec.id} updated`, type: "success" });
            } else {
              setAtmAdded((a) => [rec, ...a]);
              setAtmSeq((n) => n + 1);
              setToast({ message: `ATM activity ${rec.id} recorded`, type: "success" });
            }
            setAtmForm(null);
          }}
        />
      )}

      {callSelected && (
        <CallDrawer
          record={callSelected}
          onClose={() => setCallSelected(null)}
          onEdit={() => { setCallForm({ mode: "edit", record: callSelected }); setCallSelected(null); }}
        />
      )}

      {callForm && (
        <CallForm
          mode={callForm.mode}
          initial={callForm.record}
          customerId={customer.id}
          nextId={`CALL-2026-${String(callSeq).padStart(5, "0")}`}
          updatedBy={CURRENT_USER.name}
          defaultPhone={customer.phone}
          onClose={() => setCallForm(null)}
          onSubmit={(rec) => {
            if (callForm.mode === "edit") {
              setCallEdits((m) => ({ ...m, [rec.id]: rec }));
              setToast({ message: `Call record ${rec.id} updated`, type: "success" });
            } else {
              setCallAdded((a) => [rec, ...a]);
              setCallSeq((n) => n + 1);
              setToast({ message: `Call activity ${rec.id} logged`, type: "success" });
            }
            setCallForm(null);
          }}
        />
      )}

      {cmpSelected && (
        <ComplaintDrawer
          record={cmpSelected}
          onClose={() => setCmpSelected(null)}
          onEdit={() => { setCmpForm({ mode: "edit", record: cmpSelected }); setCmpSelected(null); }}
        />
      )}

      {cmpForm && (
        <ComplaintForm
          mode={cmpForm.mode}
          initial={cmpForm.record}
          customerId={customer.id}
          nextId={`CMP-2026-${String(cmpSeq).padStart(5, "0")}`}
          updatedBy={CURRENT_USER.name}
          onClose={() => setCmpForm(null)}
          onSubmit={(rec) => {
            if (cmpForm.mode === "edit") {
              setCmpEdits((m) => ({ ...m, [rec.id]: rec }));
              setToast({ message: `Complaint ${rec.id} updated`, type: "success" });
            } else {
              setCmpAdded((a) => [rec, ...a]);
              setCmpSeq((n) => n + 1);
              setToast({ message: `Complaint ${rec.id} created`, type: "success" });
            }
            setCmpForm(null);
          }}
        />
      )}

      {miniSelected && (
        <MiniAppDrawer
          record={miniSelected}
          onClose={() => setMiniSelected(null)}
          onInvestigate={() => { setMiniForm(miniSelected); setMiniSelected(null); }}
        />
      )}

      {miniForm && (
        <MiniAppForm
          initial={miniForm}
          updatedBy={CURRENT_USER.name}
          onClose={() => setMiniForm(null)}
          onSubmit={(rec) => {
            setMiniEdits((m) => ({ ...m, [rec.id]: rec }));
            setToast({ message: `Investigation updates saved for ${rec.id}`, type: "success" });
            setMiniForm(null);
          }}
        />
      )}

      {salesSelected && (
        <SalesDrawer
          record={salesSelected}
          onClose={() => setSalesSelected(null)}
          onEdit={() => { setSalesForm({ mode: "edit", record: salesSelected }); setSalesSelected(null); }}
        />
      )}

      {salesForm && (
        <SalesForm
          mode={salesForm.mode}
          initial={salesForm.record}
          customerId={customer.id}
          nextId={`SAL-2026-${String(salesSeq).padStart(5, "0")}`}
          updatedBy={CURRENT_USER.name}
          productOptions={Array.from(new Set([
            ...SALES_PRODUCTS,
            ...(customer.sales ?? []).map((r) => r.record),
            ...salesAdded.filter((r) => r.customerId === customer.id).map((r) => r.record),
          ])).sort()}
          onClose={() => setSalesForm(null)}
          onSubmit={(rec) => {
            if (salesForm.mode === "edit") {
              setSalesEdits((m) => ({ ...m, [rec.id]: rec }));
              setToast({ message: `Sales activity ${rec.id} updated`, type: "success" });
            } else {
              setSalesAdded((a) => [rec, ...a]);
              setSalesSeq((n) => n + 1);
              setToast({ message: `Sales activity ${rec.id} created`, type: "success" });
            }
            setSalesForm(null);
          }}
        />
      )}

      {ibSelected && (
        <IbActivityDrawer record={ibSelected} onClose={() => setIbSelected(null)} />
      )}

      {mbSelected && (
        <MbActivityDrawer record={mbSelected} onClose={() => setMbSelected(null)} />
      )}

      {rptForm && (
        <ReportGenerateForm
          pack={rptForm}
          customerId={customer.id}
          nextId={`RPT-2026-${String(rptSeq).padStart(5, "0")}`}
          generatedBy={CURRENT_USER.name}
          onClose={() => setRptForm(null)}
          onSubmit={(rec) => {
            setRptAdded((a) => [rec, ...a]);
            setRptSeq((n) => n + 1);
            setRptForm(null);
            setToast({ message: `${rec.title} generated (${rec.format})`, type: "success" });
          }}
        />
      )}

      {selectedGift && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 modal-enter"
          onClick={() => setSelectedGift(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 modal-enter"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-bold text-slate-900">To {selectedGift.recipientName}</p>
                <p className="mt-0.5 text-sm text-slate-500">{selectedGift.recipientPhone} · {selectedGift.date}</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelectedGift(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-amber-50 px-3 py-2.5">
              <span className="text-sm text-slate-600">{selectedGift.occasion}</span>
              <span className="text-lg font-bold text-amber-700">{formatMoney(selectedGift.amount, selectedGift.ccy)}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              <Info label="Reference ID" value={selectedGift.referenceId} />
              <Info label="Method" value={selectedGift.method} />
              <Info label="Fee" value={selectedGift.fee === 0 ? "Free" : formatMoney(selectedGift.fee, selectedGift.ccy)} />
              <div>
                <div className="text-xs font-medium text-slate-500 mb-1">Status</div>
                <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${GIFT_STATUS_STYLES[selectedGift.status]}`}>{selectedGift.status}</span>
              </div>
            </div>

            {selectedGift.message && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <div className="text-xs font-medium text-slate-500 mb-1">Message</div>
                <p className="text-sm italic text-slate-700">&ldquo;{selectedGift.message}&rdquo;</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
