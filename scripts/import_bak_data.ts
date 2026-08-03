import sql from 'mssql';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mssqlConfig: sql.config = {
  user: 'sa',
  password: 'adm1nPassword!',
  server: 'localhost',
  port: 1433,
  database: 'db_Harmony',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function main() {
  console.log('Connecting to restored MSSQL database db_Harmony...');
  const pool = await sql.connect(mssqlConfig);
  console.log('Successfully connected to MSSQL!');

  console.log('Fetching active inventory items from M_Inventory...');
  const result = await pool.request().query(`
    SELECT 
      ID,
      ISNULL(Barcode, '') AS Barcode,
      ISNULL(InventoryNo, '') AS InventoryNo,
      ISNULL(InventoryName, 'Produk Tanpa Nama') AS InventoryName,
      ISNULL(Price, 0) AS PriceRetail,
      ISNULL(StokAwal, 0) AS Stock,
      ISNULL(Grosir1, ISNULL(Price, 0)) AS PriceGrosir1,
      ISNULL(Grosir2, ISNULL(Price, 0)) AS PriceGrosir2,
      ISNULL(Grosir3, ISNULL(Price, 0)) AS PriceGrosir3
    FROM M_Inventory
    WHERE isActive = 1 AND InventoryName IS NOT NULL AND InventoryName <> '';
  `);

  const rawItems = result.recordset;
  console.log(`Retrieved ${rawItems.length} active inventory items from MSSQL.`);

  console.log('Clearing existing product data in PostgreSQL...');
  await prisma.transactionItem.deleteMany({});
  await prisma.product.deleteMany({});

  console.log('Transforming & Batch inserting into PostgreSQL (harmony_pos)...');

  const batchSize = 500;
  let insertedCount = 0;
  const processedBarcodes = new Set<string>();

  for (let i = 0; i < rawItems.length; i += batchSize) {
    const chunk = rawItems.slice(i, i + batchSize);
    const createData = [];

    for (const item of chunk) {
      // Ensure unique barcode
      let barcode = item.Barcode.trim();
      if (!barcode || barcode === '-' || processedBarcodes.has(barcode)) {
        barcode = `BC-${item.ID}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
      processedBarcodes.add(barcode);

      const priceRetail = Math.max(0, Math.round(item.PriceRetail));
      const priceG1 = Math.max(0, Math.round(item.PriceGrosir1 || priceRetail));
      const priceG2 = Math.max(0, Math.round(item.PriceGrosir2 || priceRetail));
      const priceG3 = Math.max(0, Math.round(item.PriceGrosir3 || priceRetail));
      const stock = Math.max(0, Math.round(item.Stock));

      createData.push({
        barcode,
        name: String(item.InventoryName).trim(),
        category: 'General',
        uom: 'Pcs',
        priceRetail,
        stock,
        priceGrosir1: priceG1,
        priceGrosir2: priceG2,
        priceGrosir3: priceG3,
        printerTarget: 'Cashier',
      });
    }

    await prisma.product.createMany({
      data: createData,
      skipDuplicates: true,
    });

    insertedCount += createData.length;
    console.log(`Imported ${insertedCount} / ${rawItems.length} products...`);
  }

  console.log(`✅ Successfully imported ${insertedCount} real inventory items into PostgreSQL harmony_pos!`);

  await pool.close();
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
