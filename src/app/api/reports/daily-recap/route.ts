import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolveSession } from '@/lib/auth';

function getJakartaDateRange(dateStr?: string | null) {
  let targetDate = dateStr?.trim();
  if (!targetDate) {
    // Current date in Asia/Jakarta timezone (UTC+7)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' });
    targetDate = formatter.format(now);
  }

  // Parse YYYY-MM-DD
  const parts = targetDate.split('-');
  if (parts.length !== 3) {
    throw new Error('Format tanggal tidak valid, gunakan format YYYY-MM-DD');
  }

  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);

  if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) {
    throw new Error('Nilai tanggal tidak valid');
  }

  // Asia/Jakarta is UTC+7 (no daylight saving time)
  // Day start [inclusive]: YYYY-MM-DD 00:00:00.000 WIB = (D-1) 17:00:00.000 UTC
  const start = new Date(Date.UTC(y, m - 1, d, 0 - 7, 0, 0, 0));
  // Day end [exclusive]: Next day 00:00:00.000 WIB = D 17:00:00.000 UTC
  const end = new Date(Date.UTC(y, m - 1, d + 1, 0 - 7, 0, 0, 0));

  return {
    dateStr: targetDate,
    start,
    end,
    timezone: 'Asia/Jakarta',
  };
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await resolveSession(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: sesi kasir diperlukan untuk mengakses rekap harian' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const requestedScope = (searchParams.get('scope') || 'own').toLowerCase();

    const { dateStr, start, end, timezone } = getJakartaDateRange(dateParam);

    let isAllCashiers = false;
    let targetCashierId: number | null = authUser.id;
    let scopeLabel = authUser.fullName || authUser.username;

    if (requestedScope === 'all' || (requestedScope !== 'own' && requestedScope !== authUser.id.toString())) {
      // Cross-cashier access requires explicit permission
      if (!authUser.canViewAllCashiers) {
        return NextResponse.json(
          {
            success: false,
            error: 'Akses ditolak: izin reports.viewAllCashiers diperlukan untuk melihat rekap kasir lain atau semua kasir',
          },
          { status: 403 }
        );
      }

      if (requestedScope === 'all') {
        isAllCashiers = true;
        targetCashierId = null;
        scopeLabel = 'Semua Kasir';
      } else {
        const parsedId = Number(requestedScope);
        if (!isNaN(parsedId)) {
          targetCashierId = parsedId;
          const targetUser = await prisma.user.findUnique({ where: { id: parsedId } });
          scopeLabel = targetUser ? targetUser.fullName : `Kasir ID ${parsedId}`;
        }
      }
    }

    // Query completed sales within business-day boundaries [start, end)
    const headers = await prisma.salesPOSHeader.findMany({
      where: {
        salesPOSDate: {
          gte: start,
          lt: end,
        },
        status: 'COMPLETED',
        ...(isAllCashiers
          ? {}
          : targetCashierId
          ? {
              OR: [
                { cashierId: targetCashierId },
                // If cashierId is null in legacy records, match by cashierName if applicable
                { cashierId: null, cashierName: { equals: authUser.fullName, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        details: true,
      },
      orderBy: {
        salesPOSDate: 'asc',
      },
    });

    let grossSales = 0;
    let totalDiscount = 0;
    let netSales = 0;

    const paymentBreakdown = {
      cash: 0,
      edc: 0,
      transfer: 0,
      qris: 0,
      shopee: 0,
      tokopedia: 0,
      unknown: 0,
    };

    let legacyCount = 0;

    for (const h of headers) {
      const headerGrandTotal = Number(h.grandTotal || 0);
      const headerTotalAmount = Number(h.totalAmount || headerGrandTotal);
      const headerDiscount = Number(h.discountAmount || 0);

      grossSales += headerTotalAmount;
      totalDiscount += headerDiscount;
      netSales += headerGrandTotal;

      if (!h.cashierId) {
        legacyCount += 1;
      }

      const method = (h.paymentMethod || '').trim().toUpperCase();
      switch (method) {
        case 'CASH':
        case 'TUNAI':
          paymentBreakdown.cash += headerGrandTotal;
          break;
        case 'EDC':
        case 'EDC BCA':
        case 'EDC MANDIRI':
        case 'DEBIT':
          paymentBreakdown.edc += headerGrandTotal;
          break;
        case 'TRANSFER':
        case 'TF':
          paymentBreakdown.transfer += headerGrandTotal;
          break;
        case 'QRIS':
          paymentBreakdown.qris += headerGrandTotal;
          break;
        case 'SHOPEE':
          paymentBreakdown.shopee += headerGrandTotal;
          break;
        case 'TOKOPEDIA':
        case 'TOKPED':
          paymentBreakdown.tokopedia += headerGrandTotal;
          break;
        default:
          paymentBreakdown.unknown += headerGrandTotal;
          break;
      }
    }

    const reconciledSum =
      paymentBreakdown.cash +
      paymentBreakdown.edc +
      paymentBreakdown.transfer +
      paymentBreakdown.qris +
      paymentBreakdown.shopee +
      paymentBreakdown.tokopedia +
      paymentBreakdown.unknown;

    return NextResponse.json({
      success: true,
      data: {
        date: dateStr,
        timezone,
        scope: isAllCashiers ? 'all' : 'own',
        scopeLabel,
        canViewAllCashiers: authUser.canViewAllCashiers,
        transactionCount: headers.length,
        grossSales,
        totalDiscount,
        netSales,
        reconciledSum,
        isReconciled: Math.abs(reconciledSum - netSales) < 0.01,
        legacyCount,
        paymentBreakdown,
        transactions: headers.map((h) => ({
          id: h.id.toString(),
          invoiceNo: h.salesPOSNo,
          date: h.salesPOSDate.toISOString(),
          cashierName: h.cashierName || 'Kasir Legacy',
          isLegacyCashier: !h.cashierId,
          totalAmount: Number(h.totalAmount || 0),
          discountAmount: Number(h.discountAmount || 0),
          grandTotal: Number(h.grandTotal || 0),
          paymentMethod: h.paymentMethod || 'UNKNOWN',
          itemsCount: h.details.filter((d) => !d.isVoided).length,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error in /api/reports/daily-recap:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal memuat rekap harian' }, { status: 500 });
  }
}
