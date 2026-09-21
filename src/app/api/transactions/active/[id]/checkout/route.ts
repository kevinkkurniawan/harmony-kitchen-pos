import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateEffectivePrice } from '@/lib/wholesale-rules';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const transactionId = Number(params.id);
    const body = await request.json();
    
    const {
      cashierName,
      subtotal,
      discountAmount,
      manualDiscountMode,
      manualDiscountValue,
      manualDiscountAmount,
      manualDiscountReason,
      isOverrideGrosir,
      total,
      paymentMethod,
      cashPaid,
      notes,
    } = body;

    // Validate manual discount reason if manual discount is applied
    const numManualDiscount = Number(manualDiscountAmount || 0);
    if (numManualDiscount > 0 && !manualDiscountReason?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Alasan diskon manual wajib diisi.' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch details and inventory data for price revalidation and HPP capture
      const details = await tx.t_salesposdetail.findMany({
        where: { salesposheaderid: transactionId },
      });

      const invIds = details.map((d) => Number(d.inventoryid));
      const inventories = await tx.inventory.findMany({
        where: { id: { in: invIds } },
      });
      const invMap = new Map(inventories.map((i) => [i.id, i]));

      const wholesaleCategories = await tx.m_wholesalecategory.findMany();
      const wcMap = new Map(wholesaleCategories.map((wc) => [wc.id, wc]));

      // 2. Update line snapshots (HPP, wholesale tier, price source) and inventory stock
      for (const item of details) {
        const inv = invMap.get(Number(item.inventoryid));
        const wc = inv?.wholesalecategoryid ? wcMap.get(inv.wholesalecategoryid) : null;
        const itemQty = Number(item.qty || 1);

        // Server-side revalidation of effective price
        const calc = calculateEffectivePrice(
          {
            price: Number(inv?.price || 0),
            grosir1: inv?.grosir1 ? Number(inv.grosir1) : null,
            grosir2: inv?.grosir2 ? Number(inv.grosir2) : null,
            grosir3: inv?.grosir3 ? Number(inv.grosir3) : null,
            wholesaleCategory: wc,
          },
          itemQty,
          Boolean(isOverrideGrosir)
        );

        const unitHpp = Number(inv?.hpp || 0);
        const totalHpp = unitHpp * itemQty;

        await tx.t_salesposdetail.update({
          where: { id: item.id },
          data: {
            price: calc.effectivePrice,
            subtotal: calc.effectivePrice * itemQty,
            unithpp: unitHpp,
            totalhpp: totalHpp,
            hppprovenance: 'EXACT',
            pricesource: calc.priceSource,
            wholesalecategoryid: calc.wholesaleCategoryId || null,
            wholesaleversion: calc.wholesaleVersion || null,
            wholesaletier: calc.tier || null,
            issync: true,
            syncdate: new Date(),
          },
        });

        // Decrement stock balance
        if (inv) {
          await tx.inventory.update({
            where: { id: inv.id },
            data: {
              stokupdate: { decrement: itemQty },
            },
          });
        }
      }

      // 3. Update Header
      const header = await tx.t_salesposheader.update({
        where: { id: transactionId },
        data: {
          grandtotal: Number(total),
          remarks: notes || null,
          modifieduser: cashierName || 'Kasir',
          status: 'COMPLETED',
          isoverridegrosir: Boolean(isOverrideGrosir),
          manualdiscountmode: manualDiscountMode || null,
          manualdiscountvalue: manualDiscountValue !== undefined ? Number(manualDiscountValue) : 0,
          manualdiscountamount: numManualDiscount,
          manualdiscountreason: manualDiscountReason || null,
          manualdiscountuser: numManualDiscount > 0 ? (cashierName || 'Kasir') : null,
          paymenttypecode: paymentMethod || 'CASH',
        },
      });

      // 4. Record Payment in t_salespayment
      let paymenttypeid = 1;
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
          discount: numManualDiscount,
          netvalue: numTotal,
          paymentvalue: numCashPaid,
          changevalue: changevalue,
          createduser: cashierName || 'Kasir',
        },
      });

      // 5. Create flow movement ledger records (invoicetype: 2 = Sales Out)
      for (const item of details) {
        const itemQty = Number(item.qty || 1);
        const inv = invMap.get(Number(item.inventoryid));

        const flow = await tx.s_flowinventory.create({
          data: {
            stockdate: new Date(),
            invoicecode: header.salesposno,
            invoicetype: 2, // Sales Out
            inventoryid: Number(item.inventoryid),
            whcode: header.whid || 1,
            qty: -itemQty,
            price: Number(item.price || 0),
            createduser: cashierName || 'Kasir',
            modifieduser: cashierName || 'Kasir',
          },
        });

        await tx.s_flowdetailinventory.create({
          data: {
            flowinventoryid: Number(flow.id),
            invoicecode: header.salesposno,
            invoicetype: 2,
            invoicedate: new Date(),
            qtyin: 0,
            qtyout: itemQty,
            pricein: 0,
            priceout: Number(item.price || 0),
            createduser: cashierName || 'Kasir',
            modifieduser: cashierName || 'Kasir',
          },
        });
      }

      return header;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Failed to complete active transaction:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
