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
              { name: { contains: query, mode: 'insensitive' } },
              { customerNo: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: customers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
