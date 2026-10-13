import { verifyPOSCapability } from '@/lib/capabilities';
import { apiSuccess } from '@/lib/api-response';
import { getTaxRates } from '@/lib/pos-rules';

export async function GET() {
  const auth = await verifyPOSCapability();
  if (auth.errorResponse) return auth.errorResponse;
  return apiSuccess(getTaxRates());
}
