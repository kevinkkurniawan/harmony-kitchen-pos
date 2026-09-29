import { prisma } from '@/lib/db';
import { ApiErrors } from '@/lib/api-response';
import { NextResponse } from 'next/server';
import { getPOSCurrentUser, POSSessionUser } from './session';

export type { POSSessionUser };

export async function hasPOSCapability(user: POSSessionUser | null, capabilityCode: string): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'Admin' || user.username.toLowerCase() === 'admin') return true;

  try {
    const grant = await prisma.t_usercapability.findUnique({
      where: {
        userid_capabilitycode: {
          userid: user.id,
          capabilitycode: capabilityCode,
        },
      },
    });
    return grant?.isgranted === true;
  } catch (error) {
    console.error(`Error checking capability ${capabilityCode} for user ${user.id}:`, error);
    return false;
  }
}

/**
 * Verifies POS capability by strictly authenticating via the signed session cookie.
 * Never trusts client-supplied username or userId from request body.
 */
export async function verifyPOSCapability(
  capabilityCode?: string
): Promise<{ errorResponse?: NextResponse; user: POSSessionUser }> {
  const sessionUser = await getPOSCurrentUser();

  if (!sessionUser) {
    return {
      errorResponse: ApiErrors.unauthorized('Sesi kasir tidak valid atau telah berakhir. Silakan login kembali.'),
      user: null as unknown as POSSessionUser,
    };
  }

  if (capabilityCode) {
    const allowed = await hasPOSCapability(sessionUser, capabilityCode);
    if (!allowed) {
      return {
        errorResponse: ApiErrors.forbidden(
          `Pengguna '${sessionUser.username}' tidak memiliki izin (${capabilityCode}) untuk melakukan aksi ini.`
        ),
        user: sessionUser,
      };
    }
  }

  return { user: sessionUser };
}
