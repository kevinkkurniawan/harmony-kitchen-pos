/** One qty band of an item's price category (K1, K2, ...), from m_promo. */
export interface PromoRule {
  tier: 1 | 2 | 3;
  qtyMin: number;
  qtyMax: number;
}

export interface WholesaleItemPrices {
  price: number;
  grosir1?: number | null;
  grosir2?: number | null;
  grosir3?: number | null;
  /** Qty bands of the item's K category; none means the item never gets a grosir price on its own */
  promoRules?: PromoRule[] | null;
}

export interface EffectivePriceResult {
  effectivePrice: number;
  priceSource: 'RETAIL' | 'GROSIR_1' | 'GROSIR_2' | 'GROSIR_3' | 'OVERRIDE_GROSIR_1';
  tier?: 1 | 2 | 3;
  isOverrideApplied?: boolean;
}

/**
 * Unit price of one cart line, matching the legacy POS (sp_SPSalesPOSDetail_CalculateDiscount):
 * - Override Grosir 1 (reseller mode) prices every item at grosir 1.
 * - Otherwise the line qty picks the band of the item's K category (qtyMin..qtyMax, inclusive);
 *   a qty outside every band, like K3 above 12 pcs, stays at the retail price.
 * A grosir price of 0 or empty means "not set" and falls back to retail.
 */
export function calculateEffectivePrice(
  item: WholesaleItemPrices,
  qty: number,
  isCartOverrideGrosir1 = false
): EffectivePriceResult {
  const retailPrice = Number(item.price) || 0;
  const grosir = { 1: Number(item.grosir1) || 0, 2: Number(item.grosir2) || 0, 3: Number(item.grosir3) || 0 };

  if (isCartOverrideGrosir1) {
    return grosir[1] > 0
      ? { effectivePrice: grosir[1], priceSource: 'OVERRIDE_GROSIR_1', tier: 1, isOverrideApplied: true }
      : { effectivePrice: retailPrice, priceSource: 'RETAIL', isOverrideApplied: false };
  }

  const band = qty > 0 ? item.promoRules?.find((r) => qty >= r.qtyMin && qty <= r.qtyMax) : undefined;
  if (band && grosir[band.tier] > 0) {
    return { effectivePrice: grosir[band.tier], priceSource: `GROSIR_${band.tier}`, tier: band.tier };
  }

  return { effectivePrice: retailPrice, priceSource: 'RETAIL' };
}

/** Per-pcs manual discount of a line, kept between 0 and the unit price (whole Rupiah). */
export function clampItemDiscount(discount: unknown, unitPrice: number): number {
  const value = Math.round(Number(discount) || 0);
  return Math.min(Math.max(0, value), Math.max(0, unitPrice));
}
