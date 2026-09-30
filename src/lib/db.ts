import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma_pos: PrismaClient | undefined;
};

function getDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    // Switch to port 6543 for transaction pooling to prevent EMAXCONNSESSION
    if (url.port === '5432') {
      url.port = '6543';
    }
    if (!url.searchParams.has('pgbouncer')) {
      url.searchParams.set('pgbouncer', 'true');
    }
    const currentLimit = Number(url.searchParams.get('connection_limit') || '0');
    if (!currentLimit || currentLimit < 5) {
      url.searchParams.set('connection_limit', '10');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '30');
    }
    return url.toString();
  } catch {
    return raw;
  }
}

export const prisma =
  globalForPrisma.prisma_pos ??
  new PrismaClient({
    datasourceUrl: getDatasourceUrl(),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma_pos = prisma;

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};
