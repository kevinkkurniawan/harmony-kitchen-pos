import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const transactionId = Number(params.id);
    const body = await request.json();
    const { cashierName, product, quantity, selectedPrice } = body;

    if (!product || !quantity || !selectedPrice) {
      return NextResponse.json({ success: false, error: 'Missing required item fields' }, { status: 400 });
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
          modifieduser: cashierName || 'Kasir',
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
          createduser: cashierName || 'Kasir',
          modifieduser: cashierName || 'Kasir',
        },
      });
      return NextResponse.json({ success: true, data: detail });
    }
  } catch (err: any) {
    console.error('Failed to add item to active transaction:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const transactionId = Number(params.id);
    const body = await request.json();
    const { cashierName, product, quantity, selectedPrice } = body;

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
        modifieduser: cashierName || 'Kasir',
      }
    });
    
    return NextResponse.json({ success: true, data: detail });
  } catch (err: any) {
    console.error('Failed to update item in active transaction:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
