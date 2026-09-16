import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolveSession } from '@/lib/auth';
import { signQuote } from '@/lib/quote';

export async function GET(req: NextRequest) {
  return handleQuote(req);
}

export async function POST(req: NextRequest) {
  return handleQuote(req);
}

async function handleQuote(req: NextRequest) {
  try {
    const authUser = await resolveSession(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized: sesi kasir tidak valid' }, { status: 401 });
    }

    let barcode: string | undefined;
    let productId: string | number | undefined;
    let mode: string = 'retail';

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        barcode = body.barcode?.trim();
        productId = body.productId;
        mode = (body.mode || 'retail').toLowerCase();
      } catch {
        // Fall back to query params
      }
    }

    if (!barcode && !productId) {
      const { searchParams } = new URL(req.url);
      barcode = searchParams.get('barcode')?.trim() || undefined;
      productId = searchParams.get('productId') || undefined;
      if (searchParams.get('mode')) {
        mode = searchParams.get('mode')!.toLowerCase();
      }
    }

    if (!barcode && !productId) {
      return NextResponse.json(
        { success: false, error: 'Parameter barcode atau productId diperlukan' },
        { status: 400 }
      );
    }

    if (mode !== 'retail' && mode !== 'grosir1') {
      return NextResponse.json(
        { success: false, error: 'Mode harga tidak didukung. Pilih Retail atau Grosir 1' },
        { status: 400 }
      );
    }

    // Fresh database read for this selection
    let inv: any = null;
    if (productId) {
      inv = await prisma.inventory.findFirst({
        where: { id: Number(productId), isActive: true },
        include: { uom: true, category: true },
      });
    } else if (barcode) {
      inv = await prisma.inventory.findFirst({
        where: {
          OR: [{ barcode: barcode }, { inventoryNo: barcode }],
          isActive: true,
        },
        include: { uom: true, category: true },
      });
    }

    if (!inv) {
      return NextResponse.json(
        { success: false, error: 'Barang tidak ditemukan dalam database' },
        { status: 404 }
      );
    }

    let selectedPrice = 0;
    let priceType: 'retail' | 'grosir1' = 'retail';

    if (mode === 'grosir1') {
      const g1 = Number(inv.grosir1);
      if (inv.grosir1 === null || inv.grosir1 === undefined || isNaN(g1) || g1 <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Harga Grosir 1 belum ditentukan atau tidak valid untuk barang "${inv.inventoryName}"`,
          },
          { status: 400 }
        );
      }
      selectedPrice = g1;
      priceType = 'grosir1';
    } else {
      const retPrice = Number(inv.price);
      if (inv.price === null || inv.price === undefined || isNaN(retPrice) || retPrice <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Harga Retail tidak valid atau bernilai 0 untuk barang "${inv.inventoryName}"`,
          },
          { status: 400 }
        );
      }
      selectedPrice = retPrice;
      priceType = 'retail';
    }

    const uomName = inv.uom?.uomName || 'Pcs';

    // Sign cryptographic quote reference for checkout provenance verification
    const quoteRef = signQuote({
      productId: inv.id,
      barcode: inv.barcode || inv.inventoryNo,
      name: inv.inventoryName,
      price: selectedPrice,
      priceType,
      uom: uomName,
      cashierId: authUser.id,
      issuedAt: Date.now(),
    });

    const response = NextResponse.json({
      success: true,
      data: {
        productId: inv.id,
        barcode: inv.barcode || inv.inventoryNo,
        inventoryNo: inv.inventoryNo,
        name: inv.inventoryName,
        category: inv.category?.categoryName || 'General',
        uom: uomName,
        price: selectedPrice,
        priceType,
        stock: Number(inv.stock || 0),
        quoteRef,
      },
    });

    // Ensure responses are never served from browser/proxy cache
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    return response;
  } catch (error: any) {
    console.error('Error in /api/products/quote:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
