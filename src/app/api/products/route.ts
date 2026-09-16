import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim().toLowerCase() || '';
    const limit = Number(searchParams.get('limit')) || 100;

    const whereCondition: any = { isActive: true };
    if (query) {
      whereCondition.OR = [
        { inventoryName: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query } },
        { inventoryNo: { contains: query } }
      ];
    }

    const inventories = await prisma.inventory.findMany({
      where: whereCondition,
      orderBy: { inventoryName: 'asc' },
      take: limit,
      include: {
        uom: true,
        category: true,
      }
    });

    const products = inventories.map((inv) => ({
      id: inv.id.toString(),
      name: inv.inventoryName || 'Unknown',
      barcode: inv.barcode || inv.inventoryNo || '',
      category: inv.category?.categoryName || 'General',
      uom: inv.uom?.uomName || 'Pcs',
      priceRetail: Number(inv.price || 0),
      stock: Number(inv.stock || 0),
      priceGrosir1: Number(inv.grosir1 || inv.price || 0),
      priceGrosir2: Number(inv.grosir2 || inv.price || 0),
      priceGrosir3: Number(inv.grosir3 || inv.price || 0),
      printerTarget: 'Cashier'
    }));

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
        inventoryNo: body.barcode,
        inventoryName: body.name,
        price: Number(body.priceRetail),
        stock: Number(body.stock || 0),
        grosir1: Number(body.priceGrosir1 || body.priceRetail),
        grosir2: Number(body.priceGrosir2 || body.priceRetail),
        grosir3: Number(body.priceGrosir3 || body.priceRetail),
        isActive: true,
      },
    });

    const mappedProduct = {
      id: newInventory.id.toString(),
      name: newInventory.inventoryName,
      barcode: newInventory.barcode,
      category: body.category || 'General',
      uom: body.uom || 'Pcs',
      priceRetail: Number(newInventory.price),
      stock: Number(newInventory.stock),
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
