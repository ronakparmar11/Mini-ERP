import { Download, Plus, Search, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { exportProducts } from "@/api/products";
import { ProductDrawer } from "@/features/products/ProductDrawer";
import { ProductImportDrawer } from "@/features/products/ProductImportDrawer";
import { ProductsTable } from "@/features/products/ProductsTable";
import { useProducts } from "@/features/products/hooks";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getFriendlyError } from "@/utils/apiError";
import type { Product } from "@/types/product";

export function ProductsPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 350);
  const { data, isLoading, isFetching, error, refetch } = useProducts(search || undefined);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const onExport = async () => {
    try {
      await exportProducts();
    } catch (err) {
      toast.error(getFriendlyError(err));
    }
  };

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };
  const openEdit = (product: Product) => {
    setEditing(product);
    setDrawerOpen(true);
  };

  // Voice / deep-link: open the create drawer when navigated with state.create.
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if ((location.state as { create?: boolean } | null)?.create) {
      openCreate();
      navigate(location.pathname, { replace: true, state: null }); // clear so back/refresh won't reopen
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const count = useMemo(() => data?.length ?? 0, [data]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Products"
        subtitle="Manage inventory, monitor stock levels, and configure procurement strategies."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={onExport}>
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Import Excel
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New Product
            </Button>
          </>
        }
      />

      <div className="flex flex-col rounded-xl border border-outline-variant bg-surface shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant p-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-2 pl-10 pr-3 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-4 px-1 text-[12px] text-on-surface-variant">
            <Legend className="bg-tertiary-container" label="In Stock" />
            <Legend className="bg-[#f59e0b]" label="Low" />
            <Legend className="bg-error" label="Out" />
          </div>
        </div>

        <ProductsTable
          data={data}
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          onEdit={openEdit}
        />

        {/* Footer count */}
        <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-lowest p-3 text-[12px] text-on-surface-variant">
          <span>
            {isFetching ? "Refreshing…" : `${count} product${count === 1 ? "" : "s"}`}
            {search && ` matching "${search}"`}
          </span>
        </div>
      </div>

      <ProductDrawer open={drawerOpen} product={editing} onClose={() => setDrawerOpen(false)} />
      <ProductImportDrawer open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}
