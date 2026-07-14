"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CUSTOMERS, TRANSACTIONS } from "@/lib/data";
import type { Card, Customer } from "@/lib/types";
import { formatDate, formatMoney, getInitial } from "@/lib/format";
import { AiPanel, Badge, ConfirmModal, EmptyState, Icon, Toast, type ToastMsg } from "@/components/ui";

const TABS = ["Customer Info", "Accounts & Deposits", "Cards", "Loans", "Invest & Insure", "Interactions", "Security"] as const;
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

function Field({ label, value, onChange, span }: { label: string; value: string; onChange: (v: string) => void; span?: boolean }) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
    </div>
  );
}

export default function Customer360Page() {
  const params = useParams<{ cif: string }>();
  const customer = CUSTOMERS.find((x) => x.id === decodeURIComponent(params.cif)) ?? CUSTOMERS[0];

  const [tab, setTab] = React.useState<Tab>("Customer Info");
  const [toast, setToast] = React.useState<ToastMsg>(null);
  const [cardModal, setCardModal] = React.useState<Card | null>(null);
  const [cards, setCards] = React.useState<Card[]>(customer.cards);
  const [form, setForm] = React.useState<Customer>({ ...customer });

  const txns = TRANSACTIONS.filter((t) => t.customer === customer.name).slice(0, 4);
  const set = (k: keyof Customer) => (v: string) => setForm({ ...form, [k]: v });

  const toggleCardBlock = () => {
    if (!cardModal) return;
    setCards(cards.map((cd) => cd.no === cardModal.no ? { ...cd, status: cd.status === "Blocked" ? "Active" : "Blocked" } : cd));
    setToast({ message: `Card ${cardModal.no} ${cardModal.status === "Blocked" ? "unblocked" : "blocked"} — customer notified by SMS`, type: "success" });
    setCardModal(null);
  };

  const nextBestAction =
    customer.segment === "Affluent" ? "FD maturing soon — offer 24-month renewal at 5.4% before competitor rates land."
    : customer.segment === "SME" ? "High QR settlement volume — propose merchant financing pre-approval."
    : "Eligible for first credit card — pre-approved $500 limit based on 12-month savings behavior.";

  return (
    <div className="page-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
        <Link href="/customers" className="hover:text-primary-600 font-medium">Customers</Link>
        <Icon name="chevron_right" className="text-base text-slate-300" />
        <span className="font-semibold text-slate-800">{customer.id}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5 items-start">
        {/* ===== Customer passport rail ===== */}
        <div className="space-y-4 xl:sticky xl:top-20">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full text-white flex items-center justify-center text-3xl font-extrabold"
                style={{ background: "linear-gradient(135deg,#0052CC,#0D1B52)" }}>
                {getInitial(customer.name)}
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 mt-3 leading-tight">{customer.name}</h2>
              <div className="font-khmer text-slate-500 text-sm">{customer.khmerName}</div>
              <div className="text-xs text-slate-400 mt-0.5">{customer.id}</div>
              <div className="flex gap-1.5 mt-2 flex-wrap justify-center">
                <Badge label={customer.kyc} />
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.segment === "Affluent" ? "bg-purple-100 text-purple-800" : customer.segment === "SME" ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-700"}`}>{customer.segment}</span>
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

          {/* Holdings */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Product holdings</h3>
            <div className="flex flex-wrap gap-1.5">
              {customer.accounts.map((a) => (
                <span key={a.no} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-50 text-primary-800 text-xs font-semibold">
                  {a.type.split("·")[0].trim()} <span className="text-[10px] bg-primary-600 text-white rounded px-1">{a.ccy}</span>
                </span>
              ))}
              {cards.map((cd) => (
                <span key={cd.no} className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">{cd.type}</span>
              ))}
              {customer.loans.map((l) => (
                <span key={l.id} className="inline-flex px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold">{l.product}</span>
              ))}
              {customer.accounts.length + cards.length + customer.loans.length === 0 && (
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
        </div>

        {/* ===== Main working area ===== */}
        <div className="space-y-5 min-w-0">
          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${tab === t ? "bg-primary-600 text-white shadow" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                {t}
              </button>
            ))}
          </div>

          {/* --- Customer Info (editable form, CBC export) --- */}
          {tab === "Customer Info" && (
            <div className="space-y-5">
              <Section title="Basic information">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Full name (Latin)" value={form.name} onChange={set("name")} />
                  <Field label="Khmer name · ឈ្មោះខ្មែរ" value={form.khmerName} onChange={set("khmerName")} />
                  <Field label="Date of birth" value={form.dob} onChange={set("dob")} />
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Gender</label>
                    <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Customer["gender"] })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
                      <option>Male</option><option>Female</option>
                    </select>
                  </div>
                  <Field label="Marital status" value={form.marital} onChange={set("marital")} />
                  <Field label="Nationality" value={form.nationality} onChange={set("nationality")} />
                </div>
              </Section>

              <Section title="Identification">
                <div className="grid sm:grid-cols-3 gap-4">
                  <Field label="ID type" value={form.idType} onChange={set("idType")} />
                  <Field label="ID number" value={form.idNo} onChange={set("idNo")} />
                  <Field label="ID expiry date" value={form.idExpiry} onChange={set("idExpiry")} />
                </div>
              </Section>

              <Section title="Contact & address">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Mobile phone" value={form.phone} onChange={set("phone")} />
                  <Field label="E-mail" value={form.email} onChange={set("email")} />
                  <Field label="Personal address" value={form.address} onChange={set("address")} span />
                </div>
              </Section>

              <Section title="Occupation & income">
                <div className="grid sm:grid-cols-3 gap-4">
                  <Field label="Occupation" value={form.occupation} onChange={set("occupation")} />
                  <Field label="Company name" value={form.company} onChange={set("company")} />
                  <Field label="Annual income (USD)" value={form.incomeUSD != null ? String(form.incomeUSD) : ""} onChange={(v) => setForm({ ...form, incomeUSD: v ? Number(v) : null })} />
                </div>
              </Section>

              <div className="flex justify-end gap-2">
                <button onClick={() => { setForm({ ...customer }); setToast({ message: "Changes discarded", type: "info" }); }}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">Clear changes</button>
                <button onClick={() => setToast({ message: "Customer info exported in CBC format (XML)", type: "success" })}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">Customer info for CBC</button>
                <button onClick={() => setToast({ message: "Customer information saved — audit trail updated", type: "success" })}
                  className="px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700">Save changes</button>
              </div>

              <AiPanel title="Next best action"
                action={<button onClick={() => setToast({ message: "Offer queued for next app session", type: "success" })} className="text-xs font-semibold text-primary-700 hover:underline">Send offer</button>}>
                {nextBestAction}
              </AiPanel>

              <Section title="Recent transactions" action={<Link href="/payments" className="text-xs font-semibold text-primary-600 hover:underline">All payments</Link>}>
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

          {/* --- Accounts & Deposits --- */}
          {tab === "Accounts & Deposits" && (
            <Section title="All accounts & deposits"
              action={<button onClick={() => setToast({ message: "Account opening flow would start here", type: "info" })} className="text-xs font-semibold text-primary-600 hover:underline">+ Open account</button>}>
              {customer.accounts.length === 0 ? <EmptyState icon="account_balance_wallet" message="No accounts yet" actionLabel="Open first account" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Account no.</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Product</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Currency</th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-600">Balance</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                        <th className="px-4 py-3" />
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
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => setToast({ message: `Statement for ${a.no} downloaded (PDF)`, type: "success" })}
                              className="text-xs font-semibold text-primary-600 hover:underline">Statement</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          )}

          {/* --- Cards --- */}
          {tab === "Cards" && (
            cards.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl">
                <EmptyState icon="credit_card" message="No cards issued" actionLabel="Issue virtual card"
                  onAction={() => setToast({ message: "Virtual card issuance flow would start here", type: "info" })} />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {cards.map((card) => (
                  <div key={card.no} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <div className="rounded-xl p-5 text-white mb-4"
                      style={{ background: card.status === "Blocked" ? "linear-gradient(135deg,#64748B,#334155)" : "linear-gradient(135deg,#0052CC,#0D1B52)" }}>
                      <div className="flex justify-between items-start">
                        <span className="text-xs tracking-widest opacity-80 uppercase">{card.type}</span>
                        <Icon name="contactless" />
                      </div>
                      <div className="text-xl font-bold tracking-widest mt-6">{card.no}</div>
                      <div className="flex justify-between text-xs mt-3 opacity-80">
                        <span>{customer.name.toUpperCase()}</span><span>{card.limits}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <Badge label={card.status} />
                      <button onClick={() => setCardModal(card)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${card.status === "Blocked" ? "bg-green-600 text-white hover:bg-green-700" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
                        {card.status === "Blocked" ? "Unblock card" : "Block card"}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {([["Online payments", "online"], ["Contactless", "contactless"], ["International", "intl"]] as const).map(([label, key]) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">{label}</span>
                          <button
                            onClick={() => {
                              setCards(cards.map((cd) => cd.no === card.no ? { ...cd, controls: { ...cd.controls, [key]: !cd.controls[key] } } : cd));
                              setToast({ message: `${label} ${card.controls[key] ? "disabled" : "enabled"} for ${card.no}`, type: "success" });
                            }}
                            className={`w-10 rounded-full p-0.5 transition-colors ${card.controls[key] ? "bg-primary-600" : "bg-slate-300"}`}
                            style={{ height: 22 }} aria-label={`Toggle ${label}`}>
                            <span className={`block bg-white rounded-full shadow transform transition-transform ${card.controls[key] ? "translate-x-4" : ""}`}
                              style={{ width: 18, height: 18 }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* --- Loans --- */}
          {tab === "Loans" && (
            customer.loans.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl">
                <EmptyState icon="account_balance" message="No active loans" actionLabel="Check eligibility" onAction={() => (window.location.href = "/lending")} />
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
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setToast({ message: "Repayment schedule opened", type: "info" })}
                        className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">Schedule</button>
                      <button onClick={() => setToast({ message: `Early settlement quote: ${formatMoney(l.outstanding * 1.01, l.ccy)}`, type: "info" })}
                        className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">Early settlement quote</button>
                      {l.status.includes("DPD") && (
                        <Link href="/support" className="px-3.5 py-2 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600">Collections workflow</Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* --- Invest & Insure --- */}
          {tab === "Invest & Insure" && (
            <div className="grid md:grid-cols-2 gap-5">
              <Section title="Investments">
                {customer.investments.length === 0 ? (
                  <EmptyState icon="trending_up" message="No investments yet" actionLabel="Explore CSX products"
                    onAction={() => setToast({ message: "Investment catalog would open here", type: "info" })} />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {customer.investments.map((iv, i) => (
                      <div key={i} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{iv.type}</div>
                          <div className="text-xs text-slate-400">{iv.detail}</div>
                        </div>
                        <div className="text-sm font-bold text-slate-900">{formatMoney(iv.value, "USD")}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
              <Section title="Insurance policies">
                {customer.insurance.length === 0 ? (
                  <EmptyState icon="health_and_safety" message="No policies" actionLabel="Quote bancassurance"
                    onAction={() => setToast({ message: "Bancassurance quote flow would open here", type: "info" })} />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {customer.insurance.map((p, i) => (
                      <div key={i} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{p.policy}</div>
                          <div className="text-xs text-slate-400">Premium {p.premium} · renews {p.renewal}</div>
                        </div>
                        <Badge label={p.status} />
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          )}

          {/* --- Interactions --- */}
          {tab === "Interactions" && (
            <Section title="Interaction timeline"
              action={<button onClick={() => setToast({ message: "Note logged to timeline", type: "success" })} className="text-xs font-semibold text-primary-600 hover:underline">+ Log note</button>}>
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

          {/* --- Security --- */}
          {tab === "Security" && (
            <div className="grid md:grid-cols-2 gap-5">
              <Section title="Registered devices">
                <div className="divide-y divide-slate-100">
                  {customer.devices.map((d, i) => (
                    <div key={i} className="py-3 flex items-center gap-3">
                      <Icon name="smartphone" className="text-slate-400" />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-800">{d.name}</div>
                        <div className="text-xs text-slate-400">Last seen {d.lastSeen}</div>
                      </div>
                      {d.trusted ? <Badge label="Active" /> : (
                        <button onClick={() => setToast({ message: `${d.name} revoked — sessions terminated`, type: "success" })}
                          className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100">Revoke</button>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
              <Section title="Security actions">
                <div className="space-y-3">
                  {[
                    { icon: "lock_reset", t: "Reset app PIN", d: "Sends secure reset link via SMS" },
                    { icon: "phonelink_erase", t: "Force logout all devices", d: "Terminates every active session" },
                    { icon: "notification_important", t: "Enable transaction alerts", d: "Push + SMS for all transactions" },
                  ].map((a) => (
                    <button key={a.t} onClick={() => setToast({ message: `${a.t} — done`, type: "success" })}
                      className="w-full flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/40 transition-colors text-left">
                      <Icon name={a.icon} className="text-primary-600" />
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{a.t}</div>
                        <div className="text-xs text-slate-400">{a.d}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>

      {cardModal && (
        <ConfirmModal
          title={`${cardModal.status === "Blocked" ? "Unblock" : "Block"} card ${cardModal.no}?`}
          message={cardModal.status === "Blocked"
            ? "The customer will be able to transact immediately after unblocking."
            : "All transactions will be declined until the card is unblocked. The customer will be notified by SMS."}
          confirmLabel={cardModal.status === "Blocked" ? "Unblock" : "Block card"}
          variant={cardModal.status === "Blocked" ? "primary" : "danger"}
          onConfirm={toggleCardBlock} onCancel={() => setCardModal(null)} />
      )}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
