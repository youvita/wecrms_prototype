"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CUSTOMERS, TRANSACTIONS, CURRENT_USER } from "@/lib/data";
import { formatDate, formatMoney, getInitial, segmentLabel } from "@/lib/format";
import { Badge, EmptyState, Icon, Toast, type ToastMsg } from "@/components/ui";
import type { Customer, CorporateFacet } from "@/lib/types";

const TABS = [
  "Customer Information", "Accounts", "Payments", "Fixed Deposits", "Cards", "Loans", "Investments", "Insurances",
  "Locations", "Sales Activities", "Call Center", "Compliance", "CBC", "Reminder", "Merchants",
  "Internet Banking", "Mobile Banking", "Cash ATM", "Mini App", "Gift Zone", "Loyalty Points", "Reports", "Security", "Audit Logs",
] as const;
// Tabs added to the navigation but whose detailed content is not built yet.
const PLACEHOLDER_TABS: readonly string[] = [
  "Locations", "Sales Activities", "Call Center", "Compliance", "CBC", "Reminder", "Merchants",
  "Cash ATM", "Mini App", "Gift Zone", "Loyalty Points", "Reports",
];
const AUDIT_CATEGORIES = ["All", "Profile", "Access", "Servicing", "Consent & docs", "Security", "Approvals"];
const TXN_CHANNELS = ["All", "KHQR", "Bakong", "Transfer", "Bill"] as const;
type Tab = (typeof TABS)[number];

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
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

// Deterministic mobile-banking login history with location tracking.
const MB_LOCATIONS = [
  { city: "Phnom Penh · KH", ip: "116.212", foreign: false },
  { city: "Toul Kork, Phnom Penh · KH", ip: "10.2", foreign: false },
  { city: "Siem Reap · KH", ip: "175.100", foreign: false },
  { city: "Battambang · KH", ip: "203.144", foreign: false },
  { city: "Bangkok · TH", ip: "184.22", foreign: true },
];
type MbLogin = { id: string; ts: string; method: string; device: string; city: string; ip: string; foreign: boolean; result: "Success" | "Failed" | "Blocked" };
function mobileLogins(cif: string, deviceName: string): MbLogin[] {
  const seed = parseInt(cif.replace(/\D/g, "").slice(-4) || "1", 10);
  const count = 18 + (seed % 18); // 18–35 logins over the period
  const base = new Date("2026-07-15");
  return Array.from({ length: count }, (_, i) => {
    const loc = MB_LOCATIONS[(seed + i * 2) % MB_LOCATIONS.length];
    const d = new Date(base); d.setDate(base.getDate() - Math.floor((i * 29) / count));
    const method = (["Biometric", "PIN", "OTP"] as const)[(seed + i) % 3];
    const result: MbLogin["result"] = loc.foreign && i % 3 === 0 ? "Blocked" : ((seed + i) % 9 === 4 ? "Failed" : "Success");
    return {
      id: `MBL-${seed}${i}`,
      ts: `${d.toISOString().slice(0, 10)} ${String(7 + (i * 3) % 15).padStart(2, "0")}:${String((seed * 7 + i * 11) % 60).padStart(2, "0")}`,
      method, device: deviceName, city: loc.city,
      ip: `${loc.ip}.${(seed + i) % 254}.${(seed * 3 + i) % 254}`, foreign: loc.foreign, result,
    };
  });
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

  const [tab, setTab] = React.useState<Tab>("Customer Information");
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
  const [mblPage, setMblPage] = React.useState(1);              // Mobile login-history pagination
  const [mblPerPage, setMblPerPage] = React.useState(6);
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
  const acctTotals = casaAccounts.reduce((m, a) => { m[a.ccy] = (m[a.ccy] || 0) + a.balance; return m; }, {} as Record<string, number>);
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
        <span className="font-semibold text-slate-800">{customer.id}</span>
      </div>

      {kycOverdue && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-2.5 mb-4">
          <Icon name="warning" className="text-amber-500 text-lg" />
          <span><b>KYC review due</b> — this customer's periodic KYC refresh is overdue{customer.kyc === "Review due" ? "" : ` (cycle ended ${formatDate(kycReview)})`}.</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5 items-start">
        {/* ===== Customer passport rail ===== */}
        <div className="space-y-4 xl:sticky xl:top-20">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full text-white flex items-center justify-center text-3xl font-extrabold"
                style={{ background: "linear-gradient(135deg,#4E4841,#201D1A)" }}>
                {isCorp ? <Icon name="corporate_fare" className="text-4xl" /> : getInitial(customer.name)}
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 mt-3 leading-tight">{customer.name}</h2>
              <div className="font-khmer text-slate-500 text-sm">{customer.khmerName}</div>
              <div className="text-xs text-slate-400 mt-0.5">{customer.id}</div>
              <div className="flex gap-1.5 mt-2 flex-wrap justify-center">
                <Badge label={customer.kyc} />
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.segment === "Affluent" ? "bg-purple-100 text-purple-800" : customer.segment === "SME" ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-700"}`}>{segmentLabel(customer.segment)}</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${lifecycle === "Active" ? "bg-green-100 text-green-700" : lifecycle === "Dormant" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{lifecycle}</span>
              </div>
            </div>

            <div className="mt-5 space-y-2 text-sm">
              {[
                ["Branch", customer.branch],
                ["Nationality", customer.nationality],
                ["Mobile", customer.phone],
                ["Customer since", formatDate(customer.joined)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-dashed border-slate-100 pb-1.5">
                  <span className="text-slate-400 text-xs pt-0.5">{k}</span>
                  <span className="font-semibold text-slate-700 text-right text-xs pt-0.5">{v}</span>
                </div>
              ))}
            </div>

          </div>

          {/* Relationship value */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Relationship value</h3>
            <div className="text-2xl font-extrabold text-slate-900">{formatMoney(Math.round(aum), "USD")}</div>
            <div className="text-xs text-slate-400">Deposits + investments (USD)</div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-sm">
              <span className="text-slate-500">Loans outstanding</span>
              <span className="font-semibold text-slate-800">{loanOut > 0 ? formatMoney(Math.round(loanOut), "USD") : "—"}</span>
            </div>
          </div>

          {/* Holdings — grouped by category */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Product holdings</h3>
            {customer.accounts.length + customer.cards.length + customer.loans.length === 0 ? (
              <span className="text-xs text-slate-400">No products yet</span>
            ) : (
              <div className="space-y-3">
                {([
                  { title: "Accounts", items: casaAccounts.map((a) => acctLabel(a.type, a.ccy)) },
                  { title: "Fixed Deposits", items: termDeposits.map((a) => acctLabel(a.type, a.ccy)) },
                  { title: "Cards", items: customer.cards.map((cd) => cd.type) },
                  { title: "Loans", items: customer.loans.map((l) => l.product) },
                ] as const).filter((g) => g.items.length > 0).map((g) => (
                  <div key={g.title}>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">{g.title}</div>
                    <ul className="space-y-1">
                      {g.items.map((label, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-700">
                          <span className="text-slate-300 leading-5">•</span>
                          <span>{label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* E-banking services — service / status list */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">E-banking & services</h3>
            <div className="divide-y divide-slate-100">
              {["Mobile Banking", "smartBiz", "Virtual Acc.", "SMS Alert", "Debit Card", "Platinum Credit"].map((s) => {
                const on = customer.ebanking.includes(s) || (s === "Debit Card" && customer.ebanking.includes("Credit Card"));
                return (
                  <div key={s} className="flex items-center justify-between py-1.5 text-sm">
                    <span className={on ? "text-slate-700 font-medium" : "text-slate-400"}>{s}</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${on ? "text-green-700" : "text-slate-400"}`}>
                      <Icon name={on ? "check_circle" : "cancel"} className={`text-sm ${on ? "text-green-500" : "text-slate-300"}`} />
                      {on ? "Active" : "Not enabled"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Services in use — what this customer currently uses (the CRM lens) */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm">Services in use</h3>
              <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 rounded-full px-2 py-0.5">{usedCount}/{servicesInUse.length}</span>
            </div>
            <div className="space-y-2.5">
              {servicesInUse.map((s) => (
                <div key={s.name} className="flex items-center gap-2.5 text-sm">
                  <Icon name={s.icon} className={`text-lg ${s.on ? "text-primary-600" : "text-slate-300"}`} />
                  <span className={`flex-1 ${s.on ? "text-slate-700 font-medium" : "text-slate-400"}`}>{s.name}</span>
                  {s.on
                    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><Icon name="check_circle" className="text-green-500 text-sm" />{s.detail}</span>
                    : <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">Offer</span>}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ===== Main working area ===== */}
        <div className="space-y-5 min-w-0">
          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${tab === t ? "bg-gold text-navy shadow" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                {t}
              </button>
            ))}
          </div>

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
          {tab === "Accounts" && (
            <div className="space-y-5">
            <Section title="Current & savings accounts">
              {casaAccounts.length === 0 ? <EmptyState icon="account_balance_wallet" message="No current or savings accounts" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Account no.</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Product</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Currency</th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-600">Balance</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {casaAccounts.map((a) => (
                        <tr key={a.no} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-slate-700">{a.no}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{a.type}</td>
                          <td className="px-4 py-3">{a.ccy}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatMoney(a.balance, a.ccy)}</td>
                          <td className="px-4 py-3 text-slate-500">{a.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {casaAccounts.length > 0 && (
                <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 mt-4 pt-3 border-t border-slate-100 text-sm">
                  <span className="text-slate-500">Total balance:</span>
                  {Object.entries(acctTotals).map(([ccy, v]) => (
                    <span key={ccy} className="font-bold text-slate-900">{formatMoney(v, ccy as "USD" | "KHR")}</span>
                  ))}
                </div>
              )}
            </Section>

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
          )}

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
            customer.loans.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl">
                <EmptyState icon="account_balance" message="No active loans" />
              </div>
            ) : (
              <div className="space-y-4">
                {customer.loans.map((l) => (
                  <div key={l.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div>
                        <div className="font-bold text-slate-900">{l.product} <span className="text-slate-400 font-normal text-sm">· {l.id}</span></div>
                        <div className="text-sm text-slate-500">Rate {l.rate} · Next due {l.nextDue}</div>
                      </div>
                      <Badge label={l.status} />
                    </div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-slate-500">Outstanding</span>
                      <span className="font-semibold">{formatMoney(l.outstanding, l.ccy)} of {formatMoney(l.amount, l.ccy)}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-600 rounded-full" style={{ width: `${(1 - l.outstanding / l.amount) * 100}%` }} />
                    </div>

                    {l.status.includes("DPD") && (
                      <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
                        <Icon name="warning" className="text-red-500 text-base" /> In arrears — {l.status}. Collections workflow applies.
                      </div>
                    )}

                    <div className="mt-4">
                      <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Repayment schedule</h4>
                      {(() => {
                        const monthly = Math.max(50, Math.round(l.outstanding / 24));
                        const base = new Date(l.nextDue);
                        const valid = !isNaN(base.getTime());
                        return (
                          <div className="divide-y divide-slate-100 text-sm">
                            {[0, 1, 2].map((k) => {
                              const d = valid ? new Date(base.getFullYear(), base.getMonth() + k, base.getDate()) : null;
                              return (
                                <div key={k} className="py-2 flex items-center justify-between">
                                  <span className="text-slate-500">{d ? formatDate(d.toISOString().slice(0, 10)) : l.nextDue}{k === 0 && <span className="ml-2 text-[10px] font-semibold text-primary-700 bg-primary-50 rounded px-1.5 py-0.5">Next</span>}</span>
                                  <span className="font-semibold text-slate-800">{formatMoney(monthly, l.ccy)}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* --- Investments (read-only) --- */}
          {tab === "Investments" && (
            <div className="grid gap-5">
              <Section title="Investments">
                <div className="pb-4 mb-4 border-b border-slate-100">
                  <Info label="Account holder (full name)" value={customer.name} />
                </div>
                {customer.investments.length === 0 ? (
                  <EmptyState icon="trending_up" message="No investments" />
                ) : (
                  <>
                    <div className="flex items-center justify-between pb-3 mb-1 border-b border-slate-100">
                      <span className="text-xs text-slate-400 uppercase tracking-wide">Portfolio value</span>
                      <span className="text-lg font-extrabold text-slate-900">{formatMoney(investTotal, "USD")}</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {customer.investments.map((iv, i) => (
                        <div key={i} className="py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-800">{iv.type}</div>
                            <div className="text-xs text-slate-400">{iv.detail}</div>
                          </div>
                          <div className="text-right flex-none">
                            <div className="text-sm font-bold text-slate-900">{formatMoney(iv.value, "USD")}</div>
                            <div className="text-[11px] text-slate-400">{investTotal ? Math.round((iv.value / investTotal) * 100) : 0}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Section>
            </div>
          )}

          {/* --- Insurances (read-only) --- */}
          {tab === "Insurances" && (
            <div className="grid gap-5">
              <Section title="Insurance policies">
                <div className="pb-4 mb-4 border-b border-slate-100">
                  <Info label="Policyholder (full name)" value={customer.name} />
                </div>
                {customer.insurance.length === 0 ? (
                  <EmptyState icon="health_and_safety" message="No policies" />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {customer.insurance.map((p, i) => {
                      const premNum = parseInt(p.premium.replace(/[^0-9]/g, "")) || 0;
                      return (
                        <div key={i} className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-800">{p.policy}</div>
                            <Badge label={p.status} />
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                            <div><div className="text-slate-400">Coverage</div><div className="font-semibold text-slate-700">~${(premNum * 1000).toLocaleString()}</div></div>
                            <div><div className="text-slate-400">Premium</div><div className="font-semibold text-slate-700">{p.premium}</div></div>
                            <div><div className="text-slate-400">Claims</div><div className="font-semibold text-slate-700">0 filed</div></div>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1.5">Renews {p.renewal}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
              <div className="bg-white border border-slate-200 rounded-xl"><EmptyState icon="desktop_windows" message="Not enrolled in Internet Banking" /></div>
            );
            const seed = parseInt(customer.id.replace(/\D/g, "").slice(-4) || "1", 10);
            const status = seed % 9 === 0 ? "Locked" : "Active";
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
            const sessions = [
              { br: "Chrome · Windows", loc: `${customer.branch.split(" ")[0]} · 10.2.${seed % 254}`, when: customer.devices[0]?.lastSeen ?? "Today" },
              ...(seed % 3 === 0 ? [{ br: "Safari · macOS", loc: `Remote · 116.212.${seed % 254}`, when: "Yesterday 18:20" }] : []),
            ];
            return (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon name="desktop_windows" className="text-primary-600 bg-primary-50 rounded-lg p-2 text-2xl" />
                  <div>
                    <div className="font-bold text-slate-900">Internet Banking</div>
                    <div className="text-xs text-slate-400">Login ID <b className="text-slate-600 font-mono">{loginId}</b> · enrolled {formatDate(customer.joined)}</div>
                  </div>
                </div>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${status === "Locked" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{status}</span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatTile label="Logins · 30d" value={20 + (seed % 40)} />
                <StatTile label="Failed attempts" value={seed % 4} cls={seed % 4 ? "text-amber-600" : "text-slate-900"} />
                <StatTile label="Active sessions" value={sessions.length} />
                <StatTile label="Daily transfer limit" value={formatMoney(dailyLimit, "USD")} />
              </div>

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

              <Section title="Active web sessions">
                <div className="divide-y divide-slate-100">
                  {sessions.map((s, i) => (
                    <div key={i} className="py-2.5 flex items-center gap-3">
                      <Icon name="language" className="text-primary-600 bg-primary-50 rounded-lg p-1.5 text-lg flex-none" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-800">{s.br}</div>
                        <div className="text-xs text-slate-400">{s.loc} · {s.when}</div>
                      </div>
                      <button onClick={() => setToast({ message: "Session terminated", type: "success" })}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1">Terminate</button>
                    </div>
                  ))}
                </div>
              </Section>

            </div>
            );
          })()}

          {/* --- Mobile Banking (channel view) --- */}
          {tab === "Mobile Banking" && (() => {
            const enrolled = customer.ebanking.includes("Mobile Banking");
            if (!enrolled) return (
              <div className="bg-white border border-slate-200 rounded-xl"><EmptyState icon="smartphone" message="Not enrolled in Mobile Banking" /></div>
            );
            const seed = parseInt(customer.id.replace(/\D/g, "").slice(-4) || "1", 10);
            const status = "Active";
            const device = customer.devices[0];
            const biometric = seed % 3 !== 0;
            const push = customer.ebanking.includes("SMS Alert") || seed % 2 === 0;
            const dailyLimit = customer.segment === "Affluent" ? 10000 : hasCorp ? 20000 : 3000;
            const usage = [
              { k: "KHQR payments", pct: 55 + (seed % 40) },
              { k: "Transfers", pct: 25 + (seed % 30) },
              { k: "Top-up & bills", pct: 10 + (seed % 25) },
            ];
            const logins = mobileLogins(customer.id, device?.name ?? "Device");
            const failedLogins = logins.filter((l) => l.result !== "Success").length;
            const foreignLogins = logins.filter((l) => l.foreign).length;
            const mblTotalPages = Math.max(1, Math.ceil(logins.length / mblPerPage));
            const mblPageC = Math.min(mblPage, mblTotalPages);
            const mblStart = (mblPageC - 1) * mblPerPage;
            const mblRows = logins.slice(mblStart, mblStart + mblPerPage);
            return (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon name="smartphone" className="text-primary-600 bg-primary-50 rounded-lg p-2 text-2xl" />
                  <div>
                    <div className="font-bold text-slate-900">Mobile Banking</div>
                    <div className="text-xs text-slate-400">App v4.8.{seed % 9} · last login {device?.lastSeen ?? "—"} ({biometric ? "biometric" : "PIN"})</div>
                  </div>
                </div>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">{status}</span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatTile label="Logins · 30d" value={logins.length} />
                <StatTile label="Failed logins" value={failedLogins} cls={failedLogins ? "text-red-600" : "text-slate-900"} />
                <StatTile label="Foreign logins" value={foreignLogins} cls={foreignLogins ? "text-amber-600" : "text-slate-900"} />
                <StatTile label="Daily in-app limit" value={formatMoney(dailyLimit, "USD")} />
              </div>

              <Section title="Bound device">
                <div className="flex items-center gap-3">
                  <Icon name="phone_iphone" className="text-primary-600 bg-primary-50 rounded-lg p-2 text-2xl flex-none" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800">{device?.name ?? "—"}</div>
                    <div className="text-xs text-slate-400">Bound to {customer.phone} · last seen {device?.lastSeen ?? "—"}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${device?.trusted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{device?.trusted ? "Trusted" : "Pending"}</span>
                  <button onClick={() => setToast({ message: "Device de-registered — customer must re-bind", type: "info" })}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1">De-register</button>
                </div>
              </Section>

              <div className="grid md:grid-cols-2 gap-5">
                <Section title="Authentication & alerts">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span className="text-slate-600">Biometric login</span><OnOff on={biometric} /></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">PIN / passcode</span><OnOff on={true} /></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">Push notifications</span><OnOff on={push} /></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">SMS alerts</span><OnOff on={customer.ebanking.includes("SMS Alert")} /></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">Single-device binding</span><OnOff on={true} /></div>
                  </div>
                </Section>
                <Section title="Feature usage · 30d">
                  <div className="space-y-3">
                    {usage.map((u) => (
                      <div key={u.k}>
                        <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">{u.k}</span><span className="font-semibold text-slate-700">{Math.min(99, u.pct)}%</span></div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gold rounded-full" style={{ width: `${Math.min(99, u.pct)}%` }} /></div>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm border-t border-slate-100 pt-2"><span className="text-slate-600">Daily in-app limit</span><span className="font-semibold text-slate-800">{formatMoney(dailyLimit, "USD")}</span></div>
                  </div>
                </Section>
              </div>

              <Section title="Login history & location">
                <div className="divide-y divide-slate-100">
                  {mblRows.map((l) => (
                    <div key={l.id} className="py-2.5 flex items-center gap-3">
                      <Icon name={l.foreign ? "travel_explore" : "location_on"} className={`rounded-lg p-1.5 text-lg flex-none ${l.foreign ? "text-amber-600 bg-amber-50" : "text-primary-600 bg-primary-50"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-800 truncate">
                          {l.city}
                          {l.foreign && <span className="ml-2 text-[10px] font-semibold text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">Foreign</span>}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{l.method} · {l.device} · IP {l.ip}</div>
                      </div>
                      <div className="text-right flex-none">
                        <div className="text-xs text-slate-500 whitespace-nowrap">{l.ts}</div>
                        <span className={`text-[10px] font-semibold ${l.result === "Success" ? "text-green-600" : l.result === "Blocked" ? "text-red-600" : "text-amber-600"}`}>{l.result}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-1 border-t border-slate-100 text-sm">
                  <div className="text-slate-500">Showing {mblStart + 1}–{Math.min(mblStart + mblPerPage, logins.length)} of {logins.length} logins</div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-slate-500">
                      <span className="whitespace-nowrap">Rows per page</span>
                      <select value={mblPerPage} onChange={(e) => { setMblPerPage(Number(e.target.value)); setMblPage(1); }}
                        className="border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600">
                        {[6, 12, 24].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </label>
                    <div className="flex items-center gap-2">
                      <button disabled={mblPageC <= 1} onClick={() => setMblPage(mblPageC - 1)} className={`px-2.5 py-1 rounded-md ${mblPageC <= 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Previous</button>
                      <span className="text-slate-500">Page {mblPageC} of {mblTotalPages}</span>
                      <button disabled={mblPageC >= mblTotalPages} onClick={() => setMblPage(mblPageC + 1)} className={`px-2.5 py-1 rounded-md ${mblPageC >= mblTotalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Next</button>
                    </div>
                  </div>
                </div>
              </Section>

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

          {/* --- Tabs added to nav; detailed content not built yet --- */}
          {PLACEHOLDER_TABS.includes(tab) && (
            <div className="bg-white border border-slate-200 rounded-xl">
              <EmptyState icon="construction" message={`${tab} — coming soon`} />
            </div>
          )}
        </div>
      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
