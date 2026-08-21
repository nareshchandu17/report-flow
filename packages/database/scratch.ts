import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.$queryRaw`SELECT DATE("createdAt" / 1000, 'unixepoch') as "Date" FROM "Order" LIMIT 1`.then(console.log).finally(() => p.$disconnect());
