import { verifyPOSCapability } from '@/lib/capabilities';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isValidPosPin } from '@/lib/pos-rules';

// Checks the shared PIN before the cashier screen unlocks Override Grosir 1 / manual discounts;
// checkout checks it again, so this only spares the cashier a failed payment.
export async function POST(request: Request) {
  const auth = await verifyPOSCapability();
  if (auth.errorResponse) return auth.errorResponse;
  const { pin } = await request.json().catch(() => ({ pin: null }));
  if (!isValidPosPin(pin)) return apiError('FORBIDDEN', 'PIN salah.', 403);
  return apiSuccess({ valid: true });
}
