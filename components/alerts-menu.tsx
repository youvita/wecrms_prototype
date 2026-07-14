"use client";

import React from "react";
import Link from "next/link";
import { CUSTOMERS, INSURANCE_POLICIES } from "@/lib/data";
import { Icon } from "./ui";

const now = new Date();
const yearsAgo = (iso: string) => (now.getTime() - new Date(iso).getTime()) / (365 * 864e5);
const nba = (seg: string) =>
  seg === "Affluent" ? "Offer FD renewal at 5.4%" : seg === "SME" ? "Propose merchant-financing" : "Offer first credit card";

const TS = ["Just now", "18m ago", "1h ago", "3h ago", "5h ago", "Yesterday", "2d ago"];

type Item = { id: string; icon: string; tone: string; cif: string; title: string; sub: string; tag?: string; ts: string };

// Combined Alerts + Tasks presented as a notifications inbox (mark-read / dismiss are UI-only).
export function AlertsMenu() {
  const [open, setOpen] = React.useState(false);
  const [read, setRead] = React.useState<Record<string, boolean>>({});

  const items: Item[] = React.useMemo(() => {
    const kycDue = CUSTOMERS.filter((c) => c.kyc === "Review due" || yearsAgo(c.joined) > 3);
    const maturities = CUSTOMERS.flatMap((c) => c.accounts.filter((a) => a.type.includes("Fixed Deposit") && a.status.startsWith("Matures")).map((a) => ({ c, a })));
    const renewals = INSURANCE_POLICIES.filter((p) => p.renewingSoon);
    const crossSell = CUSTOMERS.filter((c) => c.insurance.length === 0 || c.cards.length === 0);
    const raw: Omit<Item, "ts">[] = [
      ...kycDue.map((c) => ({ id: `kyc-${c.id}`, icon: "verified_user", tone: "text-red-600", cif: c.id, title: "KYC review due", sub: c.name })),
      ...maturities.map(({ c, a }) => ({ id: `fd-${c.id}`, icon: "lock_clock", tone: "text-amber-600", cif: c.id, title: a.status, sub: `${c.name} · ${a.type.split("·")[0].trim()}` })),
      ...renewals.map((p) => ({ id: `ins-${p.id}`, icon: "shield", tone: "text-blue-600", cif: p.cif, title: `${p.plan} renewal`, sub: p.customer })),
      ...crossSell.map((c) => ({ id: `xs-${c.id}`, icon: "lightbulb", tone: "text-purple-600", cif: c.id, title: c.insurance.length === 0 ? "No insurance — cross-sell" : "No card — cross-sell", sub: c.name })),
      ...kycDue.map((c) => ({ id: `tkyc-${c.id}`, icon: "task_alt", tone: "text-slate-400", cif: c.id, title: "Task · KYC refresh", sub: `${c.name} · Today`, tag: "Compliance" })),
      ...CUSTOMERS.slice(0, 4).map((c) => ({ id: `tnba-${c.id}`, icon: "task_alt", tone: "text-slate-400", cif: c.id, title: `Task · ${nba(c.segment)}`, sub: `${c.name} · This week`, tag: "Cross-sell" })),
    ];
    return raw.map((r, i) => ({ ...r, ts: TS[i % TS.length] }));
  }, []);

  const unread = items.filter((i) => !read[i.id]);
  const earlier = items.filter((i) => read[i.id]);

  const markRead = (id: string) => setRead((r) => ({ ...r, [id]: true }));
  const markAll = () => setRead((r) => { const n = { ...r }; items.forEach((i) => (n[i.id] = true)); return n; });

  const Row = ({ i }: { i: Item }) => (
    <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50">
      <span className={`w-1.5 h-1.5 rounded-full flex-none ${read[i.id] ? "bg-transparent" : "bg-red-500"}`} />
      <Link href={i.cif !== "—" ? `/customers/${encodeURIComponent(i.cif)}` : "#"} onClick={() => { markRead(i.id); setOpen(false); }}
        className="flex items-center gap-2.5 flex-1 min-w-0">
        <Icon name={i.icon} className={`text-lg flex-none ${i.tone}`} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-800 truncate">{i.title}</div>
          <div className="text-xs text-slate-400 truncate">{i.sub} · {i.ts}</div>
        </div>
        {i.tag && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-none ${i.tag === "Compliance" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{i.tag}</span>}
      </Link>
    </div>
  );

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" aria-label="Notifications">
        <Icon name="notification_important" className="text-2xl" />
        {unread.length > 0 && <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none flex items-center justify-center">{unread.length}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 z-40 modal-enter">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
              {unread.length > 0 && <button onClick={markAll} className="text-xs font-semibold text-primary-600 hover:underline">Mark all read</button>}
            </div>

            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                <Icon name="check_circle" className="text-3xl text-green-400 block mx-auto mb-2" />You&rsquo;re all caught up
              </div>
            ) : (
              <>
                {unread.length > 0 && <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">New · {unread.length}</div>}
                {unread.map((i) => <Row key={i.id} i={i} />)}
                {earlier.length > 0 && <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-100 mt-1">Earlier</div>}
                {earlier.map((i) => <Row key={i.id} i={i} />)}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
