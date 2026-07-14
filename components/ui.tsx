"use client";

import React from "react";
import { statusClass } from "@/lib/format";

// --- Material Symbols icon ---
export function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

// --- Status badge ---
export function Badge({ label }: { label: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusClass(label)}`}>
      {label}
    </span>
  );
}

// --- Empty state ---
export function EmptyState({ icon = "inbox", message, actionLabel, onAction }: {
  icon?: string; message: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className="text-center py-16 px-6">
      <Icon name={icon} className="text-5xl text-slate-300 block mb-3 empty-bounce mx-auto" />
      <p className="text-slate-500 mb-4">{message}</p>
      {actionLabel && (
        <button onClick={onAction} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// --- Loading skeleton ---
export function Skeleton({ type }: { type?: "card" | "lines" }) {
  if (type === "card") {
    return (
      <div className="animate-pulse bg-white border border-slate-200 rounded-xl p-6 space-y-3">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="h-20 bg-slate-200 rounded" />
      </div>
    );
  }
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-slate-200 rounded w-3/4" />
      <div className="h-4 bg-slate-200 rounded w-1/2" />
      <div className="h-4 bg-slate-200 rounded w-5/6" />
    </div>
  );
}

// --- Toast ---
export type ToastMsg = { message: string; type?: "success" | "error" | "info" } | null;

export function Toast({ toast, onClose }: { toast: NonNullable<ToastMsg>; onClose: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  const bg = toast.type === "success" ? "bg-green-600" : toast.type === "error" ? "bg-red-600" : "bg-slate-700";
  return (
    <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium z-50 toast-enter ${bg}`}>
      {toast.message}
    </div>
  );
}

// --- Confirm modal ---
export function ConfirmModal({ title, message, confirmLabel = "Confirm", variant = "primary", onConfirm, onCancel, children }: {
  title: string; message?: string; confirmLabel?: string; variant?: "primary" | "danger";
  onConfirm: () => void; onCancel: () => void; children?: React.ReactNode;
}) {
  const btn = variant === "danger" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-primary-600 hover:bg-primary-700 text-white";
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 modal-enter" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 modal-enter" onClick={(ev) => ev.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        {message && <p className="text-sm text-slate-600 mb-4">{message}</p>}
        {children}
        <div className="flex justify-end gap-3 mt-6">
          <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50" onClick={onCancel}>Cancel</button>
          <button className={`px-4 py-2 rounded-lg text-sm font-medium ${btn}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// --- Page header (title row inside content) ---
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// --- AI suggestion panel (gold accent — the one loud element) ---
export function AiPanel({ title = "AI suggestion", children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg p-4 text-sm bg-goldbg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
          <Icon name="auto_awesome" className="text-amber-600 text-lg" />
          {title}
        </div>
        {action}
      </div>
      <div className="text-slate-600 mt-1.5 text-xs leading-relaxed">{children}</div>
    </div>
  );
}
