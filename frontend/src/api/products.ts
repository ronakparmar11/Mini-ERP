import type { Product, ProductCreate, ProductUpdate } from "@/types/product";
import type { ImportResult } from "@/types/productImport";

import { api } from "./axios";

/** Trigger a browser download for a fetched blob. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const downloadImportTemplate = (): Promise<void> =>
  api
    .get("/products/import-template", { responseType: "blob" })
    .then((r) => saveBlob(r.data, "product_import_template.xlsx"));

export const exportProducts = (): Promise<void> =>
  api
    .get("/products/export", { responseType: "blob" })
    .then((r) => saveBlob(r.data, "products_export.xlsx"));

/** Validate (commit=false) or import (commit=true) products from an .xlsx. */
export const importProducts = (file: File, commit: boolean): Promise<ImportResult> => {
  const form = new FormData();
  form.append("file", file);
  return api
    .post<ImportResult>("/products/import", form, {
      params: { commit },
      headers: { "Content-Type": undefined as unknown as string },
    })
    .then((r) => r.data);
};

export const listProducts = (search?: string): Promise<Product[]> =>
  api
    .get<Product[]>("/products", { params: search ? { search } : undefined })
    .then((r) => r.data);

export const getProduct = (id: number): Promise<Product> =>
  api.get<Product>(`/products/${id}`).then((r) => r.data);

export const createProduct = (body: ProductCreate): Promise<Product> =>
  api.post<Product>("/products", body).then((r) => r.data);

export const updateProduct = (id: number, body: ProductUpdate): Promise<Product> =>
  api.patch<Product>(`/products/${id}`, body).then((r) => r.data);

export const deleteProduct = (id: number): Promise<void> =>
  api.delete(`/products/${id}`).then(() => undefined);
