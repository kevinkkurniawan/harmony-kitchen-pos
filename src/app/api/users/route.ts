import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { timingSafeEqual } from 'crypto';
import { createPOSSession, clearPOSSession, getPOSCurrentUser, inferPOSRole } from '@/lib/session';

const INVALID_LOGIN = 'Username atau password salah.';

function passwordMatches(stored: string | null, given: string): boolean {
  const a = Buffer.from(stored ?? '');
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('me') === 'true' || searchParams.get('current') === 'true') {
      const current = await getPOSCurrentUser();
      if (!current) {
        return NextResponse.json({ success: false, error: 'Tidak ada sesi aktif' }, { status: 401 });
      }
      return NextResponse.json({ success: true, data: current });
    }

    // The user list is only for signed-in staff
    if (!(await getPOSCurrentUser())) {
      return NextResponse.json({ success: false, error: 'Sesi kasir tidak valid.' }, { status: 401 });
    }

    const users = await prisma.m_user.findMany({
      orderBy: { username: 'asc' },
    });

    const mappedUsers = users.map(u => ({
      id: u.id.toString(),
      username: u.username,
      name: u.username,
      role: inferPOSRole(u.username),
    }));

    return NextResponse.json({ success: true, data: mappedUsers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to fetch users from PostgreSQL:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username dan password wajib diisi.' }, { status: 400 });
    }

    const users = await prisma.m_user.findMany({
      where: { username: String(username).toLowerCase().trim() },
    });
    
    const user = users.length > 0 ? users[0] : null;

    // Same message for unknown user and wrong password, so usernames can't be probed
    if (!user || !passwordMatches(user.password, String(password))) {
      return NextResponse.json({ success: false, error: INVALID_LOGIN }, { status: 401 });
    }

    const validUsername = String(user.username || username).trim();
    const role = inferPOSRole(validUsername);
    const sessionPayload = {
      id: Number(user.id),
      username: validUsername,
      name: validUsername,
      role,
    };

    // Set HTTP-only cryptographic session cookie
    await createPOSSession(sessionPayload);

    const mappedUser = {
      id: user.id.toString(),
      username: validUsername,
      name: validUsername,
      role,
    };

    return NextResponse.json({ success: true, data: mappedUser });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to validate user login:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearPOSSession();
    return NextResponse.json({ success: true, message: 'Sesi kasir berhasil diakhiri.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
