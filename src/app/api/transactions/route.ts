import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, data: transactions });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      invoiceNo,
      cashierName,
      orderType,
      tableNo,
      serverName,
      customerId,
      subtotal,
      discountAmount,
      voucherCode,
      taxAmount,
      serviceCharge,
      total,
      paymentMethod,
      cashPaid,
      change,
      isGrosirMode,
      notes,
      items,
    } = body;

    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Create Transaction Record
      const createdTx = await tx.transaction.create({
        data: {
          invoiceNo: invoiceNo || `INV-${Date.now()}`,
          cashierName: cashierName || 'Kasir',
          orderType: orderType || 'Dine-In',
          tableNo: tableNo || null,
          serverName: serverName || null,
          customerId: customerId || null,
          subtotal: Number(subtotal),
          discountAmount: Number(discountAmount || 0),
          voucherCode: voucherCode || null,
          taxAmount: Number(taxAmount || 0),
          serviceCharge: Number(serviceCharge || 0),
          total: Number(total),
          paymentMethod: paymentMethod || 'Cash',
          cashPaid: Number(cashPaid),
          change: Number(change),
          isGrosirMode: Boolean(isGrosirMode),
          notes: notes || null,
          items: {
            create: items.map((item: any) => ({
              productId: item.product.id,
              quantity: Number(item.quantity),
              selectedPrice: Number(item.selectedPrice),
              priceType: item.priceType || 'retail',
              memo: item.memo || null,
              isVoided: Boolean(item.isVoided),
              voidReason: item.voidReason || null,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // 2. Decrement product stock for non-voided items
      for (const item of items) {
        if (!item.isVoided) {
          await tx.product.update({
            where: { id: item.product.id },
            data: {
              stock: {
                decrement: Number(item.quantity),
              },
            },
          });
        }
      }

      // 3. Update table status if applicable
      if (tableNo) {
        await tx.table.updateMany({
          where: { tableNo: tableNo },
          data: { status: 'occupied', currentOrderId: createdTx.id },
        });
      }

      return createdTx;
    });

    return NextResponse.json({ success: true, data: transaction });
  } catch (err: any) {
    console.error('Failed to create transaction in PostgreSQL:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
