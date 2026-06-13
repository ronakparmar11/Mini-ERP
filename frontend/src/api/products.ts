import type { Product, ProductCreate, ProductUpdate } from "@/types/product";

import { api } from "./axios";

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
