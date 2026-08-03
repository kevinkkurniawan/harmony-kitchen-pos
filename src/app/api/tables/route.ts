import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const tables = await prisma.table.findMany({
      orderBy: { tableNo: 'asc' },
    });
    return NextResponse.json({ success: true, data: tables });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    const updatedTable = await prisma.table.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, data: updatedTable });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
