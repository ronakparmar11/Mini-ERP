import { CheckCircle2, Download, FileSpreadsheet, Upload, X, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { DrawerShell } from "@/components/common/DrawerShell";
import { StatusBadge, type StatusMeta } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { downloadImportTemplate } from "@/api/products";
import { useImportProducts } from "@/features/products/hooks";
import type { ImportResult, ImportRowStatus } from "@/types/productImport";
import { getFriendlyError } from "@/utils/apiError";

const ROW_META: Record<ImportRowStatus, StatusMeta> = {
  valid: { label: "Valid", tone: "success", icon: CheckCircle2 },
  created: { label: "Created", tone: "success", icon: CheckCircle2 },
  duplicate: { label: "Duplicate", tone: "warning" },
  error: { label: "Error", tone: "danger", icon: XCircle },
};

export function ProductImportDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const importMut = useImportProducts();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  if (!open) return null;

  const validate = async () => {
    if (!file) return;
    try {
      setResult(await importMut.mutateAsync({ file, commit: false }));
    } catch (err) {
      toast.error(getFriendlyError(err));
    }
  };

  const commit = async () => {
    if (!file) return;
    try {
      const res = await importMut.mutateAsync({ file, commit: true });
      toast.success(`${res.success_count} product${res.success_count === 1 ? "" : "s"} imported successfully.`);
      onClose();
    } catch (err) {
      toast.error(getFriendlyError(err));
    }
  };

  return (
    <DrawerShell open={open} onClose={onClose} widthClassName="max-w-2xl" label="Import Products">
      <div className="flex items-center justify-between border-b border-outline-variant p-4">
        <h3 className="flex items-center gap-2 text-title-sm text-on-background">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Import Products from Excel
        </h3>
        <button onClick={onClose} className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {/* Step 1 — template */}
        <Step n={1} title="Download the template">
          <p className="mb-2 text-body-sm text-on-surface-variant">
            Fill in your products using the sample format (.xlsx).
          </p>
          <Button variant="secondary" size="sm" onClick={() => downloadImportTemplate()}>
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </Step>

        {/* Step 2 — upload + validate */}
        <Step n={2} title="Upload & validate your file">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="block w-full text-body-sm text-on-surface file:mr-3 file:rounded-lg file:border file:border-outline-variant file:bg-surface-container-low file:px-3 file:py-1.5 file:text-body-sm file:font-semibold file:text-on-surface hover:file:bg-surface-container"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
          />
          <Button
            size="sm"
            className="mt-3"
            onClick={validate}
            disabled={!file || importMut.isPending}
          >
            <Upload className="h-4 w-4" />
            {importMut.isPending && !result ? "Validating…" : "Validate File"}
          </Button>
        </Step>

        {/* Step 3 — results */}
        {result && (
          <Step n={3} title="Review validation results">
            <div className="mb-3 flex flex-wrap gap-3 text-body-sm">
              <span className="font-semibold text-tertiary-container">✓ {result.success_count} valid</span>
              <span className="font-semibold text-[#b45309]">⚠ {result.duplicate_count} duplicate</span>
              <span className="font-semibold text-error">✕ {result.failure_count} error</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-outline-variant">
              <table className="w-full text-left text-body-sm">
                <thead className="bg-surface-container-lowest text-label-upper uppercase text-on-surface-variant">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Product Name</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {result.rows.map((r) => (
                    <tr key={r.row}>
                      <td className="px-3 py-2 text-on-surface-variant">{r.row}</td>
                      <td className="px-3 py-2 font-medium text-on-surface">{r.product_name || "—"}</td>
                      <td className="px-3 py-2"><StatusBadge meta={ROW_META[r.status]} /></td>
                      <td className="px-3 py-2 text-on-surface-variant">{r.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Step>
        )}
      </div>

      {/* Step 4 — import footer */}
      <div className="flex items-center justify-between gap-2 border-t border-outline-variant bg-surface p-4">
        <span className="text-body-sm text-on-surface-variant">
          {result ? `${result.success_count} valid row(s) will be imported` : "Validate a file to continue"}
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={commit}
            disabled={!result || result.success_count === 0 || importMut.isPending}
          >
            {importMut.isPending && result ? "Importing…" : "Import Products"}
          </Button>
        </div>
      </div>
    </DrawerShell>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 flex items-center gap-2 text-body-md font-semibold text-on-surface">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary-container text-[12px] font-bold text-primary">
          {n}
        </span>
        {title}
      </h4>
      <div className="pl-8">{children}</div>
    </section>
  );
}
