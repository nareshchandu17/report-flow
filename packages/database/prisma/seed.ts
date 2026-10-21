import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CUSTOMERS = [
  'Acme Corp', 'Globex Corporation', 'Soylent Corp', 'Initech',
  'Umbrella Corporation', 'Stark Industries', 'Wayne Enterprises',
  'Oscorp', 'Cyberdyne Systems', 'Hooli', 'Pied Piper', 'Massive Dynamic'
];

async function main() {
  console.log('Seeding database...');

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      name: 'Naresh',
      email: 'test@example.com'
    }
  });

  console.log(`Created user: ${user.name}`);

  // Check if datasets already exist to avoid destructive behavior
  const existingDatasets = await prisma.dataset.count();
  if (existingDatasets > 0) {
    console.log(`⚠️  Database already has ${existingDatasets} datasets.`);
    console.log('⚠️  Skipping seed data generation to avoid data loss.');
    console.log('💡 To re-seed, manually delete datasets first:');
    console.log('   - Run: DELETE FROM "Dataset"; in your SQLite client, or');
    console.log('   - Delete the report.db file and run migrations again');
    console.log('✅ Seed skipped successfully (data preserved).');
    return;
  }

  // Create a sample dataset for demo data
  const sampleDataset = await prisma.dataset.create({
    data: {
      userId: user.id,
      name: 'Sample Orders Dataset',
      currency: 'USD',
      rowCount: 5000
    }
  });
  console.log(`📁 Created sample dataset: ${sampleDataset.name}`);

  // Generate realistic orders over the last 6 months
  const now = new Date();
  console.log(`📅 Generating orders from ${new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`);
  const orders = [];

  for (let i = 0; i < 5000; i++) {
    // Random date within the last 180 days
    const daysAgo = Math.floor(Math.random() * 180);
    const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    orderDate.setHours(Math.floor(Math.random() * 24));
    orderDate.setMinutes(Math.floor(Math.random() * 60));

    // Random customer
    const customerName = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];

    // Random amount between 10 and 5000
    // Higher probability for smaller amounts
    const amountBase = Math.random();
    const amount = amountBase > 0.9 ? 
      Math.floor(Math.random() * 4000) + 1000 : // 1000-5000 (10%)
      Math.floor(Math.random() * 900) + 10;     // 10-910 (90%)

    // Status distribution: 80% Completed, 10% Pending, 5% Cancelled, 5% Refunded
    const statusRand = Math.random();
    let status = 'COMPLETED';
    if (statusRand > 0.95) status = 'REFUNDED';
    else if (statusRand > 0.90) status = 'CANCELLED';
    else if (statusRand > 0.80) status = 'PENDING';

    orders.push({
      datasetId: sampleDataset.id,
      customerName,
      amount,
      status,
      createdAt: orderDate
    });
  }

  // Batch insert orders
  console.log(`📊 Inserting ${orders.length} orders into database...`);
  await prisma.order.createMany({
    data: orders
  });

  console.log('✅ Database seeded successfully.');
  console.log(`📈 Orders generated: ${orders.length}`);
  console.log(`📅 Date range: Last 180 days from today`);
  console.log(`💰 Currency: ${sampleDataset.currency}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
