import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession, verifyPassword, hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        username: { equals: String(username).trim(), mode: 'insensitive' },
      },
      include: {
        grants: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, error: 'User kasir tidak ditemukan atau non-aktif' }, { status: 401 });
    }

    const isValid = verifyPassword(String(password), user.password);
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Password yang dimasukkan salah' }, { status: 401 });
    }

    // Transparently upgrade legacy plaintext password to secure hash
    if (!user.password.startsWith('pbkdf2:')) {
      const secureHash = hashPassword(String(password));
      await prisma.user.update({
        where: { id: user.id },
        data: { password: secureHash },
      });
    }

    const userAgent = req.headers.get('user-agent') || undefined;
    const ipAddress = req.headers.get('x-forwarded-for') || undefined;
    const sessionToken = await createSession(user.id, userAgent, ipAddress);

    const grants = user.grants.map((g) => g.permissionKey);

    return NextResponse.json({
      success: true,
      token: sessionToken,
      data: {
        id: user.id.toString(),
        username: user.username,
        name: user.fullName,
        role: user.userLevel,
        hasHpp: grants.includes('inventory.viewHpp'),
        canViewAllCashiers: grants.includes('reports.viewAllCashiers'),
        canManageGrants: grants.includes('auth.manageGrants'),
      },
    });
  } catch (error: any) {
    console.error('POS login error:', error);
    return NextResponse.json({ success: false, error: 'Gagal autentikasi kasir' }, { status: 500 });
  }
}
