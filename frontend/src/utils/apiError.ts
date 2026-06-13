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
