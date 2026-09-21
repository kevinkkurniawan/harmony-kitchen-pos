import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get('barcode')?.trim();

    if (!barcode) {
      return NextResponse.json({ success: false, error: 'Barcode is required' }, { status: 400 });
    }

    let inventory = await prisma.inventory.findFirst({
      where: { 
        OR: [
          { barcode: barcode },
          { inventoryno: barcode }
        ]
      },
      include: {
        m_uom: true,
      }
    });

    // If not found and barcode is numeric, try matching while ignoring leading zeroes
    if (!inventory && barcode.match(/^[0-9]+$/)) {
      const strippedInput = barcode.replace(/^0+/, '');
      if (strippedInput.length > 0) {
        const candidates = await prisma.inventory.findMany({
          where: {
            OR: [
              { barcode: { endsWith: strippedInput } },
              { inventoryno: { endsWith: strippedInput } }
            ]
          },
          include: { m_uom: true }
        });

        inventory = candidates.find(c => 
          (c.barcode && c.barcode.replace(/^0+/, '') === strippedInput) || 
          (c.inventoryno && c.inventoryno.replace(/^0+/, '') === strippedInput)
        ) || null;
      }
    }

    if (!inventory) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const product = {
      id: inventory.id.toString(),
      name: inventory.inventoryname || 'Unknown',
      barcode: inventory.barcode || inventory.inventoryno || '',
      category: 'General', // Not mapped in new schema directly, hardcoded for now
      uom: inventory.m_uom?.uomname || 'Pcs',
      priceRetail: Number(inventory.price || 0),
      stock: Number(inventory.stokupdate || 0),
      priceGrosir1: Number(inventory.grosir1 || inventory.price || 0),
      priceGrosir2: Number(inventory.grosir2 || inventory.price || 0),
      priceGrosir3: Number(inventory.grosir3 || inventory.price || 0),
      printerTarget: 'Cashier'
    };

    return NextResponse.json({
      success: true,
      data: product,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Failed to scan product by barcode:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
