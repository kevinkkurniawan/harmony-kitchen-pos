import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const headers = await prisma.t_salesposheader.findMany({
      orderBy: { createddate: 'desc' },
      take: 50,
    });
    
    // Fetch details manually if there's no relation in Prisma
    const headerIds = headers.map(h => h.id);
    const details = await prisma.t_salesposdetail.findMany({
      where: { salesposheaderid: { in: headerIds } }
    });

    // Map to POS transaction format
    const transactions = headers.map(h => {
      const hDetails = details.filter(d => d.salesposheaderid === h.id);
      return {
        id: h.id.toString(),
        invoiceNo: h.salesposno,
        date: h.createddate.toISOString(),
        time: h.createddate.toISOString(),
        cashierName: h.createduser || 'Kasir',
        mode: h.isgrosir ? 'Grosir' : 'Retail',
        subtotal: Number(h.grandtotal || 0), // Simplifying mapping
        discountAmount: 0,
        taxAmount: 0,
        serviceCharge: 0,
        total: Number(h.grandtotal || 0),
        paymentMethod: 'CASH', // Need a payment table, defaulting for now
        cashPaid: Number(h.grandtotal || 0),
        change: 0,
        isGrosirMode: h.isgrosir || false,
        notes: h.remarks || '',
        items: hDetails.map(d => ({
          product: { id: d.inventoryid.toString() }, // Placeholder for item format
          quantity: Number(d.qty || 0),
          selectedPrice: Number(d.price || 0),
          priceType: 'retail'
        }))
      };
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
      // 1. Create Header
      const header = await tx.t_salesposheader.create({
        data: {
          salesposno: invoiceNo || `INV-${Date.now()}`,
          salesposdate: new Date(),
          isgrosir: Boolean(isGrosirMode),
          customerid: customerId ? Number(customerId) : null,
          grandtotal: Number(total),
          remarks: notes || null,
          createduser: cashierName || 'Kasir',
          modifieduser: cashierName || 'Kasir',
          status: 'COMPLETED',
        },
      });

      // 2. Create Details manually since no Prisma relation
      if (items && items.length > 0) {
        const detailData = items.map((item: any) => ({
          salesposheaderid: header.id,
          inventoryid: Number(item.product.id),
          qty: Number(item.quantity),
          price: Number(item.selectedPrice),
          subtotal: Number(item.quantity) * Number(item.selectedPrice),
          remarks: item.memo || null,
          createduser: cashierName || 'Kasir',
          modifieduser: cashierName || 'Kasir',
        }));

        await tx.t_salesposdetail.createMany({
          data: detailData
        });

        // 3. Decrement stock
        for (const item of items) {
          if (!item.isVoided) {
            await tx.inventory.update({
              where: { id: Number(item.product.id) },
              data: {
                stokupdate: { decrement: Number(item.quantity) },
              },
            }).catch(e => console.log('Error updating stock', e));
          }
        }
      }

      return header;
    });

    return NextResponse.json({ success: true, data: transaction });
  } catch (err: any) {
    console.error('Failed to create transaction in PostgreSQL:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
