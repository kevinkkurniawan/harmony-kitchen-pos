export interface CalculationInput {
  subtotal: number;
  memberDiscountPercent?: number;
  voucherDiscountAmount?: number;
  manualDiscountMode?: 'PERCENT' | 'NOMINAL' | string;
  manualDiscountValue?: number;
  taxPercent?: number;
  servicePercent?: number;
}

export interface CalculationResult {
  subtotal: number;
  memberDiscountPercent: number;
  memberDiscountAmount: number;
  voucherDiscountAmount: number;
  manualDiscountMode: string;
  manualDiscountValue: number;
  manualDiscountAmount: number;
  totalDiscount: number;
  afterDiscount: number;
  taxPercent: number;
  taxAmount: number;
  servicePercent: number;
  serviceAmount: number;
  grandTotal: number;
}

/**
 * Pure canonical sales calculation matching POS and ERP standards.
 * Calculation Sequence:
 * Subtotal -> Member Discount -> Voucher Discount -> Manual Discount -> Subtotal After Discount -> Service Charge -> Tax -> Grand Total
 * Rounding: Standard half-up integer Rupiah rounding.
 */
export function calculateCanonicalSalesTotal(input: CalculationInput): CalculationResult {
  const subtotal = Math.max(0, Math.round(input.subtotal || 0));

  // 1. Member discount
  const memberPct = Math.max(0, Math.min(100, Number(input.memberDiscountPercent || 0)));
  const memberDiscountAmount = Math.round((subtotal * memberPct) / 100);

  // 2. Voucher discount
  const rawVoucher = Math.max(0, Math.round(Number(input.voucherDiscountAmount || 0)));
  const maxVoucherAllowed = Math.max(0, subtotal - memberDiscountAmount);
  const voucherDiscountAmount = Math.min(rawVoucher, maxVoucherAllowed);

  // 3. Manual discount
  const mode = (input.manualDiscountMode || 'NOMINAL').toUpperCase();
  const rawManualVal = Math.max(0, Number(input.manualDiscountValue || 0));
  let calculatedManualDiscount = 0;

  if (rawManualVal > 0) {
    if (mode === 'PERCENT') {
      const pct = Math.min(100, rawManualVal);
      calculatedManualDiscount = Math.round((subtotal * pct) / 100);
    } else {
      calculatedManualDiscount = Math.round(rawManualVal);
    }
  }

  // Ensure total discount does not exceed subtotal
  const remainingAfterMemberAndVoucher = Math.max(0, subtotal - memberDiscountAmount - voucherDiscountAmount);
  const manualDiscountAmount = Math.min(calculatedManualDiscount, remainingAfterMemberAndVoucher);

  // 4. Totals and base for tax/service
  const totalDiscount = memberDiscountAmount + voucherDiscountAmount + manualDiscountAmount;
  const afterDiscount = Math.max(0, subtotal - totalDiscount);

  // 5. Tax & Service
  const taxPct = Math.max(0, Number(input.taxPercent || 0));
  const servicePct = Math.max(0, Number(input.servicePercent || 0));

  const taxAmount = Math.round((afterDiscount * taxPct) / 100);
  const serviceAmount = Math.round((afterDiscount * servicePct) / 100);

  // 6. Grand Total
  const grandTotal = afterDiscount + taxAmount + serviceAmount;

  return {
    subtotal,
    memberDiscountPercent: memberPct,
    memberDiscountAmount,
    voucherDiscountAmount,
    manualDiscountMode: mode,
    manualDiscountValue: rawManualVal,
    manualDiscountAmount,
    totalDiscount,
    afterDiscount,
    taxPercent: taxPct,
    taxAmount,
    servicePercent: servicePct,
    serviceAmount,
    grandTotal,
  };
}
