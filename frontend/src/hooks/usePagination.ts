import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

export interface UsePaginationOptions {
  /** Records per page (default 10). */
  pageSize?: number;
  /**
   * When this value changes, pagination resets to page 1. Pass a string that
   * encodes the active search/filter criteria (NOT sort) so changing filters
   * sends the user back to the first page.
   */
  resetKey?: string;
  /** URL query-param name used to persist the page (default "page"). */
  param?: string;
}

export interface UsePaginationResult<T> {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** Items for the current page. */
  pageItems: T[];
  /** 1-based index of the first record on this page (0 when empty). */
  from: number;
  /** 1-based index of the last record on this page (0 when empty). */
  to: number;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  resetPagination: () => void;
}

/**
 * Reusable client-side pagination. Slices an already-fetched + already-filtered
 * array (so React Query caching, search, filtering and sorting are untouched)
 * and persists the current page in the URL (?page=N) so it survives drawer
 * open/close and back-navigation from detail pages.
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {},
): UsePaginationResult<T> {
  const { pageSize = 10, resetKey, param = "page" } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const rawPage = Number(searchParams.get(param)) || 1;
  const page = Math.min(Math.max(1, rawPage), totalPages);

  const setPage = (target: number) => {
    const next = Math.min(Math.max(1, target), totalPages);
    const sp = new URLSearchParams(searchParams);
    if (next === 1) sp.delete(param);
    else sp.set(param, String(next));
    setSearchParams(sp, { replace: true });
  };

  // Reset to page 1 whenever the search/filter criteria change.
  const prevResetKey = useRef(resetKey);
  useEffect(() => {
    if (prevResetKey.current !== resetKey) {
      prevResetKey.current = resetKey;
      if (searchParams.has(param)) {
        const sp = new URLSearchParams(searchParams);
        sp.delete(param);
        setSearchParams(sp, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
    [items, page, pageSize],
  );

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return {
    page,
    pageSize,
    total,
    totalPages,
    pageItems,
    from,
    to,
    nextPage: () => setPage(page + 1),
    previousPage: () => setPage(page - 1),
    goToPage: (p: number) => setPage(p),
    resetPagination: () => setPage(1),
  };
}
