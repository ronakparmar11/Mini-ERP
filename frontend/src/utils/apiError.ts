import { AxiosError } from "axios";

/**
 * The backend returns a stable envelope: { error: { code, message } } (see
 * docs/endpoints.md). This normalizes any failure into a human-readable string.
 */
interface BackendError {
  error?: { code?: string; message?: string };
  detail?: unknown;
}

export function getApiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as BackendError | undefined;
    if (data?.error?.message) return data.error.message;
    if (typeof data?.detail === "string") return data.detail;
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/** Drop a trailing ".0" so 12.0 reads as "12" in business sentences. */
const tidyNumber = (n: number): string =>
  Number.isInteger(n) ? String(n) : String(n).replace(/\.?0+$/, "");

/**
 * Translates the backend's low-level stock-ledger guardrail messages into
 * actionable business guidance. Unknown messages are returned unchanged so the
 * original fallback behaviour is fully preserved.
 */
export function humanizeError(raw: string): string {
  if (!raw) return raw;
  const lower = raw.toLowerCase();

  // "Reserved for product 5 cannot go negative (12 + -13)" — a delivery/consume
  // would exceed what is actually reserved. The two numbers are the current
  // reserved quantity and the (negative) delta being applied.
  const reserved = raw.match(
    /reserved.*cannot go negative\s*\(\s*(-?\d+(?:\.\d+)?)\s*\+\s*(-?\d+(?:\.\d+)?)\s*\)/i,
  );
  if (reserved) {
    const have = Math.abs(Number(reserved[1]));
    const requested = Math.abs(Number(reserved[2]));
    return `Only ${tidyNumber(have)} of ${tidyNumber(requested)} units are currently reserved. ` +
      "Complete the linked Purchase or Manufacturing order before delivering.";
  }
  if (lower.includes("reserved") && lower.includes("cannot go negative")) {
    return "This exceeds the quantity currently reserved. Complete the linked Purchase or " +
      "Manufacturing order before delivering.";
  }

  // "On-hand cannot go negative" — not enough physical stock for the operation.
  if ((lower.includes("on-hand") || lower.includes("on hand") || lower.includes("on_hand")) &&
      lower.includes("negative")) {
    return "Additional inventory is required before this operation can be completed.";
  }

  // Generic insufficient-stock phrasing from the produce/consume path.
  if (lower.includes("insufficient") && lower.includes("stock")) {
    return "There isn't enough stock on hand for this operation. Receive or produce the " +
      "shortage first, then try again.";
  }

  return raw;
}

/** Convenience: normalize an unknown error and humanize it in one call. */
export function getFriendlyError(err: unknown, fallback = "Something went wrong"): string {
  return humanizeError(getApiErrorMessage(err, fallback));
}
