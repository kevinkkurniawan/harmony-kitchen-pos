import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const t of ['Customer', 'Product', 'Transaction', 'TransactionItem', 'User']) {
      const cols: any = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${t}';
      `);
      const count: any = await prisma.$queryRawUnsafe(`SELECT count(*) FROM "${t}"`);
      console.log(`\nTable ${t} (count=${count[0].count}):`, cols.map((c: any) => `${c.column_name}: ${c.data_type}`).join(', '));
    }
  } catch (err: any) {
    console.error('ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
