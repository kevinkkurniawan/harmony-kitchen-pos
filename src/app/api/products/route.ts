import { NextResponse } from 'next/server';
import { MOCK_PRODUCTS } from '@/data/mockProducts';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';

  let filtered = MOCK_PRODUCTS;

  if (query) {
    filtered = MOCK_PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.barcode.includes(query)
    );
  }

  // Simulate network latency for refresh demo
  await new Promise((resolve) => setTimeout(resolve, 300));

  return NextResponse.json({
    success: true,
    data: filtered,
    updatedAt: new Date().toISOString(),
  });
}
