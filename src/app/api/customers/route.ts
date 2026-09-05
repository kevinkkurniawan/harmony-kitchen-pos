import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';

    const customers = await prisma.customer.findMany({
      where: query
        ? {
            OR: [
              { customername: { contains: query, mode: 'insensitive' } },
              { customerno: { contains: query, mode: 'insensitive' } },
              { phone1: { contains: query } },
              { phone2: { contains: query } },
            ],
          }
        : undefined,
      orderBy: { customername: 'asc' },
    });

    const mappedCustomers = customers.map((c) => ({
      id: c.id.toString(),
      customerNo: c.customerno || '',
      name: c.customername || 'Unknown',
      phone: c.phone1 || c.phone2 || '',
      customerType: 'Regular', // Hardcoded if not present directly
      discountPercent: 0, // Using 0 by default, could use credit_limit or something else
    }));

    return NextResponse.json({ success: true, data: mappedCustomers });
  } catch (err: any) {
    console.error('Failed to fetch customers from PostgreSQL database:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
