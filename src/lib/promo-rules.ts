import { Prisma } from '@prisma/client';
import type { PromoRule } from '@/lib/wholesale-rules';

/**
 * Qty bands per K category (m_inventory.promobundle → m_promo), as the legacy POS reads them:
 * only per-item ("partial") rows; the bill-total "Global" promo (isgroup) is not used by this POS.
 */
export async function loadPromoRules(db: Pick<Prisma.TransactionClient, 'promo'>): Promise<Map<number, PromoRule[]>> {
  const rows = await db.promo.findMany({ where: { ispartial: true, isgroup: false, isactive: true } });
  const byBundle = new Map<number, PromoRule[]>();
  for (const row of rows) {
    const tier = Number(row.promogrosir);
    if (tier !== 1 && tier !== 2 && tier !== 3) continue;
    const rules = byBundle.get(row.promobundle) || [];
    rules.push({ tier, qtyMin: Number(row.qtymin || 0), qtyMax: Number(row.qtymax || 0) });
    byBundle.set(row.promobundle, rules);
  }
  return byBundle;
}
