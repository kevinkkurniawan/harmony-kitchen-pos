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
              { customerName: { contains: query, mode: 'insensitive' } },
              { customerCode: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query } },
            ],
          }
        : undefined,
      orderBy: { customerName: 'asc' },
    });

    const mappedCustomers = customers.map((c) => ({
      id: c.id.toString(),
      customerNo: c.customerCode || '',
      name: c.customerName || 'Unknown',
      phone: c.phone || '',
      customerType: c.customerType || 'Regular',
      discountPercent: 0,
    }));

    return NextResponse.json({ success: true, data: mappedCustomers });
  } catch (err: any) {
    console.error('Failed to fetch customers from PostgreSQL database:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
