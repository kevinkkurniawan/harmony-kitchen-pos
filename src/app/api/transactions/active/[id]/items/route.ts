import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPOSCapability } from '@/lib/capabilities';

/** Items may only change while the sale is still a draft. */
async function findDraft(transactionId: number) {
  return prisma.t_salesposheader.findFirst({ where: { id: transactionId, status: 'DRAFT' } });
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

    if (!(await findDraft(transactionId))) {
      return NextResponse.json({ success: false, error: 'Transaksi draft tidak ditemukan atau sudah selesai.' }, { status: 409 });
    }

    // Check if the item already exists in this transaction
    const existingItem = await prisma.t_salesposdetail.findFirst({
      where: {
        salesposheaderid: transactionId,
        inventoryid: Number(product.id),
      }
    });

    if (existingItem) {
      // Update quantity
      const newQty = Number(existingItem.qty) + Number(quantity);
      const detail = await prisma.t_salesposdetail.update({
        where: { id: existingItem.id },
        data: {
          qty: newQty,
          subtotal: newQty * Number(selectedPrice),
          modifieduser: cashierName,
        }
      });
      return NextResponse.json({ success: true, data: detail });
    } else {
      // Add new item
      const detail = await prisma.t_salesposdetail.create({
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
      return NextResponse.json({ success: true, data: detail });
    }
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

    if (!(await findDraft(transactionId))) {
      return NextResponse.json({ success: false, error: 'Transaksi draft tidak ditemukan atau sudah selesai.' }, { status: 409 });
    }

    const existingItem = await prisma.t_salesposdetail.findFirst({
      where: {
        salesposheaderid: transactionId,
        inventoryid: Number(product.id),
      }
    });

    if (!existingItem) {
      return NextResponse.json({ success: false, error: 'Item not found in transaction' }, { status: 404 });
    }

    if (Number(quantity) <= 0) {
      // Delete item
      await prisma.t_salesposdetail.delete({
        where: { id: existingItem.id }
      });
      return NextResponse.json({ success: true, action: 'deleted' });
    }

    // Update quantity
    const detail = await prisma.t_salesposdetail.update({
      where: { id: existingItem.id },
      data: {
        qty: Number(quantity),
        subtotal: Number(quantity) * Number(selectedPrice),
        modifieduser: cashierName,
      }
    });

    return NextResponse.json({ success: true, data: detail });
  } catch (err: any) {
    console.error('Failed to update item in active transaction:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
