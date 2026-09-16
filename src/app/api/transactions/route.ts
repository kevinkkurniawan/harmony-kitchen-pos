import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolveSession } from '@/lib/auth';
import { verifyQuote } from '@/lib/quote';

function formatTransaction(header: any) {
  return {
    id: header.id.toString(),
    invoiceNo: header.salesPOSNo,
    date: header.salesPOSDate.toISOString(),
    time: header.salesPOSDate.toISOString(),
    customerName: header.customerName,
    cashierName: header.cashierName,
    cashierId: header.cashierId,
    mode: header.isGrosirMode ? 'Grosir' : 'Retail',
    subtotal: Number(header.totalAmount || 0),
    discountAmount: Number(header.discountAmount || 0),
    taxAmount: Number(header.taxAmount || 0),
    serviceCharge: Number(header.serviceCharge || 0),
    grandTotal: Number(header.grandTotal || 0),
    paymentMethod: header.paymentMethod || 'CASH',
    cashPaid: Number(header.cashPaid || header.grandTotal || 0),
    changeAmount: Number(header.changeAmount || 0),
    isGrosirMode: Boolean(header.isGrosirMode),
    voucherCode: header.voucherCode || '',
    notes: header.notes || '',
    status: header.status,
    checkoutKey: header.checkoutKey,
    createdAt: header.createdAt?.toISOString() || header.salesPOSDate.toISOString(),
    items: (header.details || []).map((d: any) => ({
      lineId: `line-${d.id}`,
      name: d.inventoryName || 'Unknown Product',
      product: {
        id: d.inventoryNo || d.barcode,
        name: d.inventoryName || 'Unknown Product',
        barcode: d.barcode || '',
        category: 'General',
        uom: d.uomName || 'Pcs',
        priceRetail: Number(d.price || 0),
        stock: 0,
        priceGrosir1: Number(d.price || 0),
        priceGrosir2: 0,
        priceGrosir3: 0,
      },
      quantity: Number(d.qty || 1),
      selectedPrice: Number(d.price || 0),
      subtotal: Number(d.subtotal || (Number(d.price || 0) * Number(d.qty || 1))),
      priceType: d.priceType || 'retail',
      quoteRef: d.quoteRef || undefined,
      memo: d.remarks || undefined,
      isVoided: Boolean(d.isVoided),
      voidReason: d.voidReason || undefined,
    })),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceNo = searchParams.get('invoiceNo');
    const id = searchParams.get('id');

    if (invoiceNo) {
      const header = await prisma.salesPOSHeader.findUnique({
        where: { salesPOSNo: invoiceNo },
        include: { details: true },
      });
      if (!header) {
        return NextResponse.json({ success: false, error: 'Transaksi tidak ditemukan' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: formatTransaction(header) });
    }

    if (id) {
      const header = await prisma.salesPOSHeader.findUnique({
        where: { id: Number(id) },
        include: { details: true },
      });
      if (!header) {
        return NextResponse.json({ success: false, error: 'Transaksi tidak ditemukan' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: formatTransaction(header) });
    }

    const headers = await prisma.salesPOSHeader.findMany({
      orderBy: { salesPOSDate: 'desc' },
      take: 50,
      include: { details: true },
    });

    return NextResponse.json({ success: true, data: headers.map(formatTransaction) });
  } catch (err: any) {
    console.error('Error fetching transactions:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await resolveSession(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized: sesi kasir diperlukan untuk checkout' }, { status: 401 });
    }

    const body = await req.json();
    const {
      checkoutKey,
      invoiceNo,
      cashierName,
      customerId,
      voucherCode,
      paymentMethod,
      cashPaid,
      isGrosirMode,
      notes,
      items,
    } = body;

    // 1. Check idempotency if checkoutKey provided
    if (checkoutKey) {
      const existing = await prisma.salesPOSHeader.findUnique({
        where: { checkoutKey },
        include: { details: true },
      });
      if (existing) {
        return NextResponse.json({
          success: true,
          data: formatTransaction(existing),
          message: 'Idempotent replay: transaksi sudah diproses sebelumnya',
        });
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Keranjang transaksi kosong' }, { status: 400 });
    }

    const activeItems = items.filter((item: any) => !item.isVoided);
    if (activeItems.length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada barang aktif untuk checkout' }, { status: 400 });
    }

    // 2. Validate selection provenance and detect tampering
    for (const item of activeItems) {
      if (!item.product || !item.product.id) {
        return NextResponse.json({ success: false, error: 'Data produk tidak valid pada keranjang' }, { status: 400 });
      }

      const unitPrice = Number(item.selectedPrice);
      const qty = Number(item.quantity);
      if (isNaN(unitPrice) || unitPrice <= 0 || isNaN(qty) || qty <= 0) {
        return NextResponse.json({
          success: false,
          error: `Harga atau kuantitas tidak valid untuk barang "${item.product.name}"`,
        }, { status: 400 });
      }

      if (item.quoteRef) {
        const payload = verifyQuote(item.quoteRef);
        if (!payload) {
          return NextResponse.json({
            success: false,
            error: `Tanda tangan quote tidak valid untuk "${item.product.name}". Mohon pilih ulang barang.`,
          }, { status: 400 });
        }

        // Verify that quoted price, product, and priceType have not been altered
        if (
          payload.productId !== Number(item.product.id) ||
          payload.price !== unitPrice ||
          payload.priceType !== item.priceType
        ) {
          return NextResponse.json({
            success: false,
            error: `Deteksi perubahan harga untuk "${item.product.name}". Harga quote: ${payload.price}, harga diajukan: ${unitPrice}`,
          }, { status: 400 });
        }
      } else if (!item.isLegacy) {
        return NextResponse.json({
          success: false,
          error: `Barang "${item.product.name}" tidak memiliki referensi quote yang sah`,
        }, { status: 400 });
      }
    }

    // 3. Calculate supported totals on server
    const subtotal = activeItems.reduce((sum, item) => sum + Number(item.selectedPrice) * Number(item.quantity), 0);
    let discountAmount = 0;
    let customerName = 'Pelanggan Umum';

    if (customerId) {
      const cust = await prisma.customer.findUnique({
        where: { id: Number(customerId) },
      });
      if (cust) {
        customerName = cust.customerName;
        if (cust.customerType?.toLowerCase() === 'vip') {
          discountAmount += Math.round((subtotal * 5) / 100);
        }
      }
    }

    if (voucherCode && voucherCode.trim().toUpperCase() === 'HARMONY10') {
      discountAmount += 10000;
    }

    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const taxAmount = 0;
    const serviceCharge = 0;
    const grandTotal = afterDiscount + taxAmount + serviceCharge;
    const finalCashPaid = Number(cashPaid) > 0 ? Number(cashPaid) : grandTotal;
    const changeAmount = Math.max(0, finalCashPaid - grandTotal);

    // 4. Atomic transaction: check and decrement stock, persist header and lines
    const savedHeader = await prisma.$transaction(async (tx) => {
      // Stock check and decrement
      for (const item of activeItems) {
        const inv = await tx.inventory.findUnique({
          where: { id: Number(item.product.id) },
        });

        if (!inv) {
          throw new Error(`Barang "${item.product.name}" tidak ditemukan dalam database`);
        }

        if (Number(inv.stock) < Number(item.quantity)) {
          throw new Error(
            `Stok tidak mencukupi untuk "${inv.inventoryName}". Sisa stok: ${inv.stock}, diminta: ${item.quantity}`
          );
        }

        await tx.inventory.update({
          where: { id: inv.id },
          data: {
            stock: { decrement: Number(item.quantity) },
          },
        });
      }

      // Generate invoice number
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const countToday = await tx.salesPOSHeader.count({
        where: {
          salesPOSDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
      const generatedInvNo = invoiceNo || `INV-${todayStr}-${String(countToday + 1).padStart(4, '0')}`;

      const header = await tx.salesPOSHeader.create({
        data: {
          salesPOSNo: generatedInvNo,
          salesPOSDate: new Date(),
          customerName,
          totalAmount: subtotal,
          discountAmount,
          taxAmount,
          serviceCharge,
          grandTotal,
          cashierName: authUser.fullName || cashierName || 'Kasir',
          cashierId: authUser.id,
          checkoutKey: checkoutKey || `chk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          paymentMethod: paymentMethod || 'CASH',
          cashPaid: finalCashPaid,
          changeAmount,
          voucherCode: voucherCode || null,
          isGrosirMode: Boolean(isGrosirMode),
          notes: notes || null,
          status: 'COMPLETED',
          details: {
            create: items.map((item: any) => ({
              barcode: item.product.barcode || item.product.inventoryNo || '',
              inventoryNo: item.product.inventoryNo || item.product.barcode || '',
              inventoryName: item.product.name,
              qty: Number(item.quantity),
              price: Number(item.selectedPrice),
              subtotal: Number(item.selectedPrice) * Number(item.quantity),
              priceType: item.priceType || 'retail',
              quoteRef: item.quoteRef || null,
              uomName: item.product.uom || 'Pcs',
              remarks: item.memo || null,
              isVoided: Boolean(item.isVoided),
              voidReason: item.voidReason || null,
            })),
          },
        },
        include: {
          details: true,
        },
      });

      return header;
    });

    return NextResponse.json({
      success: true,
      data: formatTransaction(savedHeader),
    });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Gagal memproses transaksi' }, { status: 400 });
  }
}
