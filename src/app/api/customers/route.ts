import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPaginationParams, createPaginatedResponse } from '@/lib/pagination';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const paginationParams = getPaginationParams(request, 50, 1000);

    const where = query
      ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' as const } },
            { customerNo: { contains: query, mode: 'insensitive' as const } },
            { phone: { contains: query } },
          ],
        }
      : undefined;

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: paginationParams.skip,
        take: paginationParams.limit,
      }),
    ]);

    return createPaginatedResponse(customers, total, paginationParams);
  } catch (err: any) {
    console.error('Failed to fetch customers from PostgreSQL database:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
