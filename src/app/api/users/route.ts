import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const users = await prisma.m_user.findMany({
      orderBy: { username: 'asc' },
    });

    const mappedUsers = users.map(u => ({
      id: u.id.toString(),
      username: u.username,
      name: u.username, // Placeholder
      role: 'Cashier' // Placeholder
    }));

    return NextResponse.json({ success: true, data: mappedUsers });
  } catch (err: any) {
    console.error('Failed to fetch users from PostgreSQL:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

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

    const mappedUser = {
      id: user.id.toString(),
      username: user.username,
      name: user.username,
      role: 'Cashier'
    };

    return NextResponse.json({ success: true, data: mappedUser });
  } catch (err: any) {
    console.error('Failed to validate user login:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
