import { NextRequest, NextResponse } from 'next/server';
import { resolveSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await resolveSession(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('POS session error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memverifikasi sesi kasir' }, { status: 500 });
  }
}
