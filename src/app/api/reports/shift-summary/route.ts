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

    const headers = await prisma.t_salesposheader.findMany({
      where: {
        createddate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const headerIds = headers.map((h) => h.id);
    const details = await prisma.t_salesposdetail.findMany({
      where: { salesposheaderid: { in: headerIds } },
    });

    let grossSales = 0;
    let totalDiscount = 0; // Might need to aggregate discounts from details or header
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
      const grandTotal = Number(tx.grandtotal || 0);
      grossSales += grandTotal;
      netSales += grandTotal;

      // Currently mapping everything to cash since there's no payment type in header
      breakdown.cash += grandTotal;

      const txDetails = details.filter((d) => d.salesposheaderid === tx.id);
      for (const item of txDetails) {
        // Void check if supported, assuming false for now
        // if (item.isVoided) {
        //   voidCount += 1;
        //   voidTotalAmount += Number(item.price) * Number(item.qty);
        // }
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
