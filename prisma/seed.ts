import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Harmony Kitchen POS PostgreSQL Database...');

  // Seed Users
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

  // Seed Customers
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

  // Seed Tables
  const tables = [
    { tableNo: 'T01', name: 'Meja 01', capacity: 2, status: 'available' },
    { tableNo: 'T02', name: 'Meja 02', capacity: 4, status: 'occupied' },
    { tableNo: 'T03', name: 'Meja 03', capacity: 4, status: 'available' },
    { tableNo: 'T04', name: 'Meja 04', capacity: 6, status: 'reserved' },
    { tableNo: 'T05', name: 'Meja 05 (VIP)', capacity: 8, status: 'available' },
    { tableNo: 'T06', name: 'Meja Outdoor 01', capacity: 4, status: 'available' },
  ];

  for (const t of tables) {
    await prisma.table.upsert({
      where: { tableNo: t.tableNo },
      update: {},
      create: t,
    });
  }

  // Seed Products
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
      printerTarget: 'Pantry',
    },
    {
      barcode: '8991001000101',
      name: 'Nasi Goreng Spesial Harmony',
      category: 'Makanan',
      uom: 'Porsi',
      priceRetail: 35000,
      stock: 50,
      priceGrosir1: 32000,
      priceGrosir2: 33000,
      priceGrosir3: 30000,
      printerTarget: 'Kitchen',
    },
    {
      barcode: '8991001000102',
      name: 'Ayam Bakar Madu + Nasi',
      category: 'Makanan',
      uom: 'Porsi',
      priceRetail: 42000,
      stock: 35,
      priceGrosir1: 39000,
      priceGrosir2: 40000,
      priceGrosir3: 37000,
      printerTarget: 'Kitchen',
    },
    {
      barcode: '8991001000201',
      name: 'Es Kopi Susu Gula Aren',
      category: 'Minuman',
      uom: 'Gelas',
      priceRetail: 22000,
      stock: 100,
      priceGrosir1: 19000,
      priceGrosir2: 20000,
      priceGrosir3: 18000,
      printerTarget: 'Bar',
    },
    {
      barcode: '8991001000202',
      name: 'Matcha Latte Ice',
      category: 'Minuman',
      uom: 'Gelas',
      priceRetail: 28000,
      stock: 80,
      priceGrosir1: 25000,
      priceGrosir2: 26000,
      priceGrosir3: 24000,
      printerTarget: 'Bar',
    },
    {
      barcode: '8991001000301',
      name: 'Paket Hemat Berdua (Nasi Goreng + Es Teh x2)',
      category: 'Paket / Combo',
      uom: 'Paket',
      priceRetail: 75000,
      stock: 20,
      priceGrosir1: 70000,
      priceGrosir2: 72000,
      priceGrosir3: 68000,
      printerTarget: 'Kitchen',
    },
    {
      barcode: '0000023991201',
      name: 'ARJ Mug Enamel Jago Tutup 9cm',
      category: 'Peralatan Kopi',
      uom: 'Pcs',
      priceRetail: 25000,
      stock: 24,
      priceGrosir1: 22000,
      priceGrosir2: 23000,
      priceGrosir3: 20000,
      printerTarget: 'Pantry',
    },
    {
      barcode: '0000023991505',
      name: 'Harmony Stainless Steel Teapot 1.5L',
      category: 'Peralatan Kopi',
      uom: 'Pcs',
      priceRetail: 115000,
      stock: 8,
      priceGrosir1: 100000,
      priceGrosir2: 105000,
      priceGrosir3: 95000,
      printerTarget: 'Pantry',
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
