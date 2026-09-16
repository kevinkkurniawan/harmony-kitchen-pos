import crypto from 'crypto';

const QUOTE_SECRET =
  process.env.QUOTE_SECRET || process.env.AUTH_SECRET || 'harmony-kitchen-pos-secret-quote-key-2026';

export interface QuotePayload {
  productId: number;
  barcode: string;
  name: string;
  price: number;
  priceType: 'retail' | 'grosir1' | 'grosir2' | 'grosir3';
  uom: string;
  cashierId: number;
  issuedAt: number;
}

export function signQuote(payload: QuotePayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', QUOTE_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyQuote(quoteRef: string): QuotePayload | null {
  if (!quoteRef || typeof quoteRef !== 'string') return null;
  const parts = quoteRef.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', QUOTE_SECRET).update(data).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    return payload;
  } catch {
    return null;
  }
}
