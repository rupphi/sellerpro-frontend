export type Summary = {
  orders: number; units: number; orderedValue: number | null; fbo: number; fbs: number; unknown: number;
  sales: { value: number | null; known: number; missing: number; count: number; units: number };
  returns: { value: number | null; known: number; missing: number; count: number; units: number };
  netRevenue: number | null; cancelled: number;
  cohort: { ordered: number; delivered: number; returned: number; cancelled: number; pending: number };
  ordersReady: boolean; salesReady: boolean;
};
export type Traffic = { views: number; carts: number; orders: number; buyouts: number };
export type Report = {
  current: Summary; previous: Summary; timezone: string; warnings: string[];
  period: { from: string; to: string; previousFrom: string; previousTo: string };
  daily: { day: string; orders: number; revenue: number | null }[];
  sources: { source: string; status: string; checkedAt: string; coveredTo: string | null }[];
  products: (Summary & { productKey: string; article: string; title: string })[];
  traffic: { products: { productKey: string; article: string; title: string; current: Traffic; previous: Traffic | null }[] } | null;
  trafficCheckedAt: string | null;
  task: { id: string; status: string; progress: number } | null;
};
export type SalesEvent = {
  id: string; orderKey: string; kind: string; occurredAt: string; collectedAt: string;
  channel: string; article: string; title: string; quantity: number; amount: number | null;
  currency: string; status: string; source: string;
};
export const eventNames: Record<string, string> = { order: "Đặt hàng", sale: "Đã bán", return: "Trả hàng" };
export const statusNames: Record<string, string> = { ordered: "Đã đặt", processing: "Đang xử lý", delivered: "Đã bán / giao", cancelled: "Đã hủy", returned: "Đã trả" };
export const channelNames: Record<string, string> = { fbo: "Kho sàn · FBO/FBW", fbs: "Kho người bán · FBS", unknown: "Chưa rõ kho" };
