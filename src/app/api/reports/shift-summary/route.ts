import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cashierName = searchParams.get('cashierName') || 'Kasir';

    // Start of today (00:00:00) and End of today (23:59:59)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        items: true,
      },
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

    for (const tx of transactions) {
      grossSales += tx.subtotal;
      totalDiscount += tx.discountAmount;
      netSales += tx.total;
      taxCollected += tx.taxAmount;
      serviceCollected += tx.serviceCharge;

      const pm = (tx.paymentMethod || 'CASH').toUpperCase();
      if (pm === 'CASH' || pm === 'TUNAI') {
        breakdown.cash += tx.total;
      } else if (pm === 'EDC' || pm === 'DEBIT' || pm === 'KREDIT') {
        breakdown.edc += tx.total;
      } else if (pm === 'TRANSFER' || pm === 'TF') {
        breakdown.transfer += tx.total;
      } else if (pm === 'QRIS') {
        breakdown.qris += tx.total;
      } else if (pm === 'SHOPEE') {
        breakdown.shopee += tx.total;
      } else if (pm === 'TOKOPEDIA' || pm === 'TOKPED') {
        breakdown.tokopedia += tx.total;
      } else {
        breakdown.cash += tx.total;
      }

      for (const item of tx.items) {
        if (item.isVoided) {
          voidCount += 1;
          voidTotalAmount += item.selectedPrice * item.quantity;
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
        totalTransactions: transactions.length,
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
