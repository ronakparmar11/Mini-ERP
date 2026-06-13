import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createProduct,
  deleteProduct,
  importProducts,
  listProducts,
  updateProduct,
} from "@/api/products";
import type { ProductCreate, ProductUpdate } from "@/types/product";

const PRODUCTS_KEY = "products";

/** Validate (commit=false) or import (commit=true) an .xlsx of products. */
export const useImportProducts = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, commit }: { file: File; commit: boolean }) =>
      importProducts(file, commit),
    onSuccess: (res) => {
      if (res.committed) qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
};

export const useProducts = (search?: string) =>
  useQuery({
    queryKey: [PRODUCTS_KEY, { search: search ?? "" }],
    queryFn: () => listProducts(search),
  });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductCreate) => createProduct(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] }),
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ProductUpdate }) => updateProduct(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] }),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] }),
  });
};
