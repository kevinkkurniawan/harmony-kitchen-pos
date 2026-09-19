import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cashierName, isGrosirMode, customerId, product, quantity, selectedPrice } = body;

    if (!product || !quantity || !selectedPrice) {
      return NextResponse.json({ success: false, error: 'Missing required item fields' }, { status: 400 });
    }

    // Generate Invoice No: PS + YYMMDD + Random 4 digits
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const invoiceNo = `PS${dateStr}${randomCode}`;

    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Create Draft Header
      const header = await tx.t_salesposheader.create({
        data: {
          salesposno: invoiceNo,
          salesposdate: new Date(),
          isgrosir: Boolean(isGrosirMode),
          customerid: customerId ? Number(customerId) : null,
          status: 'DRAFT',
          createduser: cashierName || 'Kasir',
          modifieduser: cashierName || 'Kasir',
        },
      });

      // 2. Create the first item detail
      const detail = await tx.t_salesposdetail.create({
        data: {
          salesposheaderid: header.id,
          inventoryid: Number(product.id),
          qty: Number(quantity),
          price: Number(selectedPrice),
          subtotal: Number(quantity) * Number(selectedPrice),
          createduser: cashierName || 'Kasir',
          modifieduser: cashierName || 'Kasir',
        },
      });

      return { header, detail };
    });

    return NextResponse.json({ success: true, data: transaction.header });
  } catch (err: any) {
    console.error('Failed to create active transaction:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
