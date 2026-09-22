import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'pos_session';
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours for POS shift

export interface POSSessionUser {
  id: number;
  username: string;
  name?: string;
  role: 'Admin' | 'Cashier' | 'Supervisor';
}

function getSessionSecret(): string {
  if (process.env.NODE_ENV === 'production' && !process.env.POS_SESSION_SECRET) {
    throw new Error('POS_SESSION_SECRET wajib diatur pada production.');
  }
  return process.env.POS_SESSION_SECRET || 'harmony-pos-development-session-secret-key-2026';
}

function sign(value: string): string {
  return createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

export function inferPOSRole(username: string | null | undefined): POSSessionUser['role'] {
  const name = (username || '').toLowerCase();
  if (name === 'admin') return 'Admin';
  if (name.includes('spv') || name.includes('supervisor') || name.includes('manager')) return 'Supervisor';
  return 'Cashier';
}

export async function createPOSSession(user: { id: number | string; username: string; name?: string; role?: string }) {
  const role = user.role === 'Admin' || user.role === 'Supervisor' ? user.role : inferPOSRole(user.username);
  const payload = Buffer.from(
    JSON.stringify({
      id: Number(user.id),
      username: user.username,
      name: user.name || user.username,
      role,
      expiresAt: Date.now() + MAX_AGE_SECONDS * 1000,
    })
  ).toString('base64url');

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearPOSSession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getPOSCurrentUser(): Promise<POSSessionUser | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_NAME)?.value;
    if (!raw) return null;

    const separator = raw.lastIndexOf('.');
    if (separator < 1) return null;

    const payload = raw.slice(0, separator);
    const signature = raw.slice(separator + 1);
    const expected = sign(payload);

    if (
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as POSSessionUser & {
      expiresAt: number;
    };

    if (!decoded.id || !decoded.username || !decoded.expiresAt || decoded.expiresAt < Date.now()) {
      return null;
    }

    return {
      id: decoded.id,
      username: decoded.username,
      name: decoded.name || decoded.username,
      role: decoded.role || inferPOSRole(decoded.username),
    };
  } catch {
    return null;
  }
}
