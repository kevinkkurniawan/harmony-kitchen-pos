import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loadPromoRules } from '@/lib/promo-rules';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim().toLowerCase() || '';
    const limit = Number(searchParams.get('limit')) || 100;

    const whereCondition: any = {};
    if (query) {
      // Name matches when it has every typed word in any order ("jawa dandang 45" → "Jawa Dandang Ekonomi 45cm")
      const words = query.split(/\s+/);
      whereCondition.OR = [
        { AND: words.map((word) => ({ inventoryname: { contains: word, mode: 'insensitive' } })) },
        { barcode: { contains: query } },
        { inventoryno: { contains: query } }
      ];
    }

    const [inventories, promoRules] = await Promise.all([
      prisma.inventory.findMany({
        where: whereCondition,
        orderBy: { inventoryname: 'asc' },
        take: limit,
        include: {
          m_uom: true,
        },
      }),
      loadPromoRules(prisma),
    ]);

    const products = inventories.map((inv) => {
      return {
        id: inv.id.toString(),
        name: inv.inventoryname || 'Unknown',
        barcode: inv.barcode || inv.inventoryno || '',
        category: 'General',
        uom: inv.m_uom?.uomname || 'Pcs',
        priceRetail: Number(inv.price || 0),
        stock: Number(inv.stokupdate || 0),
        // 0 = not set (falls back to retail), the same reading as checkout
        priceGrosir1: Number(inv.grosir1 || 0),
        priceGrosir2: Number(inv.grosir2 || 0),
        priceGrosir3: Number(inv.grosir3 || 0),
        promoRules: promoRules.get(Number(inv.promobundle)) || null,
        printerTarget: 'Cashier',
      };
    });

    return NextResponse.json({
      success: true,
      data: products,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Failed to fetch products from PostgreSQL database:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newInventory = await prisma.inventory.create({
      data: {
        barcode: body.barcode,
        inventoryno: body.barcode,
        inventoryname: body.name,
        price: Number(body.priceRetail),
        stokupdate: Number(body.stock || 0),
        grosir1: Number(body.priceGrosir1 || body.priceRetail),
        grosir2: Number(body.priceGrosir2 || body.priceRetail),
        grosir3: Number(body.priceGrosir3 || body.priceRetail),
        isactive: true,
      },
    });

    const mappedProduct = {
      id: newInventory.id.toString(),
      name: newInventory.inventoryname,
      barcode: newInventory.barcode,
      category: body.category || 'General',
      uom: body.uom || 'Pcs',
      priceRetail: Number(newInventory.price),
      stock: Number(newInventory.stokupdate),
      priceGrosir1: Number(newInventory.grosir1),
      priceGrosir2: Number(newInventory.grosir2),
      priceGrosir3: Number(newInventory.grosir3),
      printerTarget: body.printerTarget || 'Cashier'
    };

    return NextResponse.json({ success: true, data: mappedProduct });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}
