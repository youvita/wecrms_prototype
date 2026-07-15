export function formatMoney(val: number, ccy: "USD" | "KHR" = "USD"): string {
  if (ccy === "KHR") return "៛" + Number(val).toLocaleString("en-US");
  return "$" + Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function getInitial(name: string): string {
  return name ? name.charAt(0).toUpperCase() : "?";
}

// Plain-language labels for the customer wealth/business segment.
// The underlying value (Mass/Affluent/SME) is kept for core-banking mapping;
// only the displayed label is friendlier.
export function segmentLabel(segment: string): string {
  const map: Record<string, string> = { Mass: "Standard", Affluent: "Priority", SME: "Business" };
  return map[segment] ?? segment;
}

export function statusClass(status: string): string {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    verified: "bg-green-100 text-green-800",
    success: "bg-green-100 text-green-800",
    performing: "bg-green-100 text-green-800",
    approved: "bg-green-100 text-green-800",
    executed: "bg-green-100 text-green-800",
    activated: "bg-green-100 text-green-800",
    resolved: "bg-green-100 text-green-800",
    complete: "bg-green-100 text-green-800",
    low: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    "pending approval": "bg-yellow-100 text-yellow-800",
    "awaiting approval": "bg-yellow-100 text-yellow-800",
    "review due": "bg-yellow-100 text-yellow-800",
    medium: "bg-yellow-100 text-yellow-800",
    watch: "bg-yellow-100 text-yellow-800",
    "docs pending": "bg-yellow-100 text-yellow-800",
    "manual review": "bg-yellow-100 text-yellow-800",
    "in progress": "bg-blue-100 text-blue-800",
    onboarding: "bg-blue-100 text-blue-800",
    open: "bg-blue-100 text-blue-800",
    screening: "bg-blue-100 text-blue-800",
    escalated: "bg-orange-100 text-orange-800",
    reversed: "bg-orange-100 text-orange-800",
    suspended: "bg-orange-100 text-orange-800",
    lapsed: "bg-red-100 text-red-800",
    blocked: "bg-red-100 text-red-800",
    breached: "bg-red-100 text-red-800",
    high: "bg-red-100 text-red-800",
    "30+ dpd": "bg-red-100 text-red-800",
  };
  return map[String(status).toLowerCase()] || "bg-slate-100 text-slate-700";
}
