"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { CUSTOMERS } from "@/lib/data";
import { getInitial, segmentLabel } from "@/lib/format";
import { Badge, EmptyState, Icon, PageHeader } from "@/components/ui";
import Link from "next/link";

function segmentClass(s: string) {
  return s === "Affluent" ? "bg-purple-100 text-purple-800" : s === "SME" ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-700";
}

export default function CustomersPage() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState("All");
  const [segment, setSegment] = React.useState("All");
  const [kyc, setKyc] = React.useState("All");
  const [perPage, setPerPage] = React.useState(10);
  const [page, setPage] = React.useState(1);

  const rows = CUSTOMERS.filter((c) => {
    const matchQ = !q || (c.name + c.khmerName + c.id + c.phone).toLowerCase().includes(q.toLowerCase());
    const matchT = type === "All" || (c.profiles ?? [c.customerType]).includes(type as "Individual" | "Corporate");
    const matchS = segment === "All" || c.segment === segment;
    const matchK = kyc === "All" || c.kyc === kyc;
    return matchQ && matchT && matchS && matchK;
  });

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const pageC = Math.min(page, totalPages);
  const start = (pageC - 1) * perPage;
  const pageRows = rows.slice(start, start + perPage);

  // Portfolio big-picture (computed from the book).
  const total = CUSTOMERS.length;
  const segments = (["Affluent", "SME", "Mass"] as const).map((s) => ({ s, n: CUSTOMERS.filter((c) => c.segment === s).length }));
  const indivCount = CUSTOMERS.filter((c) => (c.profiles ?? [c.customerType]).includes("Individual")).length;
  const corpCount = CUSTOMERS.filter((c) => (c.profiles ?? [c.customerType]).includes("Corporate")).length;
  const adopt = [
    { label: "Savings", n: CUSTOMERS.filter((c) => c.accounts.some((a) => a.type.startsWith("Savings"))).length },
    { label: "Cards", n: CUSTOMERS.filter((c) => c.cards.length > 0).length },
    { label: "Loans", n: CUSTOMERS.filter((c) => c.loans.length > 0).length },
    { label: "Insurance", n: CUSTOMERS.filter((c) => c.insurance.length > 0).length },
    { label: "Digital", n: CUSTOMERS.filter((c) => c.ebanking.includes("Mobile Banking")).length },
  ];
  const crossSell = CUSTOMERS.filter((c) => c.insurance.length === 0 || c.cards.length === 0).length;

  return (
    <div className="page-enter space-y-4">
      <PageHeader title="Customers" subtitle={`${CUSTOMERS.length} customers in your portfolio`}
        actions={
          <Link href="/onboarding" className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gold text-navy text-sm font-semibold rounded-lg hover:brightness-95">
            <Icon name="person_add" className="text-lg" /><span className="hidden sm:inline">New customer</span>
          </Link>
        } />

      {/* Portfolio big-picture */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5 lg:items-center">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-2xl font-extrabold text-slate-900 leading-none">{total}</div>
              <div className="text-xs text-slate-400 mt-1">customers</div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700"><Icon name="person" className="text-sm" />Individual {indivCount}</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"><Icon name="corporate_fare" className="text-sm" />Corporate {corpCount}</span>
              {segments.map((s) => (
                <span key={s.s} className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${segmentClass(s.s)}`}>{segmentLabel(s.s)} {s.n}</span>
              ))}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700"><Icon name="lightbulb" className="text-sm" />{crossSell} cross-sell</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 lg:border-l lg:border-slate-100 lg:pl-5">
            {adopt.map((a) => {
              const pct = Math.round((a.n / total) * 100);
              return (
                <div key={a.label}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">{a.label}</span><span className="font-semibold text-slate-700">{pct}%</span></div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by name (Latin or Khmer), CIF or phone…"
            className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
        </div>
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}
          className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
          {["All", "Individual", "Corporate"].map((s) => <option key={s}>{s === "All" ? "All types" : s}</option>)}
        </select>
        <select value={segment} onChange={(e) => { setSegment(e.target.value); setPage(1); }}
          className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
          {["All", "Mass", "Affluent", "SME"].map((s) => <option key={s} value={s}>{s === "All" ? "All segments" : segmentLabel(s)}</option>)}
        </select>
        <select value={kyc} onChange={(e) => { setKyc(e.target.value); setPage(1); }}
          className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
          {["All", "Verified", "Pending", "Review due"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon="person_search" message={`No customers match "${q}"`} actionLabel="Clear search"
            onAction={() => { setQ(""); setType("All"); setSegment("All"); setKyc("All"); }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Segment</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">KYC</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Risk</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Branch</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Products</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pageRows.map((c, i) => (
                  <tr key={c.id} onClick={() => router.push(`/customers/${c.id}`)}
                    className="hover:bg-primary-50/40 transition-colors cursor-pointer stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-none ${c.customerType === "Corporate" ? "bg-primary-700 text-white" : "bg-primary-100 text-primary-700"}`}>
                          {c.customerType === "Corporate" ? <Icon name="corporate_fare" className="text-lg" /> : getInitial(c.name)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{c.name} <span className="font-khmer text-slate-400 font-normal">{c.khmerName}</span></div>
                          <div className="text-xs text-slate-400">{c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {(() => {
                        const profs = c.profiles ?? [c.customerType];
                        const both = profs.includes("Individual") && profs.includes("Corporate");
                        return both ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gold/20 text-primary-800">
                            <Icon name="groups" className="text-sm" />Individual + Corporate
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.customerType === "Corporate" ? "bg-primary-100 text-primary-800" : "bg-slate-100 text-slate-600"}`}>
                            <Icon name={c.customerType === "Corporate" ? "corporate_fare" : "person"} className="text-sm" />{c.customerType}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{c.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${segmentClass(c.segment)}`}>{segmentLabel(c.segment)}</span>
                    </td>
                    <td className="px-4 py-3"><Badge label={c.kyc} /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Badge label={c.risk} /></td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{c.branch}</td>
                    <td className="px-4 py-3 text-right text-slate-600 hidden lg:table-cell">{c.accounts.length + c.cards.length + c.loans.length}</td>
                    <td className="px-4 py-3 text-right"><Icon name="chevron_right" className="text-slate-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
              <div className="text-slate-500">Showing {start + 1}–{Math.min(start + perPage, rows.length)} of {rows.length} customers</div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-slate-500">
                  <span className="whitespace-nowrap">Rows per page</span>
                  <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                    className="border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600">
                    {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <div className="flex items-center gap-2">
                  <button disabled={pageC <= 1} onClick={() => setPage(pageC - 1)} className={`px-2.5 py-1 rounded-md ${pageC <= 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Previous</button>
                  <span className="text-slate-500">Page {pageC} of {totalPages}</span>
                  <button disabled={pageC >= totalPages} onClick={() => setPage(pageC + 1)} className={`px-2.5 py-1 rounded-md ${pageC >= totalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"}`}>Next</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400">Click a row to open Customer 360°</p>
    </div>
  );
}
