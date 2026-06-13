import { History } from "lucide-react";
import { Link } from "react-router-dom";

import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/StateViews";
import { useAuditLogs } from "@/features/audit/hooks";
import type { AuditLog } from "@/types/audit";
import { formatRelative } from "@/utils/format";

const ENTITY: Record<string, { label: string; ref: (id: number) => string; to: (id: number) => string }> = {
  SalesOrder: { label: "Sales Order", ref: (id) => `SO-${id}`, to: (id) => `/sales/${id}` },
  PurchaseOrder: { label: "Purchase Order", ref: (id) => `PO-${id}`, to: (id) => `/purchase-orders/${id}` },
  ManufacturingOrder: { label: "Manufacturing Order", ref: (id) => `MO-${id}`, to: (id) => `/manufacturing/${id}` },
  Invoice: { label: "Invoice", ref: (id) => `INV-${id}`, to: (id) => `/invoices/${id}` },
  BillOfMaterials: { label: "Bill of Materials", ref: (id) => `BoM #${id}`, to: () => `/bom` },
  Product: { label: "Product", ref: (id) => `Product #${id}`, to: () => `/products` },
};

const VERB: Record<string, string> = {
  DRAFT: "created",
  CONFIRMED: "confirmed",
  PARTIALLY_DELIVERED: "partially delivered",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  IN_PROGRESS: "started production",
  DONE: "completed",
  PARTIALLY_RECEIVED: "partially received",
  RECEIVED: "received",
  SENT: "emailed",
};

interface Activity {
  id: number;
  entity: string;
  ref: string;
  to: string;
  verb: string;
  timestamp: string;
}

/** Turn a status-change audit row into a readable business activity. */
function toActivity(log: AuditLog): Activity | null {
  if (log.field_name !== "status" || !log.new_value) return null;
  const meta = ENTITY[log.record_type];
  const verb = VERB[log.new_value];
  if (!meta || !verb) return null;
  return {
    id: log.id,
    entity: meta.label,
    ref: meta.ref(log.record_id),
    to: meta.to(log.record_id),
    verb,
    timestamp: log.timestamp,
  };
}

/**
 * SECTION 5 — Recent Business Activity. Reuses the audit-log feed, rendered as
 * human-readable sentences with clickable references and relative timestamps.
 */
export function RecentActivityFeed() {
  const { data, isLoading, error, refetch } = useAuditLogs(undefined, 80);
  const activities = (data ?? [])
    .map(toActivity)
    .filter((a): a is Activity => a !== null)
    .slice(0, 8);

  return (
    <SectionCard title="Recent Business Activity" icon={History}>
      <div className="p-2">
        {isLoading ? (
          <LoadingState className="h-[220px]" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} className="h-[220px]" />
        ) : activities.length === 0 ? (
          <EmptyState message="No recent activity yet." className="h-[220px]" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {activities.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="min-w-0 text-body-sm text-on-surface">
                  {a.entity}{" "}
                  <Link to={a.to} className="font-semibold text-primary hover:underline">
                    {a.ref}
                  </Link>{" "}
                  {a.verb}.
                </span>
                <span className="shrink-0 text-[11px] text-on-surface-variant">
                  {formatRelative(a.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
