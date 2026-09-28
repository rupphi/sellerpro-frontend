export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const data = await response
    .json()
    .catch(() => ({ message: "Không kết nối được máy chủ." }));
  if (!response.ok)
    throw new ApiError(
      data.message || "Yêu cầu không thành công.",
      response.status,
    );
  return data;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export type Store = {
  id: string;
  name: string;
  platform: "wb" | "ozon";
  demo: boolean;
  status: string;
  lastSyncAt: string | null;
  lastGuardAt: string | null;
};
export type Product = {
  id: string;
  externalId: string;
  article: string;
  title: string;
  brand: string;
  category: string;
  image: string;
  price: number;
  discount: number;
  salePrice: number;
  minPrice: number;
  oldPrice?: number;
  stock: number | null;
  locked: boolean;
  protection: string;
  version: number;
  currency: string;
  checkedAt: string | null;
  buyerPrice?: {
    customerPrice: number | null;
    discountPercent: number | null;
    discountKind: "reported" | "price_difference";
    currency: string;
    transactionAt: string;
    collectedAt: string;
    source: "wb_sale" | "ozon_fbs" | "ozon_fbo";
  } | null;
};
export type Change = {
  id: string;
  version: number;
  price: number;
  discount: number;
  locked: boolean;
};
export type Task = {
  id: string;
  kind: string;
  status: string;
  progress: number;
  createdAt: string;
  finishedAt: string | null;
  error: string | null;
  result: any;
  attempts: number;
};
export type ProductsResponse = {
  buyerPrices?: {
    buyerPricesStatus: "pending" | "ready" | "partial" | "unavailable";
    buyerPricesCheckedAt: string | null;
  };
  lockedCount: number;
  items: Product[];
  total: number;
  page: number;
  pages: number;
  facets: { category: string; brand: string; _count: number }[];
  stats: { protection: string; _count: number }[];
};
