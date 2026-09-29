import { prisma } from '@/lib/db';
import { calculateEffectivePrice } from '@/lib/wholesale-rules';
import { verifyPOSCapability } from '@/lib/capabilities';
import { apiError, apiSuccess } from '@/lib/api-response';
import { calculateCanonicalSalesTotal } from '@/lib/sales-calculation';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const transactionId = Number(params.id);
    const body = await request.json();
    
    const {
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
    } = body;

    // 1. Authenticate exclusively via cryptographic session cookie
    const auth = await verifyPOSCapability();
    if (auth.errorResponse) return auth.errorResponse;
    const sessionUser = auth.user;
    const cashierName = sessionUser.name || sessionUser.username || 'Kasir';

    const overrideActive = Boolean(isOverrideGrosir || isOverrideGrosir1);
    const rawDiscountValue = Number(manualDiscountValue || manualDiscountAmount || 0);

    // 2. Capability checks
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

    // 3. Fetch existing transaction header
    const existingHeader = await prisma.t_salesposheader.findUnique({
      where: { id: transactionId },
    });

    if (!existingHeader) {
      return apiError('NOT_FOUND', 'Transaksi aktif tidak ditemukan.', 404);
    }

    if (existingHeader.status === 'COMPLETED') {
      return apiError('CONFLICT', 'Transaksi ini sudah selesai (completed).', 409);
    }

    if (existingHeader.isvoid) {
      return apiError('CONFLICT', 'Transaksi ini sudah dibatalkan (void).', 409);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 4. Fetch details and authoritative inventory data for canonical price & HPP calculation
      // Filter out zero-qty or voided details
      const allDetails = await tx.t_salesposdetail.findMany({
        where: { salesposheaderid: transactionId },
      });

      const details = allDetails.filter(d => Number(d.qty || 0) > 0);

      if (details.length === 0) {
        throw new Error('Keranjang transaksi kosong atau semua item telah dibatalkan.');
      }

      const invIds = details.map((d) => Number(d.inventoryid));
      const inventories = await tx.inventory.findMany({
        where: { id: { in: invIds } },
      });
      const invMap = new Map(inventories.map((i) => [i.id, i]));

      const wholesaleCategories = await tx.m_wholesalecategory.findMany();
      const wcMap = new Map(wholesaleCategories.map((wc) => [wc.id, wc]));

      let recomputedSubtotal = 0;
      const updatedItemSnapshots = [];

      for (const item of details) {
        const inv = invMap.get(Number(item.inventoryid));
        const wc = inv?.wholesalecategoryid ? wcMap.get(inv.wholesalecategoryid) : null;
        const itemQty = Number(item.qty || 1);

        // Server-side authoritative revalidation of effective price
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

        const itemDisc = Number(item.disc || 0);
        const lineSubtotal = Math.max(0, calc.effectivePrice * itemQty - itemDisc);
        recomputedSubtotal += lineSubtotal;

        const unitHpp = Number(inv?.hpp || 0);
        const totalHpp = unitHpp * itemQty;
        const hppProvenance = unitHpp > 0 ? 'EXACT' : 'UNAVAILABLE';

        updatedItemSnapshots.push({
          detailId: item.id,
          inventoryId: item.inventoryid,
          price: calc.effectivePrice,
          subtotal: lineSubtotal,
          unitHpp,
          totalHpp,
          hppProvenance,
          priceSource: calc.priceSource,
          wholesaleCategoryId: calc.wholesaleCategoryId || null,
          wholesaleVersion: calc.wholesaleVersion || null,
          wholesaleTier: calc.tier || null,
          itemQty,
          inv,
        });
      }

      // 5. Complete canonical calculation sequence
      const calcResult = calculateCanonicalSalesTotal({
        subtotal: recomputedSubtotal,
        memberDiscountPercent: memberDiscountPercent ? Number(memberDiscountPercent) : 0,
        voucherDiscountAmount: voucherDiscountAmount ? Number(voucherDiscountAmount) : 0,
        manualDiscountMode: manualDiscountMode || 'NOMINAL',
        manualDiscountValue: rawDiscountValue,
        taxPercent: taxPercent !== undefined ? Number(taxPercent) : 0,
        servicePercent: servicePercent !== undefined ? Number(servicePercent) : 0,
      });

      // Verify client-supplied total matches canonical grand total (tolerance: 2 Rp for floating differences)
      if (total !== undefined && Math.abs(Number(total) - calcResult.grandTotal) > 2) {
        throw new Error(
          `Total pembayaran tidak valid. Dihitung server: Rp ${calcResult.grandTotal.toLocaleString('id-ID')}, dikirim client: Rp ${Number(total).toLocaleString('id-ID')}`
        );
      }

      // 6. Update line item snapshots in database & update stock
      for (const snap of updatedItemSnapshots) {
        await tx.t_salesposdetail.update({
          where: { id: snap.detailId },
          data: {
            price: snap.price,
            subtotal: snap.subtotal,
            unithpp: snap.unitHpp,
            totalhpp: snap.totalHpp,
            hppprovenance: snap.hppProvenance,
            pricesource: snap.priceSource,
            wholesalecategoryid: snap.wholesaleCategoryId,
            wholesaleversion: snap.wholesaleVersion,
            wholesaletier: snap.wholesaleTier,
            issync: true,
            syncdate: new Date(),
          },
        });

        // Decrement stock balance
        if (snap.inv) {
          await tx.inventory.update({
            where: { id: snap.inv.id },
            data: {
              stokupdate: { decrement: snap.itemQty },
            },
          });
        }
      }

      // 7. Update Header
      const header = await tx.t_salesposheader.update({
        where: { id: transactionId },
        data: {
          grandtotal: calcResult.grandTotal,
          remarks: notes || null,
          modifieduser: cashierName,
          status: 'COMPLETED',
          isoverridegrosir: overrideActive,
          manualdiscountmode: rawDiscountValue > 0 ? (manualDiscountMode || 'NOMINAL') : null,
          manualdiscountvalue: rawDiscountValue > 0 ? (manualDiscountValue !== undefined ? Number(manualDiscountValue) : 0) : 0,
          manualdiscountamount: calcResult.manualDiscountAmount,
          manualdiscountreason: rawDiscountValue > 0 ? manualDiscountReason?.trim() : null,
          manualdiscountuser: rawDiscountValue > 0 ? cashierName : null,
          paymenttypecode: paymentMethod || 'CASH',
        },
      });

      // 8. Record Payment in t_salespayment
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
          salesposid: transactionId,
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

      // 9. Create flow movement ledger records (invoicetype: 2 = Sales Out)
      for (const snap of updatedItemSnapshots) {
        const flow = await tx.s_flowinventory.create({
          data: {
            stockdate: new Date(),
            invoicecode: header.salesposno,
            invoicetype: 2, // Sales Out
            inventoryid: Number(snap.inventoryId),
            whcode: header.whid || 1,
            qty: -snap.itemQty,
            price: Number(snap.price || 0),
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
            qtyout: snap.itemQty,
            pricein: 0,
            priceout: Number(snap.price || 0),
            createduser: cashierName,
            modifieduser: cashierName,
          },
        });
      }

      return header;
    });

    return apiSuccess(result, 'Transaksi berhasil diselesaikan.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to complete active transaction:', err);
    return apiError('TRANSACTION_ERROR', message || 'Gagal memproses transaksi checkout', 400);
  }
}
