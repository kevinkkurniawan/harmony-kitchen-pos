import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateCanonicalSalesTotal } from '../src/lib/sales-calculation';
import { calculateEffectivePrice, clampItemDiscount, PromoRule, WholesaleItemPrices } from '../src/lib/wholesale-rules';

describe('POS Canonical Sales Calculation Suite', () => {
  it('Plain retail item calculation without discounts', () => {
    const result = calculateCanonicalSalesTotal({
      subtotal: 150000,
    });

    assert.strictEqual(result.subtotal, 150000);
    assert.strictEqual(result.totalDiscount, 0);
    assert.strictEqual(result.afterDiscount, 150000);
    assert.strictEqual(result.taxAmount, 0);
    assert.strictEqual(result.serviceAmount, 0);
    assert.strictEqual(result.grandTotal, 150000);
  });

  it('Member discount + voucher discount + manual discount nominal', () => {
    const result = calculateCanonicalSalesTotal({
      subtotal: 200000,
      memberDiscountPercent: 5, // 10,000
      voucherDiscountAmount: 10000, // 10,000
      manualDiscountMode: 'NOMINAL',
      manualDiscountValue: 15000, // 15,000
      taxPercent: 11,
      servicePercent: 5,
    });

    assert.strictEqual(result.memberDiscountAmount, 10000);
    assert.strictEqual(result.voucherDiscountAmount, 10000);
    assert.strictEqual(result.manualDiscountAmount, 15000);
    assert.strictEqual(result.totalDiscount, 35000);
    assert.strictEqual(result.afterDiscount, 165000);
    
    // Tax 11% of 165,000 = 18,150
    assert.strictEqual(result.taxAmount, 18150);
    // Service 5% of 165,000 = 8,250
    assert.strictEqual(result.serviceAmount, 8250);
    // Grand total = 165,000 + 18,150 + 8,250 = 191,400
    assert.strictEqual(result.grandTotal, 191400);
  });

  it('Manual discount percentage capping at subtotal', () => {
    const result = calculateCanonicalSalesTotal({
      subtotal: 50000,
      manualDiscountMode: 'PERCENT',
      manualDiscountValue: 20, // 10,000
      taxPercent: 0,
      servicePercent: 0,
    });

    assert.strictEqual(result.manualDiscountAmount, 10000);
    assert.strictEqual(result.afterDiscount, 40000);
    assert.strictEqual(result.grandTotal, 40000);
  });

  it('Total discount cannot exceed subtotal (zero-total cap)', () => {
    const result = calculateCanonicalSalesTotal({
      subtotal: 50000,
      memberDiscountPercent: 50, // 25,000
      voucherDiscountAmount: 30000, // 25,000 capped
      manualDiscountMode: 'NOMINAL',
      manualDiscountValue: 50000, // 0 capped
    });

    assert.strictEqual(result.memberDiscountAmount, 25000);
    assert.strictEqual(result.voucherDiscountAmount, 25000);
    assert.strictEqual(result.manualDiscountAmount, 0);
    assert.strictEqual(result.totalDiscount, 50000);
    assert.strictEqual(result.afterDiscount, 0);
    assert.strictEqual(result.grandTotal, 0);
  });

  // K bands as in prod m_promo; prices of "Edelmann Essen Dinner Knife"
  const K1: PromoRule[] = [
    { tier: 3, qtyMin: 12, qtyMax: 59 },
    { tier: 2, qtyMin: 60, qtyMax: 119 },
    { tier: 1, qtyMin: 120, qtyMax: 999 },
  ];
  const K2: PromoRule[] = [
    { tier: 3, qtyMin: 6, qtyMax: 29 },
    { tier: 2, qtyMin: 30, qtyMax: 60 },
    { tier: 1, qtyMin: 61, qtyMax: 999 },
  ];
  const K3: PromoRule[] = [{ tier: 3, qtyMin: 3, qtyMax: 12 }];
  const knife = { price: 32000, grosir1: 28000, grosir2: 30000, grosir3: 31000 };
  const price = (item: WholesaleItemPrices, qty: number, override = false) => calculateEffectivePrice(item, qty, override).effectivePrice;

  it('K1 bands: 12 pcs grosir 3, 60 pcs grosir 2, 120 pcs grosir 1', () => {
    const item = { ...knife, promoRules: K1 };
    assert.strictEqual(price(item, 11), 32000);
    assert.strictEqual(price(item, 12), 31000);
    assert.strictEqual(price(item, 59), 31000);
    assert.strictEqual(price(item, 60), 30000);
    assert.strictEqual(price(item, 119), 30000);
    assert.strictEqual(price(item, 120), 28000);
    assert.strictEqual(calculateEffectivePrice(item, 120).priceSource, 'GROSIR_1');
  });

  it('K2 bands and K3 above its last band stays retail, like the legacy POS', () => {
    assert.strictEqual(price({ ...knife, promoRules: K2 }, 6), 31000);
    assert.strictEqual(price({ ...knife, promoRules: K2 }, 61), 28000);
    assert.strictEqual(price({ ...knife, promoRules: K3 }, 12), 31000);
    assert.strictEqual(price({ ...knife, promoRules: K3 }, 13), 32000);
  });

  it('No K category, or a grosir price not set, stays retail', () => {
    assert.strictEqual(price({ ...knife, promoRules: null }, 500), 32000);
    assert.strictEqual(price({ ...knife, grosir3: 0, promoRules: K1 }, 12), 32000);
  });

  it('Override Grosir 1 prices any qty at grosir 1, retail when grosir 1 is not set', () => {
    assert.strictEqual(price({ ...knife, promoRules: K1 }, 1, true), 28000);
    assert.strictEqual(calculateEffectivePrice({ ...knife, grosir1: 0 }, 1, true).priceSource, 'RETAIL');
  });

  it('Per-pcs potongan is a whole Rupiah between 0 and the unit price', () => {
    assert.strictEqual(clampItemDiscount(2000, 30000), 2000);
    assert.strictEqual(clampItemDiscount(-5, 30000), 0);
    assert.strictEqual(clampItemDiscount(40000, 30000), 30000);
    assert.strictEqual(clampItemDiscount('abc', 30000), 0);
    assert.strictEqual(clampItemDiscount(1999.6, 30000), 2000);
  });
});
