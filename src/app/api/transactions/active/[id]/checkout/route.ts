import { prisma } from '@/lib/db';
import { calculateEffectivePrice, clampItemDiscount } from '@/lib/wholesale-rules';
import { loadPromoRules } from '@/lib/promo-rules';
import { verifyPOSCapability } from '@/lib/capabilities';
import { apiError, apiSuccess } from '@/lib/api-response';
import { calculateCanonicalSalesTotal } from '@/lib/sales-calculation';
import { getCustomerDiscountPercent, getTaxRates, getVoucherDiscount, isValidPosPin } from '@/lib/pos-rules';

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
      customerId,
      voucherCode,
      isOverrideGrosir,
      isOverrideGrosir1,
      resellerName,
      total,
      paymentMethod,
      cashPaid,
      notes,
      items,
      pin,
    } = body;

    // 1. Authenticate exclusively via cryptographic session cookie
    const auth = await verifyPOSCapability();
    if (auth.errorResponse) return auth.errorResponse;
    const sessionUser = auth.user;
    const cashierName = sessionUser.name || sessionUser.username || 'Kasir';

    const overrideActive = Boolean(isOverrideGrosir || isOverrideGrosir1);
    // Reseller name typed when Override Grosir 1 was switched on (old POS: CustomerName on the sale)
    const customerName = overrideActive && typeof resellerName === 'string' && resellerName.trim()
      ? resellerName.trim().slice(0, 50)
      : null;
    const rawDiscountValue = Number(manualDiscountValue || manualDiscountAmount || 0);

    const hasItemDiscount = Array.isArray(items) && items.some((it: { isVoided?: boolean; discount?: unknown }) => !it.isVoided && Number(it.discount) > 0);

    // 2. Override Grosir 1 and manual discounts (bill or per item) need the shared PIN, as in the legacy POS
    if ((overrideActive || rawDiscountValue > 0 || hasItemDiscount) && !isValidPosPin(pin)) {
      return apiError('FORBIDDEN', 'PIN otorisasi salah atau belum diisi untuk Override Grosir 1 / potongan manual.', 403);
    }
    if (rawDiscountValue > 0) {
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
      // Claim the draft first: the row lock makes a concurrent second checkout wait here,
      // then match nothing, so stock and payment can never be booked twice.
      const claimed = await tx.t_salesposheader.updateMany({
        where: {
          id: transactionId,
          AND: [
            { OR: [{ status: null }, { status: { not: 'COMPLETED' } }] },
            { OR: [{ isvoid: null }, { isvoid: false }] },
          ],
        },
        data: { status: 'COMPLETED' },
      });
      if (claimed.count === 0) {
        throw new Error('Transaksi ini sudah selesai atau dibatalkan.');
      }

      // The cashier's cart is what gets sold: replace the draft's lines with it, because the background
      // item sync can lose a line and the totals would then never match. Prices are recalculated below
      // from inventory, never taken from the cart. One line per item (unique salesposheaderid+inventoryid).
      if (Array.isArray(items)) {
        const lines = new Map<number, { qty: number; memo: string | null; disc: number }>();
        for (const it of items as { isVoided?: boolean; quantity?: number; memo?: string; discount?: unknown; product?: { id?: unknown } }[]) {
          const inventoryId = Number(it.product?.id);
          const qty = Number(it.quantity || 0);
          if (it.isVoided || !(qty > 0) || !(inventoryId > 0)) continue;
          const line = lines.get(inventoryId);
          lines.set(inventoryId, {
            qty: (line?.qty || 0) + qty,
            memo: line?.memo || it.memo || null,
            // Per-pcs potongan; capped at the unit price below, once the price is known
            disc: Math.max(line?.disc || 0, Math.round(Number(it.discount) || 0)),
          });
        }
        await tx.t_salesposdetail.deleteMany({ where: { salesposheaderid: transactionId } });
        await tx.t_salesposdetail.createMany({
          data: Array.from(lines, ([inventoryId, line]) => ({
            salesposheaderid: transactionId,
            inventoryid: inventoryId,
            qty: line.qty,
            price: 0,
            disc: line.disc,
            subtotal: 0,
            remarks: line.memo,
            createduser: cashierName,
            modifieduser: cashierName,
          })),
        });
      }

      // Discounts and rates come from the server, never from the request body
      const effectiveCustomerId = customerId ? Number(customerId) : existingHeader.customerid;
      const memberDiscountPercent = await getCustomerDiscountPercent(tx, effectiveCustomerId);
      const voucherDiscountAmount = getVoucherDiscount(voucherCode);
      const { taxPercent, servicePercent } = getTaxRates();

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

      const promoRules = await loadPromoRules(tx);

      let recomputedSubtotal = 0;
      const updatedItemSnapshots = [];

      for (const item of details) {
        const inv = invMap.get(Number(item.inventoryid));
        const itemQty = Number(item.qty || 1);

        // Server-side authoritative revalidation of effective price
        const calc = calculateEffectivePrice(
          {
            price: Number(inv?.price || 0),
            grosir1: inv?.grosir1 ? Number(inv.grosir1) : null,
            grosir2: inv?.grosir2 ? Number(inv.grosir2) : null,
            grosir3: inv?.grosir3 ? Number(inv.grosir3) : null,
            promoRules: promoRules.get(Number(inv?.promobundle)) || null,
          },
          itemQty,
          overrideActive
        );

        // disc is per pcs, as the legacy POS stores it: subtotal = qty * (price - disc)
        const itemDisc = clampItemDiscount(item.disc, calc.effectivePrice);
        const lineSubtotal = (calc.effectivePrice - itemDisc) * itemQty;
        recomputedSubtotal += lineSubtotal;

        const unitHpp = Number(inv?.hpp || 0);
        const totalHpp = unitHpp * itemQty;
        const hppProvenance = unitHpp > 0 ? 'EXACT' : 'UNAVAILABLE';

        updatedItemSnapshots.push({
          detailId: item.id,
          inventoryId: item.inventoryid,
          price: calc.effectivePrice,
          disc: itemDisc,
          subtotal: lineSubtotal,
          unitHpp,
          totalHpp,
          hppProvenance,
          priceSource: calc.priceSource,
          wholesaleTier: calc.tier || null,
          itemQty,
          inv,
        });
      }

      // 5. Complete canonical calculation sequence
      const calcResult = calculateCanonicalSalesTotal({
        subtotal: recomputedSubtotal,
        memberDiscountPercent,
        voucherDiscountAmount,
        manualDiscountMode: manualDiscountMode || 'NOMINAL',
        manualDiscountValue: rawDiscountValue,
        taxPercent,
        servicePercent,
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
            disc: snap.disc,
            subtotal: snap.subtotal,
            unithpp: snap.unitHpp,
            totalhpp: snap.totalHpp,
            hppprovenance: snap.hppProvenance,
            pricesource: snap.priceSource,
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
          // Legacy meaning: the sale ran in reseller mode (everything at grosir 1)
          isgrosir: overrideActive,
          customername: customerName,
          customerid: effectiveCustomerId || null,
        },
      });

      // 8. Record Payment in t_salespayment
      // m_paymenttype.code, as the legacy POS writes it: 0 Cash, 1 Debit, 3 Qris,
      // 4 Shopee, 5 Tokopedia, 6 Transfer, 7 EDC Mandiri
      let paymenttypeid = 0;
      let tunai = 0;
      let debit = 0;
      let voucher = 0;

      const numCashPaid = Number(cashPaid || calcResult.grandTotal);
      const methodStr = (paymentMethod || 'CASH').toUpperCase();
      
      if (methodStr === 'CASH') {
        paymenttypeid = 0;
        tunai = numCashPaid;
      } else if (methodStr === 'EDC BCA') {
        paymenttypeid = 1;
        debit = calcResult.grandTotal;
      } else if (methodStr === 'EDC MANDIRI') {
        paymenttypeid = 7;
        debit = calcResult.grandTotal;
      } else if (methodStr === 'TRANSFER') {
        paymenttypeid = 6;
        debit = calcResult.grandTotal;
      } else if (methodStr === 'QRIS') {
        paymenttypeid = 3;
        debit = calcResult.grandTotal;
      } else if (methodStr === 'SHOPEE') {
        paymenttypeid = 4;
        voucher = calcResult.grandTotal;
      } else if (methodStr === 'TOKOPEDIA') {
        paymenttypeid = 5;
        voucher = calcResult.grandTotal;
      } else {
        paymenttypeid = 0;
        tunai = numCashPaid;
      }

      if (paymenttypeid === 0 && numCashPaid < calcResult.grandTotal) {
        throw new Error('Nominal cash kurang dari total tagihan.');
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
    }, { maxWait: 10000, timeout: 30000 });

    return apiSuccess(result, 'Transaksi berhasil diselesaikan.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to complete active transaction:', err);
    return apiError('TRANSACTION_ERROR', message || 'Gagal memproses transaksi checkout', 400);
  }
}
