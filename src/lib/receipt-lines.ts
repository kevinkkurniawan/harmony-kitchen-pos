import type { CartItem } from '@/types/pos';

// How a cart line is shown on the receipt and on the screen bill (old POS, sp_SPSalesPOSDetail_CalculateDiscount):
// a grosir line starts at the retail price and the saving is its own row, named like the old T_SalesPOSPromo
// rows: "Potongan Reseller" in reseller mode (Override Grosir 1), else "Potongan Diskon <grosir tier>".

export function grosirSavingLabel(item: CartItem): string {
  if (item.priceType === 'override_grosir1') return 'Potongan Reseller';
  return `Potongan Diskon ${item.priceType.slice(-1)}`;
}

/** Unit price the line starts from: retail when a grosir price applies, else the price charged */
export function retailUnit(item: CartItem): number {
  const isGrosir = item.priceType !== 'retail';
  return isGrosir && item.product.priceRetail > item.selectedPrice ? item.product.priceRetail : item.selectedPrice;
}

export const grossLine = (item: CartItem) => retailUnit(item) * item.quantity;
export const grosirSaving = (item: CartItem) => (retailUnit(item) - item.selectedPrice) * item.quantity;
/** Manual potongan per pcs (PIN), as its own row */
export const manualSaving = (item: CartItem) => (item.discount || 0) * item.quantity;
