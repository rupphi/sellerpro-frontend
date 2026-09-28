/** Display only. Never send this derived percentage as Ozon's discount field. */
export function ozonReferenceDiscount(price: number, oldPrice?: number): number | null {
  if (!Number.isSafeInteger(price) || price <= 0 || !Number.isSafeInteger(oldPrice) || !oldPrice || oldPrice < price) return null;
  return Math.round((1 - price / oldPrice) * 10000) / 100;
}
