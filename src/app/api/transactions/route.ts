import { prisma } from '@/lib/db';
import { calculateEffectivePrice, clampItemDiscount } from '@/lib/wholesale-rules';
import { loadPromoRules } from '@/lib/promo-rules';
import { verifyPOSCapability } from '@/lib/capabilities';
import { apiError, apiSuccess } from '@/lib/api-response';
import { calculateCanonicalSalesTotal } from '@/lib/sales-calculation';
import { generateInvoiceNo, getCustomerDiscountPercent, getTaxRates, getVoucherDiscount, isValidPosPin, storeDate } from '@/lib/pos-rules';

export async function GET() {
  try {
    const auth = await verifyPOSCapability();
    if (auth.errorResponse) return auth.errorResponse;

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
      customerId,
      manualDiscountMode,
      manualDiscountValue,
      manualDiscountAmount,
      manualDiscountReason,
      voucherCode,
      isOverrideGrosir,
      isOverrideGrosir1,
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

    if (!items || !Array.isArray(items) || items.length === 0) {
      return apiError('VALIDATION_ERROR', 'Keranjang transaksi tidak boleh kosong.', 400);
    }

    const activeItems = items.filter((it: { isVoided?: boolean; quantity?: number }) => !it.isVoided && Number(it.quantity || 0) > 0);
    if (activeItems.length === 0) {
      return apiError('VALIDATION_ERROR', 'Keranjang transaksi tidak boleh kosong atau semua item telah dibatalkan.', 400);
    }

    const transaction = await prisma.$transaction(async (tx) => {
      // Discounts and rates come from the server, never from the request body
      const memberDiscountPercent = await getCustomerDiscountPercent(tx, customerId ? Number(customerId) : null);
      const voucherDiscountAmount = getVoucherDiscount(voucherCode);
      const { taxPercent, servicePercent } = getTaxRates();

      // 3. Fetch inventory items and wholesale categories for authoritative price & HPP calculation
      const invIds = activeItems.map((it: { product: { id: string | number } }) => Number(it.product.id));
      const inventories = await tx.inventory.findMany({
        where: { id: { in: invIds } },
      });
      const invMap = new Map(inventories.map((i) => [i.id, i]));

      const promoRules = await loadPromoRules(tx);

      let recomputedSubtotal = 0;
      const computedDetails = [];

      for (const item of activeItems) {
        const inv = invMap.get(Number(item.product.id));
        const itemQty = Number(item.quantity || 1);

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

        // Per-pcs potongan, stored like the legacy POS: subtotal = qty * (price - disc)
        const itemDisc = clampItemDiscount(item.discount, calc.effectivePrice);
        const lineSubtotal = (calc.effectivePrice - itemDisc) * itemQty;
        recomputedSubtotal += lineSubtotal;

        const unitHpp = Number(inv?.hpp || 0);
        const totalHpp = unitHpp * itemQty;
        const hppProvenance = unitHpp > 0 ? 'EXACT' : 'UNAVAILABLE';

        computedDetails.push({
          inventoryid: Number(item.product.id),
          qty: itemQty,
          price: calc.effectivePrice,
          disc: itemDisc,
          subtotal: lineSubtotal,
          unithpp: unitHpp,
          totalhpp: totalHpp,
          hppprovenance: hppProvenance,
          pricesource: calc.priceSource,
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
        memberDiscountPercent,
        voucherDiscountAmount,
        manualDiscountMode: manualDiscountMode || 'NOMINAL',
        manualDiscountValue: rawDiscountValue,
        taxPercent,
        servicePercent,
      });

      if (total !== undefined && Math.abs(Number(total) - calcResult.grandTotal) > 2) {
        throw new Error(
          `Total pembayaran tidak valid. Dihitung server: Rp ${calcResult.grandTotal.toLocaleString('id-ID')}, dikirim client: Rp ${Number(total).toLocaleString('id-ID')}`
        );
      }

      // 5. Create Header
      const currentInvoiceNo = await generateInvoiceNo(tx);
      const header = await tx.t_salesposheader.create({
        data: {
          salesposno: currentInvoiceNo,
          salesposdate: storeDate(),
          customerid: customerId ? Number(customerId) : null,
          grandtotal: calcResult.grandTotal,
          deliveryfee: 0,
          remarks: notes || null,
          isvoid: false,
          isdone: true,
          // Legacy meaning: the sale ran in reseller mode (everything at grosir 1)
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
            disc: d.disc,
            subtotal: d.subtotal,
            unithpp: d.unithpp,
            totalhpp: d.totalhpp,
            hppprovenance: d.hppprovenance,
            pricesource: d.pricesource,
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
    }, { maxWait: 10000, timeout: 30000 });

    return apiSuccess(transaction, 'Transaksi berhasil dibuat.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to create transaction:', err);
    return apiError('TRANSACTION_ERROR', message || 'Gagal memproses transaksi', 400);
  }
}
