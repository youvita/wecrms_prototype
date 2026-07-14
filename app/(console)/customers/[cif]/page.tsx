"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CUSTOMERS, TRANSACTIONS, CASES, CURRENT_USER } from "@/lib/data";
import { formatDate, formatMoney, getInitial } from "@/lib/format";
import { AiPanel, Badge, EmptyState, Icon } from "@/components/ui";

const TABS = ["Customer Info", "Activity", "Accounts & Deposits", "Cards", "Loans", "Invest & Insure", "Interactions", "Support", "Security"] as const;
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

// Read-only field (label + value). This is a view-only CRM.
function Info({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <div className="text-xs font-medium text-slate-500 mb-1">{label}</div>
      <div className="text-sm font-medium text-slate-800">{value || "—"}</div>
    </div>
  );
}

// KHR→USD for a single relationship-value figure (prototype rate).
const usd = (v: number, ccy: "USD" | "KHR") => (ccy === "KHR" ? v / 4100 : v);

// Card network derived from the product name (display only).
const cardNetwork = (t: string) =>
  /master/i.test(t) ? "Mastercard" : /union/i.test(t) ? "UnionPay" : /jcb/i.test(t) ? "JCB" : /visa/i.test(t) ? "Visa" : "Local scheme";

function OnOff({ on }: { on: boolean }) {
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${on ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{on ? "On" : "Off"}</span>;
}

// Deterministic demo values derived from the (masked) card number.
const cardExpiry = (no: string) => { const n = parseInt(no.replace(/\D/g, "").slice(-4) || "1", 10); return `${String((n % 12) + 1).padStart(2, "0")}/${28 + (n % 3)}`; };
const cardSpend = (no: string) => { const n = parseInt(no.replace(/\D/g, "").slice(-4) || "1", 10); return 200 + (n % 1800); };

export default function Customer360Page() {
  const params = useParams<{ cif: string }>();
  const customer = CUSTOMERS.find((x) => x.id === decodeURIComponent(params.cif)) ?? CUSTOMERS[0];

  const [tab, setTab] = React.useState<Tab>("Customer Info");
  const [actCh, setActCh] = React.useState<string>("All");

  const custTxns = TRANSACTIONS.filter((t) => t.customer === customer.name);
  const txns = custTxns.slice(0, 4);
  const inflow = custTxns.filter((t) => t.amount > 0).reduce((s, t) => s + usd(t.amount, t.ccy), 0);
  const outflow = custTxns.filter((t) => t.amount < 0).reduce((s, t) => s + usd(Math.abs(t.amount), t.ccy), 0);
  const channelMix = (["KHQR", "Bakong", "Transfer", "Bill"] as const).map((ch) => ({ ch, n: custTxns.filter((t) => t.channel === ch).length })).filter((c) => c.n > 0);
  const lifecycle = custTxns.length === 0 ? "Dormant" : custTxns.length >= 3 ? "Active" : "Low activity";
  const actRows = actCh === "All" ? custTxns : custTxns.filter((t) => t.channel === actCh);

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

  // Support cases linked to this customer (read-only).
  const cases = CASES.filter((c) => c.cif === customer.id);

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

  // Relationship value (view-only): deposits + investments (USD eq.) and loan exposure.
  const aum = customer.accounts.reduce((s, a) => s + usd(a.balance, a.ccy), 0) + customer.investments.reduce((s, i) => s + i.value, 0);
  const loanOut = customer.loans.reduce((s, l) => s + usd(l.outstanding, l.ccy), 0);

  // Tab summaries (view-only).
  const acctTotals = customer.accounts.reduce((m, a) => { m[a.ccy] = (m[a.ccy] || 0) + a.balance; return m; }, {} as Record<string, number>);
  const investTotal = customer.investments.reduce((s, i) => s + i.value, 0);
  const openCases = cases.filter((c) => !/resolved|closed|complete/i.test(c.status)).length;
  const slaBreaches = cases.filter((c) => c.slaState === "breach").length;
  const lastLogin = customer.devices[0]?.lastSeen ?? "—";
  const activeSessions = customer.devices.filter((d) => d.trusted).length;
  const tenureYears = Math.max(1, new Date().getFullYear() - new Date(customer.joined).getFullYear());
  const profileFields = [customer.name, customer.khmerName, customer.dob, customer.phone, customer.email, customer.address, customer.idNo, customer.occupation, customer.company, customer.incomeUSD];
  const completeness = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);
  const household = [
    ...(customer.company ? [{ rel: "Business", name: customer.company }] : []),
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

  const nextBestAction =
    customer.segment === "Affluent" ? "FD maturing soon — a 24-month renewal at 5.4% would retain this relationship before competitor rates land."
    : customer.segment === "SME" ? "High QR settlement volume — a merchant-financing pre-approval is a strong next-best offer."
    : "Eligible for a first credit card — pre-approved $500 limit based on 12-month savings behavior.";

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
                {getInitial(customer.name)}
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 mt-3 leading-tight">{customer.name}</h2>
              <div className="font-khmer text-slate-500 text-sm">{customer.khmerName}</div>
              <div className="text-xs text-slate-400 mt-0.5">{customer.id}</div>
              <div className="flex gap-1.5 mt-2 flex-wrap justify-center">
                <Badge label={customer.kyc} />
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.segment === "Affluent" ? "bg-purple-100 text-purple-800" : customer.segment === "SME" ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-700"}`}>{customer.segment}</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${lifecycle === "Active" ? "bg-green-100 text-green-700" : lifecycle === "Dormant" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{lifecycle}</span>
              </div>
            </div>

            <div className="mt-5 space-y-2 text-sm">
              {[
                ["Customer type", "Individual"],
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

            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="border border-slate-200 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Risk rating</div>
                <div className={`text-sm font-extrabold ${customer.risk === "High" ? "text-red-600" : customer.risk === "Medium" ? "text-amber-600" : "text-green-600"}`}>{customer.risk}</div>
              </div>
              <div className="border border-slate-200 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">ECDD</div>
                <div className="text-sm font-extrabold text-slate-800">{customer.ecdd}</div>
              </div>
            </div>
          </div>

          {/* Relationship value */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Relationship value</h3>
            <div className="text-2xl font-extrabold text-slate-900">{formatMoney(Math.round(aum), "USD")}</div>
            <div className="text-xs text-slate-400">Deposits + investments (USD eq.)</div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-sm">
              <span className="text-slate-500">Loans outstanding</span>
              <span className="font-semibold text-slate-800">{loanOut > 0 ? formatMoney(Math.round(loanOut), "USD") : "—"}</span>
            </div>
          </div>

          {/* Holdings */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Product holdings</h3>
            <div className="flex flex-wrap gap-1.5">
              {customer.accounts.map((a) => (
                <span key={a.no} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-50 text-primary-800 text-xs font-semibold">
                  {a.type.split("·")[0].trim()} <span className="text-[10px] bg-gold text-navy rounded px-1">{a.ccy}</span>
                </span>
              ))}
              {customer.cards.map((cd) => (
                <span key={cd.no} className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">{cd.type}</span>
              ))}
              {customer.loans.map((l) => (
                <span key={l.id} className="inline-flex px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold">{l.product}</span>
              ))}
              {customer.accounts.length + customer.cards.length + customer.loans.length === 0 && (
                <span className="text-xs text-slate-400">No products yet</span>
              )}
            </div>
          </div>

          {/* E-banking services */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">E-banking & services</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {["Mobile Banking", "smartBiz", "Virtual Acc.", "SMS Alert", "Debit Card", "Platinum Credit"].map((s) => {
                const on = customer.ebanking.includes(s) || (s === "Debit Card" && customer.ebanking.includes("Credit Card"));
                return (
                  <div key={s} className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold text-center border ${on ? "border-primary-200 bg-primary-50 text-primary-700" : "border-slate-100 bg-slate-50 text-slate-300"}`}>
                    {s}
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

          {/* --- Customer Info (read-only) --- */}
          {tab === "Customer Info" && (
            <div className="space-y-5">
              <Section title="Basic information">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Info label="Full name (Latin)" value={customer.name} />
                  <Info label="Khmer name · ឈ្មោះខ្មែរ" value={customer.khmerName} />
                  <Info label="Date of birth" value={customer.dob} />
                  <Info label="Gender" value={customer.gender} />
                  <Info label="Marital status" value={customer.marital} />
                  <Info label="Nationality" value={customer.nationality} />
                </div>
              </Section>

              <Section title="Identification">
                <div className="grid sm:grid-cols-3 gap-4">
                  <Info label="ID type" value={customer.idType} />
                  <Info label="ID number" value={customer.idNo} />
                  <Info label="ID expiry date" value={customer.idExpiry} />
                </div>
              </Section>

              <Section title="Contact & address">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Info label="Mobile phone" value={customer.phone} />
                  <Info label="E-mail" value={customer.email} />
                  <Info label="Personal address" value={customer.address} span />
                </div>
              </Section>

              <Section title="Occupation & income">
                <div className="grid sm:grid-cols-3 gap-4">
                  <Info label="Occupation" value={customer.occupation} />
                  <Info label="Company name" value={customer.company} />
                  <Info label="Annual income (USD)" value={customer.incomeUSD != null ? `$${customer.incomeUSD.toLocaleString()}` : "—"} />
                </div>
              </Section>

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
                {household.length === 0 ? <p className="text-sm text-slate-400">No linked relationships</p> : (
                  <div className="divide-y divide-slate-100">
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

              <AiPanel title="Next best action">{nextBestAction}</AiPanel>

              <Section title="Recent transactions">
                {txns.length === 0 ? <EmptyState icon="receipt_long" message="No recent transactions" /> : (
                  <div className="divide-y divide-slate-100">
                    {txns.map((t) => (
                      <div key={t.id} className="py-2.5 flex items-center gap-3">
                        <Icon name={t.channel === "KHQR" ? "qr_code_2" : t.channel === "Bakong" ? "currency_exchange" : t.channel === "Bill" ? "receipt" : "swap_horiz"}
                          className="text-primary-600 bg-primary-50 rounded-lg p-1.5 text-xl" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-800 truncate">{t.type}</div>
                          <div className="text-xs text-slate-400 truncate">{t.counterparty} · {t.time}</div>
                        </div>
                        <div className={`text-sm font-semibold ${t.amount > 0 ? "text-green-600" : "text-slate-800"}`}>
                          {t.amount > 0 ? "+" : ""}{formatMoney(Math.abs(t.amount), t.ccy)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          )}

          {/* --- Activity / usage (read-only) --- */}
          {tab === "Activity" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Engagement</div>
                  <div className={`text-xl font-extrabold mt-1 ${lifecycle === "Active" ? "text-green-600" : lifecycle === "Dormant" ? "text-red-600" : "text-amber-600"}`}>{lifecycle}</div>
                  <div className="text-xs text-slate-400 mt-1">{custTxns.length} transactions on record</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Money in</div>
                  <div className="text-xl font-extrabold text-green-600 mt-1">{formatMoney(Math.round(inflow), "USD")}</div>
                  <div className="text-xs text-slate-400 mt-1">Credits (USD eq.)</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Money out</div>
                  <div className="text-xl font-extrabold text-slate-900 mt-1">{formatMoney(Math.round(outflow), "USD")}</div>
                  <div className="text-xs text-slate-400 mt-1">Debits (USD eq.)</div>
                </div>
              </div>

              {channelMix.length > 0 && (
                <Section title="Channel usage">
                  <div className="space-y-3">
                    {channelMix.map((c) => {
                      const pct = Math.round((c.n / custTxns.length) * 100);
                      return (
                        <div key={c.ch}>
                          <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">{c.ch}</span><span className="font-semibold text-slate-700">{c.n} · {pct}%</span></div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              <Section title="Transactions"
                action={
                  <div className="flex gap-1">
                    {TXN_CHANNELS.map((c) => (
                      <button key={c} onClick={() => setActCh(c)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${actCh === c ? "bg-gold text-navy" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{c}</button>
                    ))}
                  </div>
                }>
                {actRows.length === 0 ? <EmptyState icon="receipt_long" message="No transactions in this channel" /> : (
                  <div className="divide-y divide-slate-100">
                    {actRows.map((t) => (
                      <div key={t.id} className="py-2.5 flex items-center gap-3">
                        <Icon name={t.channel === "KHQR" ? "qr_code_2" : t.channel === "Bakong" ? "currency_exchange" : t.channel === "Bill" ? "receipt" : "swap_horiz"}
                          className="text-primary-600 bg-primary-50 rounded-lg p-1.5 text-xl flex-none" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-800 truncate">{t.type}</div>
                          <div className="text-xs text-slate-400 truncate">{t.counterparty} · {t.channel} · {t.time}</div>
                        </div>
                        <div className={`text-sm font-semibold flex-none ${t.amount > 0 ? "text-green-600" : "text-slate-800"}`}>
                          {t.amount > 0 ? "+" : ""}{formatMoney(Math.abs(t.amount), t.ccy)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          )}

          {/* --- Accounts & Deposits --- */}
          {tab === "Accounts & Deposits" && (
            <div className="space-y-5">
            <Section title="All accounts & deposits">
              {customer.accounts.length === 0 ? <EmptyState icon="account_balance_wallet" message="No accounts" /> : (
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
                      {customer.accounts.map((a) => (
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
              {customer.accounts.length > 0 && (
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

          {/* --- Cards (read-only) --- */}
          {tab === "Cards" && (
            customer.cards.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl">
                <EmptyState icon="credit_card" message="No cards issued" />
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-5">
                {customer.cards.map((card) => {
                  const isCredit = /credit|world|platinum/i.test(card.type);
                  return (
                    <div key={card.no} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                      <div className="rounded-xl p-5 text-white mb-4"
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

                      <div className="flex items-center justify-between mb-3">
                        <Badge label={card.status} />
                        <span className="text-xs text-slate-400">Expires {cardExpiry(card.no)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-slate-50 rounded-lg p-2.5">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wide">Spend · 30d</div>
                          <div className="text-sm font-bold text-slate-800">${cardSpend(card.no).toLocaleString()}</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2.5">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wide">{isCredit ? "Utilization" : "Daily limit"}</div>
                          <div className="text-sm font-bold text-slate-800">{isCredit ? `${Math.min(99, Math.round((cardSpend(card.no) / (parseInt(card.limits.replace(/[^0-9]/g, "")) || 5000)) * 100))}%` : card.limits}</div>
                        </div>
                      </div>

                      <div className="mb-4">
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
                  );
                })}
              </div>
            )
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

          {/* --- Invest & Insure (read-only) --- */}
          {tab === "Invest & Insure" && (
            <div className="grid md:grid-cols-2 gap-5">
              <Section title="Investments">
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
              <Section title="Insurance policies">
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

          {/* --- Interactions (read-only) --- */}
          {tab === "Interactions" && (
            <Section title="Interaction timeline">
              <div className="relative pl-6">
                <div className="absolute left-2 top-1 bottom-1 w-px bg-slate-200" />
                {customer.interactions.map((it, i) => (
                  <div key={i} className="relative pb-5 stagger-item" style={{ animationDelay: `${i * 70}ms` }}>
                    <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-primary-600 ring-4 ring-primary-50" />
                    <div className="text-xs text-slate-400">
                      <span className="font-semibold text-primary-600">{it.channel}</span> · {it.date}
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{it.note}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* --- Support cases (read-only) --- */}
          {tab === "Support" && (
            <Section title="Support cases">
              {cases.length === 0 ? <EmptyState icon="support_agent" message="No support cases for this customer" /> : (
                <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3 text-center"><div className="text-lg font-extrabold text-slate-900">{openCases}</div><div className="text-[11px] text-slate-400 uppercase tracking-wide">Open</div></div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center"><div className="text-lg font-extrabold text-slate-900">{cases.length - openCases}</div><div className="text-[11px] text-slate-400 uppercase tracking-wide">Resolved</div></div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center"><div className={`text-lg font-extrabold ${slaBreaches ? "text-red-600" : "text-slate-900"}`}>{slaBreaches}</div><div className="text-[11px] text-slate-400 uppercase tracking-wide">SLA breach</div></div>
                </div>
                <div className="divide-y divide-slate-100">
                  {cases.map((c) => (
                    <div key={c.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-800">{c.subject}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{c.id} · {c.category} · opened {c.created}</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-none">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.priority === "High" ? "bg-red-100 text-red-700" : c.priority === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{c.priority}</span>
                          <Badge label={c.status} />
                        </div>
                      </div>
                      <div className={`text-xs mt-1.5 ${c.slaState === "breach" ? "text-red-600" : c.slaState === "warning" ? "text-amber-600" : "text-slate-500"}`}>
                        SLA: {c.sla} · assigned to {c.assignee}
                      </div>
                    </div>
                  ))}
                </div>
                </>
              )}
            </Section>
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
        </div>
      </div>
    </div>
  );
}
