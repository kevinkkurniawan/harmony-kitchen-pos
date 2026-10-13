import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPOSCapability } from '@/lib/capabilities';

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyPOSCapability();
    if (auth.errorResponse) return auth.errorResponse;

    const params = await props.params;
    const transactionId = Number(params.id);

    const deleted = await prisma.$transaction(async (tx) => {
      // Only unfinished drafts may be cancelled; completed sales must be voided through the ERP
      const header = await tx.t_salesposheader.findFirst({
        where: { id: transactionId, status: 'DRAFT' },
      });
      if (!header) return false;

      // Delete details first
      await tx.t_salesposdetail.deleteMany({
        where: { salesposheaderid: transactionId }
      });

      // Delete header
      await tx.t_salesposheader.delete({
        where: { id: transactionId }
      });
      return true;
    });

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Hanya transaksi draft yang dapat dibatalkan.' }, { status: 409 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete active transaction:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
