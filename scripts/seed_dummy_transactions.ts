import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dummy transactions for today into PostgreSQL...');

  const products = await prisma.product.findMany();
  if (products.length === 0) {
    console.error('No products found in DB. Run npx tsx prisma/seed.ts first!');
    return;
  }

  // Clear existing transactions for today to ensure clean testing state
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  await prisma.transaction.deleteMany({
    where: {
      createdAt: { gte: startOfDay },
    },
  });

  const p1 = products[0];
  const p2 = products[1] || products[0];
  const p3 = products[2] || products[0];
  const p4 = products[3] || products[0];

  const cashierName = 'Linda Kasir Shift 2';

  const dummyTxList = [
    // 1. CASH transactions (Total ~1,620,000)
    {
      invoiceNo: `INV-${Date.now()}-01`,
      cashierName,
      paymentMethod: 'CASH',
      items: [{ product: p1, quantity: 2, price: p1.priceRetail }],
      cashPaid: 200000,
    },
    {
      invoiceNo: `INV-${Date.now()}-02`,
      cashierName,
      paymentMethod: 'CASH',
      items: [
        { product: p2, quantity: 5, price: p2.priceRetail },
        { product: p3, quantity: 2, price: p3.priceRetail },
      ],
      cashPaid: 600000,
    },
    {
      invoiceNo: `INV-${Date.now()}-03`,
      cashierName,
      paymentMethod: 'CASH',
      items: [{ product: p4, quantity: 4, price: p4.priceRetail }],
      cashPaid: 500000,
    },
    {
      invoiceNo: `INV-${Date.now()}-04`,
      cashierName,
      paymentMethod: 'CASH',
      items: [{ product: p1, quantity: 4, price: p1.priceRetail }],
      cashPaid: 400000,
    },

    // 2. EDC transactions
    {
      invoiceNo: `INV-${Date.now()}-05`,
      cashierName,
      paymentMethod: 'EDC',
      items: [{ product: p3, quantity: 4, price: p3.priceRetail }],
      cashPaid: p3.priceRetail * 4,
    },
    {
      invoiceNo: `INV-${Date.now()}-06`,
      cashierName,
      paymentMethod: 'EDC',
      items: [{ product: p2, quantity: 3, price: p2.priceRetail }],
      cashPaid: p2.priceRetail * 3,
    },

    // 3. TRANSFER transactions
    {
      invoiceNo: `INV-${Date.now()}-07`,
      cashierName,
      paymentMethod: 'TRANSFER',
      items: [
        { product: p1, quantity: 3, price: p1.priceRetail },
        { product: p4, quantity: 2, price: p4.priceRetail },
      ],
      cashPaid: p1.priceRetail * 3 + p4.priceRetail * 2,
    },

    // 4. QRIS transactions (Total ~146,000)
    {
      invoiceNo: `INV-${Date.now()}-08`,
      cashierName,
      paymentMethod: 'QRIS',
      items: [{ product: p1, quantity: 1, price: p1.priceRetail }],
      cashPaid: p1.priceRetail,
    },
    {
      invoiceNo: `INV-${Date.now()}-09`,
      cashierName,
      paymentMethod: 'QRIS',
      items: [{ product: p2, quantity: 1, price: p2.priceRetail }],
      cashPaid: p2.priceRetail,
    },

    // 5. SHOPEE transactions (Total ~1,069,000)
    {
      invoiceNo: `INV-${Date.now()}-10`,
      cashierName,
      paymentMethod: 'SHOPEE',
      items: [{ product: p4, quantity: 5, price: p4.priceRetail }],
      cashPaid: p4.priceRetail * 5,
    },
    {
      invoiceNo: `INV-${Date.now()}-11`,
      cashierName,
      paymentMethod: 'SHOPEE',
      items: [
        { product: p1, quantity: 2, price: p1.priceRetail },
        { product: p3, quantity: 3, price: p3.priceRetail },
      ],
      cashPaid: p1.priceRetail * 2 + p3.priceRetail * 3,
    },

    // 6. TOKOPEDIA transactions
    {
      invoiceNo: `INV-${Date.now()}-12`,
      cashierName,
      paymentMethod: 'TOKOPEDIA',
      items: [{ product: p2, quantity: 4, price: p2.priceRetail }],
      cashPaid: p2.priceRetail * 4,
    },
  ];

  for (const t of dummyTxList) {
    const subtotal = t.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const total = subtotal;
    const change = Math.max(0, t.cashPaid - total);

    await prisma.transaction.create({
      data: {
        invoiceNo: t.invoiceNo,
        cashierName: t.cashierName,
        mode: 'Retail',
        subtotal,
        discountAmount: 0,
        taxAmount: 0,
        serviceCharge: 0,
        total,
        paymentMethod: t.paymentMethod,
        cashPaid: t.cashPaid,
        change,
        isGrosirMode: false,
        createdAt: new Date(),
        items: {
          create: t.items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            selectedPrice: i.price,
            priceType: 'retail',
          })),
        },
      },
    });
  }

  console.log('Successfully seeded today dummy transactions into PostgreSQL database!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
