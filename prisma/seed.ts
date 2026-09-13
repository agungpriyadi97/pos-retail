import { PrismaClient, Role, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "StockLedger", "ShrinkageLog", "TransactionItem", "Transaction", "BranchStock", "Product", "Category", "Member", "User", "Branch" CASCADE;`
  );

  const hashedPassword = bcrypt.hashSync('password123', 10);

  const branchGudang = await prisma.branch.create({
    data: {
      code: 'GDG-PST',
      name: 'Gudang Pusat Balekota',
      address: 'Kawasan Industri Balekota, Tangerang',
      phone: '021-5551234',
      isWarehouse: true,
    },
  });

  const branchKios = await prisma.branch.create({
    data: {
      code: 'KIOS-01',
      name: 'Kios Sekar Cabang Balekota',
      address: 'Lantai Ground Blok A No. 12',
      phone: '081299990001',
      isWarehouse: false,
    },
  });

  const owner = await prisma.user.create({
    data: {
      username: 'owner',
      fullName: 'Agung Priyadi (Owner)',
      passwordHash: hashedPassword,
      role: Role.ADMIN_OWNER,
      branchId: branchGudang.id,
    },
  });

  const cashier = await prisma.user.create({
    data: {
      username: 'kasir1',
      fullName: 'Siti Rahma',
      passwordHash: hashedPassword,
      role: Role.CASHIER,
      branchId: branchKios.id,
    },
  });

  const catSembako = await prisma.category.create({ data: { name: 'Sembako' } });
  const catMinuman = await prisma.category.create({ data: { name: 'Minuman' } });

  const p1 = await prisma.product.create({
    data: {
      barcode: '8991234567890',
      sku: 'BRS-001',
      name: 'Beras Pandan Wangi 5kg',
      costPrice: 60000,
      sellingPrice: 72000,
      minStockAlert: 5,
      unit: 'SAK',
      categoryId: catSembako.id,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      barcode: '8992345678901',
      sku: 'MYK-002',
      name: 'Minyak Goreng Sawit 2L',
      costPrice: 30000,
      sellingPrice: 36000,
      minStockAlert: 10,
      unit: 'POUCH',
      categoryId: catSembako.id,
    },
  });

  const p3 = await prisma.product.create({
    data: {
      barcode: '8993456789012',
      sku: 'TEH-003',
      name: 'Teh Botol Melati 350ml',
      costPrice: 3500,
      sellingPrice: 5000,
      minStockAlert: 24,
      unit: 'BTL',
      categoryId: catMinuman.id,
    },
  });

  await prisma.branchStock.createMany({
    data: [
      { branchId: branchKios.id, productId: p1.id, quantity: 30 },
      { branchId: branchKios.id, productId: p2.id, quantity: 50 },
      { branchId: branchKios.id, productId: p3.id, quantity: 150 },
      { branchId: branchGudang.id, productId: p1.id, quantity: 200 },
      { branchId: branchGudang.id, productId: p2.id, quantity: 300 },
    ],
  });

  await prisma.member.create({
    data: {
      phone: '081298765432',
      fullName: 'Agung Priyadi',
      points: 250,
      totalSpend: 2500000,
    },
  });

  await prisma.storeSetting.upsert({
    where: { id: "default_setting" },
    update: {},
    create: {
      id: "default_setting",
      storeName: "Sekar POS Retail",
      pointsEarnThreshold: 10000,
      pointRedeemValue: 100,
      isLoyaltyActive: true,
    },
  });

  console.log('Seeding completed successfully with hashed test passwords.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
