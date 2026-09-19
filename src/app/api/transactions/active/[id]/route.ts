import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const transactionId = Number(params.id);

    await prisma.$transaction(async (tx) => {
      // Delete details first
      await tx.t_salesposdetail.deleteMany({
        where: { salesposheaderid: transactionId }
      });

      // Delete header
      await tx.t_salesposheader.delete({
        where: { id: transactionId }
      });
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete active transaction:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
