export type AutomationSettings = {
  timezone: string;
  buyer_prices: { enabled: boolean; times: string[] };
  guard: { enabled: boolean; times: string[] };
  catalog: { enabled: boolean; times: string[] };
  sales: { enabled: boolean; times: string[] };
  finance: { enabled: boolean; times: string[] };
  initializationGuard: boolean;
  initialization: ("catalog" | "pricing" | "sales" | "finance")[];
};
export type AutomationResponse = { settings: AutomationSettings; updatedAt: string | null };
export const stepNames = {
  catalog: "Sản phẩm",
  pricing: "Giá cả",
  buyer_prices: "Giá cả & chiết khấu",
  sales: "Phễu bán hàng",
  finance: "Báo cáo tài chính",
  guard: "Kiểm tra bảo vệ giá",
};
