import { ArrowRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { PageHeader } from "@/components/common/PageHeader";
import { Pagination } from "@/components/common/Pagination";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { useAuditLogs } from "@/features/audit/hooks";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePagination } from "@/hooks/usePagination";
import type { AuditLog, AuditModule } from "@/types/audit";
import { formatDateTime } from "@/utils/format";

const MODULES: AuditModule[] = ["PRODUCT", "SALES_ORDER", "PURCHASE_ORDER", "MANUFACTURING_ORDER", "BOM", "INVOICE"];

const MODULE_TONE: Record<AuditModule, Parameters<typeof Badge>[0]["tone"]> = {
  PRODUCT: "info",
  SALES_ORDER: "primary",
  PURCHASE_ORDER: "success",
  MANUFACTURING_ORDER: "warning",
  BOM: "neutral",
  INVOICE: "danger",
};

const selectClass =
  "rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

export function AuditLogsPage() {
  const { t } = useTranslation();
  const [module, setModule] = useState<AuditModule | "ALL">("ALL");
  const { data, isLoading, error, refetch } = useAuditLogs(module === "ALL" ? undefined : module);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim().toLowerCase(), 300);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const rows = useMemo(() => {
    if (!search) return data ?? [];
    return (data ?? []).filter((l) =>
      [l.record_type, l.field_name, l.old_value, l.new_value, `${l.record_id}`]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(search)),
    );
  }, [data, search]);

  const pg = usePagination(rows, { resetKey: `${module}|${search}` });

  const columns: Column<AuditLog>[] = [
    {
      id: "timestamp",
      header: t("audit.timestamp"),
      cell: (l) => <span className="text-on-surface-variant">{formatDateTime(l.timestamp)}</span>,
    },
    {
      id: "user",
      header: t("audit.user"),
      cell: (l) => <span>{l.user_id != null ? `User #${l.user_id}` : t("audit.system")}</span>,
    },
    {
      id: "module",
      header: t("audit.module"),
      cell: (l) => <Badge tone={MODULE_TONE[l.module]}>{l.module.replace("_", " ")}</Badge>,
    },
    {
      id: "action",
      header: t("audit.action"),
      cell: (l) => (
        <span className="text-on-surface">
          <span className="font-medium">{l.field_name}</span>{" "}
          <span className="text-on-surface-variant">
            {l.old_value == null ? "set" : "changed"}
          </span>
        </span>
      ),
    },
    {
      id: "entity",
      header: t("audit.entity"),
      cell: (l) => (
        <span className="text-on-surface-variant">
          {l.record_type} #{l.record_id}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader title={t("audit.title")} subtitle={t("audit.subtitle")} />

      <div className="flex flex-col rounded-xl border border-outline-variant bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant p-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("audit.searchPlaceholder")}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-2 pl-10 pr-3 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            className={selectClass}
            value={module}
            onChange={(e) => setModule(e.target.value as AuditModule | "ALL")}
          >
            <option value="ALL">{t("audit.allModules")}</option>
            {MODULES.map((m) => (
              <option key={m} value={m}>
                {m.replace("_", " ")}
              </option>
            ))}
          </select>
          <span className="ml-auto px-1 text-[12px] text-on-surface-variant">
            {t("audit.entriesCount", { count: rows.length })}
          </span>
        </div>

        <DataTable
          columns={columns}
          data={pg.pageItems}
          rowKey={(l) => l.id}
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          onRowClick={(l) => setSelected(l)}
          emptyMessage={t("audit.noEntries")}
        />

        <Pagination
          page={pg.page}
          totalPages={pg.totalPages}
          total={pg.total}
          from={pg.from}
          to={pg.to}
          onPrevious={pg.previousPage}
          onNext={pg.nextPage}
          onGoTo={pg.goToPage}
          noun={t("audit.noun")}
        />
      </div>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={t("audit.changeDetail")}
        description={
          selected
            ? `${selected.record_type} #${selected.record_id} • ${selected.module.replace("_", " ")}`
            : ""
        }
      >
        {selected && (
          <div className="space-y-4">
            <Field label={t("audit.field")}>{selected.field_name}</Field>
            <Field label={t("audit.user")}>
              {selected.user_id != null ? `User #${selected.user_id}` : t("audit.system")}
            </Field>
            <Field label={t("audit.when")}>{formatDateTime(selected.timestamp)}</Field>
            <div className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <code className="flex-1 break-all text-body-sm text-on-surface-variant line-through">
                {selected.old_value ?? "—"}
              </code>
              <ArrowRight className="h-4 w-4 shrink-0 text-outline" />
              <code className="flex-1 break-all text-body-sm font-semibold text-on-surface">
                {selected.new_value ?? "—"}
              </code>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-label-upper uppercase text-on-surface-variant">{label}</span>
      <span className="text-body-md text-on-surface">{children}</span>
    </div>
  );
}
