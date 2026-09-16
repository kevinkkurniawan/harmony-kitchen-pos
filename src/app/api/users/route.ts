import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession, verifyPassword, hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { username: 'asc' },
      include: { grants: true },
    });

    const mappedUsers = users.map((u) => ({
      id: u.id.toString(),
      username: u.username,
      name: u.fullName,
      role: u.userLevel,
      hasHpp: u.grants.some((g) => g.permissionKey === 'inventory.viewHpp'),
      canViewAllCashiers: u.grants.some((g) => g.permissionKey === 'reports.viewAllCashiers'),
    }));

    return NextResponse.json({ success: true, data: mappedUsers });
  } catch (err: any) {
    console.error('Failed to fetch users from PostgreSQL:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { username: String(username).toLowerCase().trim() },
      include: { grants: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, error: 'Username kasir tidak ditemukan di database.' }, { status: 404 });
    }

    const isValid = verifyPassword(String(password), user.password);
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Password yang dimasukkan salah.' }, { status: 401 });
    }

    // Upgrade plaintext password
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

    const mappedUser = {
      id: user.id.toString(),
      username: user.username,
      name: user.fullName,
      role: user.userLevel,
      token: sessionToken,
      hasHpp: grants.includes('inventory.viewHpp'),
      canViewAllCashiers: grants.includes('reports.viewAllCashiers'),
    };

    return NextResponse.json({ success: true, data: mappedUser });
  } catch (err: any) {
    console.error('Failed to validate user login:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
