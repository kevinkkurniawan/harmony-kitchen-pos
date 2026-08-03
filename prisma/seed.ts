import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Harmony Kitchenware POS PostgreSQL Database...');

  // Seed Users (Frm_LogIn)
  await prisma.user.upsert({
    where: { username: 'lia' },
    update: {},
    create: { username: 'lia', name: 'Lia Kasir', role: 'Cashier' },
  });

  await prisma.user.upsert({
    where: { username: 'linda' },
    update: {},
    create: { username: 'linda', name: 'Linda Kasir', role: 'Cashier' },
  });

  await prisma.user.upsert({
    where: { username: 'sulis' },
    update: {},
    create: { username: 'sulis', name: 'Sulis Supervisor', role: 'Supervisor' },
  });

  // Seed Customers (Frm_MemberValidation / sp_SPSalesGrosir_GetCustomer)
  await prisma.customer.upsert({
    where: { customerNo: 'CUST-001' },
    update: {},
    create: {
      customerNo: 'CUST-001',
      name: 'Budi Santoso (Grosir)',
      phone: '08123456789',
      customerType: 'Wholesale',
      discountPercent: 5,
    },
  });

  await prisma.customer.upsert({
    where: { customerNo: 'CUST-002' },
    update: {},
    create: {
      customerNo: 'CUST-002',
      name: 'Siti Rahma (VIP)',
      phone: '08198765432',
      customerType: 'Vip',
      discountPercent: 10,
    },
  });

  // Seed Products (sp_SPSalesPOSDetail_GetData & sp_SPSalesGrosir_GetPrice)
  const products = [
    {
      barcode: '0000023274495',
      name: 'ERIS Coffee Grinder Manual Kayu',
      category: 'Peralatan Kopi',
      uom: 'Pcs',
      priceRetail: 85000,
      stock: 12,
      priceGrosir1: 80000,
      priceGrosir2: 82500,
      priceGrosir3: 78000,
      printerTarget: 'Cashier',
    },
    {
      barcode: '7581246834770',
      name: 'OTC Coffee Grinder Manual',
      category: 'Peralatan Kopi',
      uom: 'Pcs',
      priceRetail: 80000,
      stock: 15,
      priceGrosir1: 75000,
      priceGrosir2: 77500,
      priceGrosir3: 72000,
      printerTarget: 'Cashier',
    },
    {
      barcode: '6984526518659',
      name: 'ERIS Coffee Grinder Manual Tabung Stainless',
      category: 'Peralatan Kopi',
      uom: 'Pcs',
      priceRetail: 85000,
      stock: 8,
      priceGrosir1: 80000,
      priceGrosir2: 82500,
      priceGrosir3: 78000,
      printerTarget: 'Cashier',
    },
    {
      barcode: '0000023101371',
      name: 'Nima Electric Coffee Grinder',
      category: 'Peralatan Kopi',
      uom: 'Pcs',
      priceRetail: 95000,
      stock: 10,
      priceGrosir1: 85000,
      priceGrosir2: 87500,
      priceGrosir3: 82000,
      printerTarget: 'Cashier',
    },
    {
      barcode: '0000023991201',
      name: 'ARJ Mug Enamel Jago Tutup 9cm',
      category: 'Mug Enamel',
      uom: 'Pcs',
      priceRetail: 25000,
      stock: 24,
      priceGrosir1: 22000,
      priceGrosir2: 23000,
      priceGrosir3: 20000,
      printerTarget: 'LX300',
    },
    {
      barcode: '0000023991505',
      name: 'Harmony Stainless Steel Teapot 1.5L',
      category: 'Teapot',
      uom: 'Pcs',
      priceRetail: 115000,
      stock: 8,
      priceGrosir1: 100000,
      priceGrosir2: 105000,
      priceGrosir3: 95000,
      printerTarget: 'LX300',
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { barcode: p.barcode },
      update: {},
      create: p,
    });
  }

  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
