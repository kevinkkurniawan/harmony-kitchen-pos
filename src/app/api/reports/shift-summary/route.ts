import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPOSCapability } from '@/lib/capabilities';

export async function GET(request: Request) {
  try {
    const auth = await verifyPOSCapability();
    if (auth.errorResponse) return auth.errorResponse;

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
        status: 'COMPLETED',
        createduser: cashierName !== 'Kasir' ? cashierName : undefined,
      },
    });

    const headerIds = headers.map((h) => h.id);
    const details = await prisma.t_salesposdetail.findMany({
      where: { salesposheaderid: { in: headerIds } },
    });

    const payments = await prisma.t_salespayment.findMany({
      where: { salesposid: { in: headerIds } },
    });

    let grossSales = 0;
    let totalDiscount = 0; // Might need to aggregate discounts from details or header
    let netSales = 0;
    let taxCollected = 0;
    let serviceCollected = 0;

    const breakdown = {
      cash: 0,
      edcBca: 0,
      edcMandiri: 0,
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

      // Classify by the method name on the sale; the numeric payment code changed
      // to the legacy m_paymenttype.code, so older POS rows use different numbers
      const method = (tx.paymenttypecode || 'CASH').toUpperCase();
      if (method === 'EDC BCA') breakdown.edcBca += grandTotal;
      else if (method === 'EDC MANDIRI') breakdown.edcMandiri += grandTotal;
      else if (method === 'TRANSFER') breakdown.transfer += grandTotal;
      else if (method === 'QRIS') breakdown.qris += grandTotal;
      else if (method === 'SHOPEE') breakdown.shopee += grandTotal;
      else if (method === 'TOKOPEDIA') breakdown.tokopedia += grandTotal;
      else breakdown.cash += grandTotal;

      const txDetails = details.filter((d) => d.salesposheaderid === tx.id);
      for (const item of txDetails) {
        // Void check if supported, assuming false for now
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
