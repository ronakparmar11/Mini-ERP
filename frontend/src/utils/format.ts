/** Shared display formatters. Backend returns plain numbers/ISO strings. */

const numberFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export const formatNumber = (value: number | string | null | undefined): string => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? numberFmt.format(n) : "0";
};

export const formatCurrency = (value: number | string | null | undefined): string => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? currencyFmt.format(n) : "$0.00";
};

export const formatPercent = (ratio: number): string => `${Math.round((ratio ?? 0) * 100)}%`;

export const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Compact "5 mins ago" style relative time for activity feeds. */
export const formatRelative = (iso: string): string => {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return iso;
  const diff = Date.now() - d;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};
