import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPOSCapability } from '@/lib/capabilities';
import { generateInvoiceNo, storeDate } from '@/lib/pos-rules';

export async function POST(request: Request) {
  try {
    const auth = await verifyPOSCapability();
    if (auth.errorResponse) return auth.errorResponse;
    const cashierName = auth.user.name || auth.user.username || 'Kasir';

    const body = await request.json();
    const { isGrosirMode, customerId, product, quantity, selectedPrice } = body;

    if (!product || !quantity || !selectedPrice) {
      return NextResponse.json({ success: false, error: 'Missing required item fields' }, { status: 400 });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const invoiceNo = await generateInvoiceNo(tx);

      // 1. Create Draft Header
      const header = await tx.t_salesposheader.create({
        data: {
          salesposno: invoiceNo,
          salesposdate: storeDate(),
          isgrosir: Boolean(isGrosirMode),
          customerid: customerId ? Number(customerId) : null,
          status: 'DRAFT',
          createduser: cashierName,
          modifieduser: cashierName,
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
          createduser: cashierName,
          modifieduser: cashierName,
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
