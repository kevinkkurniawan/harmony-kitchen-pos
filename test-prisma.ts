import { prisma } from './src/lib/db';

async function main() {
  try {
    const inv = await prisma.inventory.findFirst();
    console.log('POS PRISMA INVENTORY OK:', inv?.inventoryName, 'Price:', inv?.price, 'Grosir1:', inv?.grosir1);

    const headers = await prisma.salesPOSHeader.findMany({ take: 2 });
    console.log('POS PRISMA SALES POS HEADERS OK:', headers.length, headers.map(h => h.salesPOSNo));

    const users = await prisma.user.findMany();
    console.log('POS PRISMA USERS OK:', users.length, users.map(u => u.username));

    console.log('POS PRISMA MODELS VERIFIED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('POS PRISMA TEST ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
