import { Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useDeleteBom } from "@/features/bom/hooks";
import type { BoM } from "@/types/bom";
import { getApiErrorMessage } from "@/utils/apiError";
import { formatNumber } from "@/utils/format";

interface BomDetailDrawerProps {
  open: boolean;
  bom: BoM | null;
  productName: (id: number) => string;
  onClose: () => void;
}

export function BomDetailDrawer({ open, bom, productName, onClose }: BomDetailDrawerProps) {
  const deleteMut = useDeleteBom();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!open || !bom) return null;

  const onDelete = async () => {
    try {
      await deleteMut.mutateAsync(bom.id);
      toast.success(`Bill of Materials #${bom.id} deleted`);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      setConfirmDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#0b1c30]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="pointer-events-auto relative flex h-full w-full max-w-md animate-fade-in flex-col border-l border-outline-variant bg-surface-container-lowest shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant p-4">
          <h3 className="text-title-sm text-on-background">Bill of Materials #{bom.id}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <div className="text-[11px] font-semibold uppercase text-on-surface-variant">Finished Product</div>
            <div className="text-title-sm text-on-surface">{productName(bom.finished_product_id)}</div>
            <div className="mt-1 text-body-sm text-on-surface-variant">
              Produces {formatNumber(bom.quantity)} per batch
            </div>
          </div>

          <section>
            <h4 className="mb-2 border-b border-outline-variant pb-1 text-label-upper uppercase text-on-surface-variant">
              Components ({bom.components.length})
            </h4>
            <table className="w-full text-left text-table-data">
              <thead>
                <tr className="text-label-upper uppercase text-on-surface-variant">
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">Qty Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {bom.components.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 text-on-surface">{productName(c.component_product_id)}</td>
                    <td className="py-2 text-right">{formatNumber(c.quantity_required)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h4 className="mb-2 border-b border-outline-variant pb-1 text-label-upper uppercase text-on-surface-variant">
              Operations ({bom.operations.length})
            </h4>
            {bom.operations.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">No operations defined.</p>
            ) : (
              <table className="w-full text-left text-table-data">
                <thead>
                  <tr className="text-label-upper uppercase text-on-surface-variant">
                    <th className="py-2">Work Center</th>
                    <th className="py-2 text-right">Expected (min)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {bom.operations.map((o) => (
                    <tr key={o.id}>
                      <td className="py-2 text-on-surface">{o.work_center}</td>
                      <td className="py-2 text-right">{formatNumber(o.expected_duration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-outline-variant bg-surface p-4">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={onDelete} disabled={deleteMut.isPending}>
                {deleteMut.isPending ? "Deleting…" : "Confirm delete"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="text-error" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
