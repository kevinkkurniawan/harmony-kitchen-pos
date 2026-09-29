import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateCanonicalSalesTotal } from '../src/lib/sales-calculation';
import { calculateEffectivePrice } from '../src/lib/wholesale-rules';

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

  it('Wholesale tier rule calculation matching categories', () => {
    const category = {
      id: 1,
      tier1_minqty: 5,
      tier2_minqty: 10,
      tier3_minqty: 20,
    };

    const item = {
      price: 100000,
      grosir1: 95000,
      grosir2: 90000,
      grosir3: 85000,
      wholesaleCategory: category,
    };

    // Retail (qty 4)
    assert.strictEqual(calculateEffectivePrice(item, 4, false).effectivePrice, 100000);
    // Tier 1 (qty 5)
    assert.strictEqual(calculateEffectivePrice(item, 5, false).effectivePrice, 95000);
    // Tier 2 (qty 12)
    assert.strictEqual(calculateEffectivePrice(item, 12, false).effectivePrice, 90000);
    // Tier 3 (qty 25)
    assert.strictEqual(calculateEffectivePrice(item, 25, false).effectivePrice, 85000);
    // Override Grosir 1 (qty 2 with override active)
    assert.strictEqual(calculateEffectivePrice(item, 2, true).effectivePrice, 95000);
  });
});
