import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cashierName = searchParams.get('cashierName') || 'Kasir';

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const headers = await prisma.salesPOSHeader.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: { details: true },
    });

    let grossSales = 0;
    let totalDiscount = 0;
    let netSales = 0;
    let taxCollected = 0;
    let serviceCollected = 0;

    const breakdown = {
      cash: 0,
      edc: 0,
      transfer: 0,
      qris: 0,
      shopee: 0,
      tokopedia: 0,
    };

    let voidCount = 0;
    let voidTotalAmount = 0;

    for (const tx of headers) {
      const grandTotal = Number(tx.grandTotal || 0);
      const discount = Number(tx.discountAmount || 0);
      const subtotal = Number(tx.totalAmount || (grandTotal + discount));

      grossSales += subtotal;
      totalDiscount += discount;
      netSales += grandTotal;
      taxCollected += Number(tx.taxAmount || 0);
      serviceCollected += Number(tx.serviceCharge || 0);

      const method = (tx.paymentMethod || 'CASH').toUpperCase();
      if (method.includes('CASH') || method.includes('TUNAI')) {
        breakdown.cash += grandTotal;
      } else if (method.includes('QRIS')) {
        breakdown.qris += grandTotal;
      } else if (method.includes('TRANSFER')) {
        breakdown.transfer += grandTotal;
      } else if (method.includes('SHOPEE')) {
        breakdown.shopee += grandTotal;
      } else if (method.includes('TOKOPEDIA')) {
        breakdown.tokopedia += grandTotal;
      } else {
        breakdown.edc += grandTotal;
      }

      for (const item of tx.details || []) {
        if (item.isVoided) {
          voidCount += 1;
          voidTotalAmount += Number(item.price) * Number(item.qty);
        }
      }
    }

    const expenses = 0;
    const cashToDeposit = Math.max(0, breakdown.cash - expenses);

    return NextResponse.json({
      success: true,
      data: {
        cashierName,
        startTime: '08:00',
        endTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }),
        totalTransactions: headers.length,
        grossSales,
        totalDiscount,
        netSales,
        taxCollected,
        serviceCollected,
        paymentBreakdown: breakdown,
        expenses,
        cashToDeposit,
        cashInDrawer: breakdown.cash,
        voidCount,
        voidTotalAmount,
      },
    });
  } catch (err: any) {
    console.error('Failed to calculate shift summary report:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

