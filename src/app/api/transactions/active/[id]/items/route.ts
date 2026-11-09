import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { verifyPOSCapability } from '@/lib/capabilities';

const NOT_A_DRAFT = 'Transaksi draft tidak ditemukan atau sudah selesai.';
// A running checkout holds the header lock for a few seconds; wait for it instead of failing with 500
const ITEM_TX_OPTIONS = { maxWait: 10000, timeout: 30000 };

/**
 * Items may only change while the sale is still a draft. Touching the header row takes the same row
 * lock the checkout claim takes, so a late item sync either finishes before checkout or sees the sale
 * completed and changes nothing (otherwise it could alter lines of a sale whose stock is already booked).
 */
async function lockDraft(tx: Prisma.TransactionClient, transactionId: number, cashierName: string) {
  const locked = await tx.t_salesposheader.updateMany({
    where: { id: transactionId, status: 'DRAFT' },
    data: { modifieduser: cashierName, modifieddate: new Date() },
  });
  return locked.count > 0;
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyPOSCapability();
    if (auth.errorResponse) return auth.errorResponse;
    const cashierName = auth.user.name || auth.user.username || 'Kasir';

    const params = await props.params;
    const transactionId = Number(params.id);
    const body = await request.json();
    const { product, quantity, selectedPrice } = body;

    if (!product || !quantity || !selectedPrice) {
      return NextResponse.json({ success: false, error: 'Missing required item fields' }, { status: 400 });
    }

    const detail = await prisma.$transaction(async (tx) => {
      if (!(await lockDraft(tx, transactionId, cashierName))) return null;

      // Check if the item already exists in this transaction
      const existingItem = await tx.t_salesposdetail.findFirst({
        where: {
          salesposheaderid: transactionId,
          inventoryid: Number(product.id),
        }
      });

      if (existingItem) {
        // Update quantity
        const newQty = Number(existingItem.qty) + Number(quantity);
        return tx.t_salesposdetail.update({
          where: { id: existingItem.id },
          data: {
            qty: newQty,
            subtotal: newQty * Number(selectedPrice),
            modifieduser: cashierName,
          }
        });
      }

      // Add new item
      return tx.t_salesposdetail.create({
        data: {
          salesposheaderid: transactionId,
          inventoryid: Number(product.id),
          qty: Number(quantity),
          price: Number(selectedPrice),
          subtotal: Number(quantity) * Number(selectedPrice),
          createduser: cashierName,
          modifieduser: cashierName,
        },
      });
    }, ITEM_TX_OPTIONS);

    if (!detail) {
      return NextResponse.json({ success: false, error: NOT_A_DRAFT }, { status: 409 });
    }
    return NextResponse.json({ success: true, data: detail });
  } catch (err: any) {
    console.error('Failed to add item to active transaction:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyPOSCapability();
    if (auth.errorResponse) return auth.errorResponse;
    const cashierName = auth.user.name || auth.user.username || 'Kasir';

    const params = await props.params;
    const transactionId = Number(params.id);
    const body = await request.json();
    const { product, quantity, selectedPrice } = body;

    const result = await prisma.$transaction(async (tx) => {
      if (!(await lockDraft(tx, transactionId, cashierName))) return { status: 409 as const };

      const existingItem = await tx.t_salesposdetail.findFirst({
        where: {
          salesposheaderid: transactionId,
          inventoryid: Number(product.id),
        }
      });

      if (!existingItem) return { status: 404 as const };

      if (Number(quantity) <= 0) {
        // Delete item
        await tx.t_salesposdetail.delete({
          where: { id: existingItem.id }
        });
        return { status: 200 as const, action: 'deleted' };
      }

      // Update quantity
      const detail = await tx.t_salesposdetail.update({
        where: { id: existingItem.id },
        data: {
          qty: Number(quantity),
          subtotal: Number(quantity) * Number(selectedPrice),
          modifieduser: cashierName,
        }
      });
      return { status: 200 as const, detail };
    }, ITEM_TX_OPTIONS);

    if (result.status === 409) {
      return NextResponse.json({ success: false, error: NOT_A_DRAFT }, { status: 409 });
    }
    if (result.status === 404) {
      return NextResponse.json({ success: false, error: 'Item not found in transaction' }, { status: 404 });
    }
    if (result.action === 'deleted') {
      return NextResponse.json({ success: true, action: 'deleted' });
    }
    return NextResponse.json({ success: true, data: result.detail });
  } catch (err: any) {
    console.error('Failed to update item in active transaction:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
