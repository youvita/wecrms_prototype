"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { CUSTOMERS } from "@/lib/data";
import { getInitial } from "@/lib/format";
import { Badge, EmptyState, Icon, PageHeader } from "@/components/ui";
import Link from "next/link";

function segmentClass(s: string) {
  return s === "Affluent" ? "bg-purple-100 text-purple-800" : s === "SME" ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-700";
}

export default function CustomersPage() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [segment, setSegment] = React.useState("All");
  const [kyc, setKyc] = React.useState("All");

  const rows = CUSTOMERS.filter((c) => {
    const matchQ = !q || (c.name + c.khmerName + c.id + c.phone).toLowerCase().includes(q.toLowerCase());
    const matchS = segment === "All" || c.segment === segment;
    const matchK = kyc === "All" || c.kyc === kyc;
    return matchQ && matchS && matchK;
  });

  return (
    <div className="page-enter space-y-4">
      <PageHeader title="Customers" subtitle={`${CUSTOMERS.length} customers in your portfolio`}
        actions={
          <Link href="/onboarding" className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700">
            <Icon name="person_add" className="text-lg" /><span className="hidden sm:inline">New customer</span>
          </Link>
        } />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name (Latin or Khmer), CIF or phone…"
            className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
        </div>
        <select value={segment} onChange={(e) => setSegment(e.target.value)}
          className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
          {["All", "Mass", "Affluent", "SME"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={kyc} onChange={(e) => setKyc(e.target.value)}
          className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20">
          {["All", "Verified", "Pending", "Review due"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon="person_search" message={`No customers match "${q}"`} actionLabel="Clear search"
            onAction={() => { setQ(""); setSegment("All"); setKyc("All"); }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Customer</th>
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
                {rows.map((c, i) => (
                  <tr key={c.id} onClick={() => router.push(`/customers/${c.id}`)}
                    className="hover:bg-primary-50/40 transition-colors cursor-pointer stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold flex-none">
                          {getInitial(c.name)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{c.name} <span className="font-khmer text-slate-400 font-normal">{c.khmerName}</span></div>
                          <div className="text-xs text-slate-400">{c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{c.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${segmentClass(c.segment)}`}>{c.segment}</span>
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
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400">Showing {rows.length} of {CUSTOMERS.length} customers · Click a row to open Customer 360°</p>
    </div>
  );
}
