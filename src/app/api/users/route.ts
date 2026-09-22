import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createPOSSession, clearPOSSession, getPOSCurrentUser, inferPOSRole } from '@/lib/session';

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

    if (!user) {
      return NextResponse.json({ success: false, error: 'Username kasir tidak ditemukan di database.' }, { status: 404 });
    }

    if (user.password !== password) {
      return NextResponse.json({ success: false, error: 'Password yang dimasukkan salah.' }, { status: 401 });
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
