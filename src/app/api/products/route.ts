import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim().toLowerCase() || '';
    const limit = Number(searchParams.get('limit')) || 40;

    const whereCondition: any = {};

    if (query) {
      whereCondition.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query } },
      ];
    }

    const products = await prisma.product.findMany({
      where: whereCondition,
      orderBy: { name: 'asc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: products,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Failed to fetch products from PostgreSQL:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Database error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newProduct = await prisma.product.create({
      data: {
        barcode: body.barcode,
        name: body.name,
        category: body.category || 'General',
        uom: body.uom || 'Pcs',
        priceRetail: Number(body.priceRetail),
        stock: Number(body.stock || 0),
        priceGrosir1: Number(body.priceGrosir1 || body.priceRetail),
        priceGrosir2: Number(body.priceGrosir2 || body.priceRetail),
        priceGrosir3: Number(body.priceGrosir3 || body.priceRetail),
        printerTarget: body.printerTarget || 'Cashier',
      },
    });

    return NextResponse.json({ success: true, data: newProduct });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}
