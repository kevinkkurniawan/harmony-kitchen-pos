import { Prisma } from '@prisma/client';

/**
 * Server-side business rules that must never be taken from the client:
 * customer discounts, vouchers, tax/service rates and invoice numbering.
 */

export function getCustomerDiscount(customer: {
  customertypeid?: number | null;
  description?: string | null;
}): { customerType: 'Vip' | 'Wholesale' | 'Regular'; discountPercent: number } {
  if (customer.customertypeid === 1) return { customerType: 'Vip', discountPercent: 5 };
  if (customer.customertypeid === 2) return { customerType: 'Wholesale', discountPercent: 10 };
  const match = customer.description?.match(/discount:\s*(\d+)/i);
  return { customerType: 'Regular', discountPercent: match ? Number(match[1]) : 0 };
}

export async function getCustomerDiscountPercent(
  tx: Prisma.TransactionClient,
  customerId: number | null | undefined
): Promise<number> {
  if (!customerId) return 0;
  const customer = await tx.customer.findUnique({ where: { id: Number(customerId) } });
  if (!customer) throw new Error('Member/pelanggan tidak ditemukan.');
  return getCustomerDiscount(customer).discountPercent;
}

const VOUCHERS: Record<string, number> = {
  HARMONY10: 10000,
};

export function getVoucherDiscount(code: string | null | undefined): number {
  return VOUCHERS[(code || '').trim().toUpperCase()] || 0;
}

function envPercent(name: string): number {
  const value = Number(process.env[name] || 0);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

export function getTaxRates(): { taxPercent: number; servicePercent: number } {
  return {
    taxPercent: envPercent('POS_TAX_PERCENT'),
    servicePercent: envPercent('POS_SERVICE_PERCENT'),
  };
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** YYMMDD in store time (WIB), so sales after midnight local time get the right date. */
function storeDateCode(date = new Date()): string {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(2, 10).replace(/-/g, '');
}

/** Today's store (WIB) calendar date, for DATE columns such as salesposdate. */
export function storeDate(date = new Date()): Date {
  return new Date(new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10));
}

/**
 * Next sequential invoice number for today: PS + YYMMDD + 4+ digit sequence.
 * Must run inside a transaction: the advisory lock serialises concurrent callers until commit.
 * (ERP numbers use a 3-digit sequence, so the 4+ digit pattern never collides with them.)
 */
export async function generateInvoiceNo(tx: Prisma.TransactionClient): Promise<string> {
  const prefix = `PS${storeDateCode()}`;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${prefix}))::text`;
  const rows = await tx.$queryRaw<{ seq: number | null }[]>`
    SELECT max(substring(salesposno from 9)::int) AS seq
    FROM t_salesposheader
    WHERE salesposno ~ ${`^${prefix}[0-9]{4,}$`}`;
  const next = Number(rows[0]?.seq || 0) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}
