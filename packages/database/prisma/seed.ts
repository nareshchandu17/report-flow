import { PrismaClient, OrderStatus } from '@prisma/client';

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

  // Clear existing orders
  await prisma.order.deleteMany({});
  await prisma.reportJob.deleteMany({});
  await prisma.reportArtifact.deleteMany({});

  // Generate realistic orders over the last 6 months
  const now = new Date('2026-08-16T12:00:00Z');
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
    let status: OrderStatus = OrderStatus.COMPLETED;
    if (statusRand > 0.95) status = OrderStatus.REFUNDED;
    else if (statusRand > 0.90) status = OrderStatus.CANCELLED;
    else if (statusRand > 0.80) status = OrderStatus.PENDING;

    orders.push({
      customerName,
      amount,
      status,
      createdAt: orderDate
    });
  }

  // Batch insert orders
  console.log(`Inserting ${orders.length} orders...`);
  await prisma.order.createMany({
    data: orders
  });

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
