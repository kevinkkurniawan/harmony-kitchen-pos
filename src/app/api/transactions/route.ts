import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPaginationParams, createPaginatedResponse } from '@/lib/pagination';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const paginationParams = getPaginationParams(request, 50, 1000);

    const where = q
      ? {
          OR: [
            { invoiceNo: { contains: q, mode: 'insensitive' as const } },
            { cashierName: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: {
          customer: true,
          items: {
            include: { product: true },
          },
        },
        orderBy: { date: 'desc' },
        skip: paginationParams.skip,
        take: paginationParams.limit,
      }),
    ]);

    return createPaginatedResponse(transactions, total, paginationParams);
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
      mode,
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
      // 1. Create Transaction Record (Matches POS repo)
      const createdTx = await tx.transaction.create({
        data: {
          invoiceNo: invoiceNo || `INV-${Date.now()}`,
          cashierName: cashierName || 'Kasir',
          mode: mode || (isGrosirMode ? 'Grosir' : 'Retail'),
          customerId: customerId || null,
          subtotal: Number(subtotal),
          discountAmount: Number(discountAmount || 0),
          voucherCode: voucherCode || null,
          taxAmount: Number(taxAmount || 0),
          serviceCharge: Number(serviceCharge || 0),
          total: Number(total),
          paymentMethod: paymentMethod || 'Tunai',
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

      return createdTx;
    });

    return NextResponse.json({ success: true, data: transaction });
  } catch (err: any) {
    console.error('Failed to create transaction in PostgreSQL:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
