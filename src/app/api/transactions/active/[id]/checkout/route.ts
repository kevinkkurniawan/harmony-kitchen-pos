import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const transactionId = Number(params.id);
    const body = await request.json();
    
    const {
      cashierName,
      subtotal,
      discountAmount,
      total,
      paymentMethod,
      cashPaid,
      notes,
    } = body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Header to COMPLETED
      const header = await tx.t_salesposheader.update({
        where: { id: transactionId },
        data: {
          grandtotal: Number(total),
          remarks: notes || null,
          modifieduser: cashierName || 'Kasir',
          status: 'COMPLETED',
        },
      });

      // 2. Fetch all details to update stock
      const details = await tx.t_salesposdetail.findMany({
        where: { salesposheaderid: transactionId }
      });

      // 3. Decrement stock and mark as synced
      for (const item of details) {
        await tx.inventory.update({
          where: { id: Number(item.inventoryid) },
          data: {
            stokupdate: { decrement: Number(item.qty) },
          },
        }).catch(e => console.log('Error updating stock', e));

        await tx.t_salesposdetail.update({
          where: { id: item.id },
          data: {
            issync: true,
            syncdate: new Date(),
          },
        });
      }

      // 4. Record Payment in t_salespayment
      let paymenttypeid = 1; // default CASH
      let tunai = 0;
      let debit = 0;
      let voucher = 0;

      const numTotal = Number(total);
      const numCashPaid = Number(cashPaid || total);
      
      if (paymentMethod === 'CASH') {
        paymenttypeid = 1;
        tunai = numCashPaid;
      } else if (paymentMethod === 'EDC BCA') {
        paymenttypeid = 3;
        debit = numTotal;
      } else if (paymentMethod === 'EDC MANDIRI') {
        paymenttypeid = 8;
        debit = numTotal;
      } else if (paymentMethod === 'TRANSFER') {
        paymenttypeid = 7;
        debit = numTotal;
      } else if (paymentMethod === 'QRIS') {
        paymenttypeid = 4;
        debit = numTotal;
      } else if (paymentMethod === 'SHOPEE') {
        paymenttypeid = 5;
        voucher = numTotal;
      } else if (paymentMethod === 'TOKOPEDIA') {
        paymenttypeid = 6;
        voucher = numTotal;
      }

      const changevalue = Math.max(0, numCashPaid - numTotal);

      await tx.t_salespayment.create({
        data: {
          salesposid: transactionId,
          salesposno: header.salesposno,
          paymentdate: new Date(),
          paymenttypeid: paymenttypeid,
          transactionvalue: numTotal,
          tunai: tunai,
          debit: debit,
          voucher: voucher,
          netvalue: 0,
          paymentvalue: numCashPaid,
          changevalue: changevalue,
          createduser: cashierName || 'Kasir',
        }
      });

      return header;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Failed to complete active transaction:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
