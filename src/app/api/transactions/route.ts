import { prisma } from '@/lib/db';
import { calculateEffectivePrice } from '@/lib/wholesale-rules';
import { verifyPOSCapability } from '@/lib/capabilities';
import { apiError, apiSuccess } from '@/lib/api-response';
import { calculateCanonicalSalesTotal } from '@/lib/sales-calculation';

export async function GET() {
  try {
    const headers = await prisma.t_salesposheader.findMany({
      orderBy: { createddate: 'desc' },
      take: 50,
    });
    
    const headerIds = headers.map(h => h.id);
    const details = await prisma.t_salesposdetail.findMany({
      where: { salesposheaderid: { in: headerIds } }
    });

    const transactions = headers.map(h => {
      const hDetails = details.filter(d => d.salesposheaderid === h.id);
      return {
        id: h.id.toString(),
        invoiceNo: h.salesposno,
        date: h.createddate.toISOString(),
        time: h.createddate.toISOString(),
        cashierName: h.createduser || 'Kasir',
        mode: h.isgrosir ? 'Grosir' : 'Retail',
        subtotal: Number(h.grandtotal || 0),
        discountAmount: Number(h.manualdiscountamount || 0),
        taxAmount: 0,
        serviceCharge: 0,
        total: Number(h.grandtotal || 0),
        paymentMethod: h.paymenttypecode || 'CASH',
        cashPaid: Number(h.grandtotal || 0),
        change: 0,
        isGrosirMode: h.isgrosir || false,
        isOverrideGrosir: h.isoverridegrosir || false,
        notes: h.remarks || '',
        items: hDetails.map(d => ({
          product: { id: d.inventoryid.toString() },
          quantity: Number(d.qty || 0),
          selectedPrice: Number(d.price || 0),
          unithpp: Number(d.unithpp || 0),
          totalhpp: Number(d.totalhpp || 0),
          priceType: d.pricesource || 'retail'
        }))
      };
    });

    return apiSuccess(transactions);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return apiError('INTERNAL_ERROR', message, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      invoiceNo,
      customerId,
      manualDiscountMode,
      manualDiscountValue,
      manualDiscountAmount,
      manualDiscountReason,
      memberDiscountPercent,
      voucherDiscountAmount,
      taxPercent,
      servicePercent,
      isOverrideGrosir,
      isOverrideGrosir1,
      total,
      paymentMethod,
      cashPaid,
      notes,
      items,
    } = body;

    // 1. Authenticate exclusively via cryptographic session cookie
    const auth = await verifyPOSCapability();
    if (auth.errorResponse) return auth.errorResponse;
    const sessionUser = auth.user;
    const cashierName = sessionUser.name || sessionUser.username || 'Kasir';

    const overrideActive = Boolean(isOverrideGrosir || isOverrideGrosir1);
    const rawDiscountValue = Number(manualDiscountValue || manualDiscountAmount || 0);

    // 2. Permission checks
    if (overrideActive) {
      const capCheck = await verifyPOSCapability('OVERRIDE_GROSIR_1');
      if (capCheck.errorResponse) return capCheck.errorResponse;
    }

    if (rawDiscountValue > 0) {
      const capCheck = await verifyPOSCapability('MANUAL_DISCOUNT');
      if (capCheck.errorResponse) return capCheck.errorResponse;

      if (!manualDiscountReason || !manualDiscountReason.trim()) {
        return apiError('VALIDATION_ERROR', 'Alasan diskon manual wajib diisi sebelum pembayaran.', 400);
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return apiError('VALIDATION_ERROR', 'Keranjang transaksi tidak boleh kosong.', 400);
    }

    const activeItems = items.filter((it: { isVoided?: boolean; quantity?: number }) => !it.isVoided && Number(it.quantity || 0) > 0);
    if (activeItems.length === 0) {
      return apiError('VALIDATION_ERROR', 'Keranjang transaksi tidak boleh kosong atau semua item telah dibatalkan.', 400);
    }

    const transaction = await prisma.$transaction(async (tx) => {
      // 3. Fetch inventory items and wholesale categories for authoritative price & HPP calculation
      const invIds = activeItems.map((it: { product: { id: string | number } }) => Number(it.product.id));
      const inventories = await tx.inventory.findMany({
        where: { id: { in: invIds } },
      });
      const invMap = new Map(inventories.map((i) => [i.id, i]));

      const wholesaleCategories = await tx.m_wholesalecategory.findMany();
      const wcMap = new Map(wholesaleCategories.map((wc) => [wc.id, wc]));

      let recomputedSubtotal = 0;
      const computedDetails = [];

      for (const item of activeItems) {
        const inv = invMap.get(Number(item.product.id));
        const wc = inv?.wholesalecategoryid ? wcMap.get(inv.wholesalecategoryid) : null;
        const itemQty = Number(item.quantity || 1);

        const calc = calculateEffectivePrice(
          {
            price: Number(inv?.price || 0),
            grosir1: inv?.grosir1 ? Number(inv.grosir1) : null,
            grosir2: inv?.grosir2 ? Number(inv.grosir2) : null,
            grosir3: inv?.grosir3 ? Number(inv.grosir3) : null,
            wholesaleCategory: wc,
          },
          itemQty,
          overrideActive
        );

        const itemDisc = Number(item.discount || 0);
        const lineSubtotal = Math.max(0, calc.effectivePrice * itemQty - itemDisc);
        recomputedSubtotal += lineSubtotal;

        const unitHpp = Number(inv?.hpp || 0);
        const totalHpp = unitHpp * itemQty;
        const hppProvenance = unitHpp > 0 ? 'EXACT' : 'UNAVAILABLE';

        computedDetails.push({
          inventoryid: Number(item.product.id),
          qty: itemQty,
          price: calc.effectivePrice,
          subtotal: lineSubtotal,
          unithpp: unitHpp,
          totalhpp: totalHpp,
          hppprovenance: hppProvenance,
          pricesource: calc.priceSource,
          wholesalecategoryid: calc.wholesaleCategoryId || null,
          wholesaleversion: calc.wholesaleVersion || null,
          wholesaletier: calc.tier || null,
          remarks: item.memo || null,
          createduser: cashierName,
          modifieduser: cashierName,
          inv,
        });
      }

      // 4. Canonical calculations
      const calcResult = calculateCanonicalSalesTotal({
        subtotal: recomputedSubtotal,
        memberDiscountPercent: memberDiscountPercent ? Number(memberDiscountPercent) : 0,
        voucherDiscountAmount: voucherDiscountAmount ? Number(voucherDiscountAmount) : 0,
        manualDiscountMode: manualDiscountMode || 'NOMINAL',
        manualDiscountValue: rawDiscountValue,
        taxPercent: taxPercent !== undefined ? Number(taxPercent) : 0,
        servicePercent: servicePercent !== undefined ? Number(servicePercent) : 0,
      });

      if (total !== undefined && Math.abs(Number(total) - calcResult.grandTotal) > 2) {
        throw new Error(
          `Total pembayaran tidak valid. Dihitung server: Rp ${calcResult.grandTotal.toLocaleString('id-ID')}, dikirim client: Rp ${Number(total).toLocaleString('id-ID')}`
        );
      }

      // 5. Create Header
      const currentInvoiceNo = invoiceNo || `INV-${Date.now().toString().slice(-6)}`;
      const header = await tx.t_salesposheader.create({
        data: {
          salesposno: currentInvoiceNo,
          customerid: customerId ? Number(customerId) : null,
          grandtotal: calcResult.grandTotal,
          deliveryfee: 0,
          remarks: notes || null,
          isvoid: false,
          isdone: true,
          isgrosir: overrideActive,
          status: 'COMPLETED',
          isonline: false,
          isoverridegrosir: overrideActive,
          manualdiscountmode: rawDiscountValue > 0 ? (manualDiscountMode || 'NOMINAL') : null,
          manualdiscountvalue: rawDiscountValue > 0 ? (manualDiscountValue !== undefined ? Number(manualDiscountValue) : 0) : 0,
          manualdiscountamount: calcResult.manualDiscountAmount,
          manualdiscountreason: rawDiscountValue > 0 ? manualDiscountReason?.trim() : null,
          manualdiscountuser: rawDiscountValue > 0 ? cashierName : null,
          paymenttypecode: paymentMethod || 'CASH',
          createduser: cashierName,
          modifieduser: cashierName,
        },
      });

      // 6. Create Detail Lines & update stock
      for (const d of computedDetails) {
        await tx.t_salesposdetail.create({
          data: {
            salesposheaderid: header.id,
            inventoryid: d.inventoryid,
            qty: d.qty,
            price: d.price,
            subtotal: d.subtotal,
            unithpp: d.unithpp,
            totalhpp: d.totalhpp,
            hppprovenance: d.hppprovenance,
            pricesource: d.pricesource,
            wholesalecategoryid: d.wholesalecategoryid,
            wholesaleversion: d.wholesaleversion,
            wholesaletier: d.wholesaletier,
            remarks: d.remarks,
            createduser: d.createduser,
            modifieduser: d.modifieduser,
            issync: true,
            syncdate: new Date(),
          },
        });

        if (d.inv) {
          await tx.inventory.update({
            where: { id: d.inv.id },
            data: {
              stokupdate: { decrement: d.qty },
            },
          });
        }
      }

      // 7. Record Payment in t_salespayment
      let paymenttypeid = 1;
      let tunai = 0;
      let debit = 0;
      let voucher = 0;

      const numCashPaid = Number(cashPaid || calcResult.grandTotal);
      const methodStr = (paymentMethod || 'CASH').toUpperCase();
      
      if (methodStr === 'CASH') {
        paymenttypeid = 1;
        tunai = numCashPaid;
      } else if (methodStr === 'EDC BCA') {
        paymenttypeid = 3;
        debit = calcResult.grandTotal;
      } else if (methodStr === 'EDC MANDIRI') {
        paymenttypeid = 8;
        debit = calcResult.grandTotal;
      } else if (methodStr === 'TRANSFER') {
        paymenttypeid = 7;
        debit = calcResult.grandTotal;
      } else if (methodStr === 'QRIS') {
        paymenttypeid = 4;
        debit = calcResult.grandTotal;
      } else if (methodStr === 'SHOPEE') {
        paymenttypeid = 5;
        voucher = calcResult.grandTotal;
      } else if (methodStr === 'TOKOPEDIA') {
        paymenttypeid = 6;
        voucher = calcResult.grandTotal;
      } else {
        paymenttypeid = 1;
        tunai = numCashPaid;
      }

      const changevalue = Math.max(0, numCashPaid - calcResult.grandTotal);

      await tx.t_salespayment.create({
        data: {
          salesposid: header.id,
          salesposno: header.salesposno,
          paymentdate: new Date(),
          paymenttypeid: paymenttypeid,
          transactionvalue: calcResult.grandTotal,
          tunai: tunai,
          debit: debit,
          voucher: voucher,
          discount: calcResult.totalDiscount,
          taxvalue: calcResult.taxAmount,
          netvalue: calcResult.grandTotal,
          paymentvalue: numCashPaid,
          changevalue: changevalue,
          createduser: cashierName,
        },
      });

      // 8. Create flow movement ledger records (invoicetype: 2 = Sales Out)
      for (const d of computedDetails) {
        const flow = await tx.s_flowinventory.create({
          data: {
            stockdate: new Date(),
            invoicecode: header.salesposno,
            invoicetype: 2, // Sales Out
            inventoryid: d.inventoryid,
            whcode: header.whid || 1,
            qty: -d.qty,
            price: Number(d.price || 0),
            createduser: cashierName,
            modifieduser: cashierName,
          },
        });

        await tx.s_flowdetailinventory.create({
          data: {
            flowinventoryid: Number(flow.id),
            invoicecode: header.salesposno,
            invoicetype: 2,
            invoicedate: new Date(),
            qtyin: 0,
            qtyout: d.qty,
            pricein: 0,
            priceout: Number(d.price || 0),
            createduser: cashierName,
            modifieduser: cashierName,
          },
        });
      }

      return header;
    });

    return apiSuccess(transaction, 'Transaksi berhasil dibuat.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to create transaction:', err);
    return apiError('TRANSACTION_ERROR', message || 'Gagal memproses transaksi', 400);
  }
}
