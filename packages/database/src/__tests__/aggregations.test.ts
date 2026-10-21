import { prisma } from '../index';
import { generateSalesSummary, generateOrderAnalytics } from '../aggregations';
import { REPORT_TYPES } from 'shared';

describe('Analytics Aggregations with Dataset Isolation', () => {
  let testUserId: string;
  let dataset1Id: string;
  let dataset2Id: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test-analytics@example.com',
        password: 'hashedpassword'
      }
    });
    testUserId = user.id;

    // Create two datasets
    const dataset1 = await prisma.dataset.create({
      data: {
        userId: testUserId,
        name: 'Dataset 1',
        currency: 'USD',
        rowCount: 0
      }
    });
    dataset1Id = dataset1.id;

    const dataset2 = await prisma.dataset.create({
      data: {
        userId: testUserId,
        name: 'Dataset 2',
        currency: 'EUR',
        rowCount: 0
      }
    });
    dataset2Id = dataset2.id;

    // Create orders for dataset 1
    await prisma.order.createMany({
      data: [
        {
          datasetId: dataset1Id,
          customerName: 'Customer A',
          amount: 100,
          status: 'COMPLETED',
          createdAt: new Date('2024-01-01')
        },
        {
          datasetId: dataset1Id,
          customerName: 'Customer B',
          amount: 200,
          status: 'COMPLETED',
          createdAt: new Date('2024-01-02')
        },
        {
          datasetId: dataset1Id,
          customerName: 'Customer C',
          amount: 150,
          status: 'PENDING',
          createdAt: new Date('2024-01-03')
        }
      ]
    });

    // Create orders for dataset 2
    await prisma.order.createMany({
      data: [
        {
          datasetId: dataset2Id,
          customerName: 'Customer X',
          amount: 500,
          status: 'COMPLETED',
          createdAt: new Date('2024-01-01')
        },
        {
          datasetId: dataset2Id,
          customerName: 'Customer Y',
          amount: 300,
          status: 'PENDING',
          createdAt: new Date('2024-01-02')
        }
      ]
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.order.deleteMany({ where: { datasetId: { in: [dataset1Id, dataset2Id] } } });
    await prisma.dataset.deleteMany({ where: { id: { in: [dataset1Id, dataset2Id] } } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  describe('generateSalesSummary', () => {
    it('should only aggregate data from the specified dataset', async () => {
      const result = await generateSalesSummary(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        dataset1Id
      );

      expect(result.metrics.totalRevenue).toBe(300); // 100 + 200 (only completed from dataset 1)
      expect(result.metrics.totalOrders).toBe(3); // All orders from dataset 1
      expect(result.metrics.completedOrders).toBe(2); // Only completed from dataset 1
      expect(result.datasetName).toBe('Dataset 1');
      expect(result.currency).toBe('USD');
    });

    it('should return different results for different datasets', async () => {
      const result1 = await generateSalesSummary(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        dataset1Id
      );

      const result2 = await generateSalesSummary(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        dataset2Id
      );

      expect(result1.metrics.totalRevenue).not.toBe(result2.metrics.totalRevenue);
      expect(result1.datasetName).toBe('Dataset 1');
      expect(result2.datasetName).toBe('Dataset 2');
      expect(result1.currency).toBe('USD');
      expect(result2.currency).toBe('EUR');
    });

    it('should return empty results for dataset with no data in date range', async () => {
      const result = await generateSalesSummary(
        new Date('2025-01-01'),
        new Date('2025-01-31'),
        dataset1Id
      );

      expect(result.metrics.totalRevenue).toBe(0);
      expect(result.metrics.totalOrders).toBe(0);
      expect(result.metrics.completedOrders).toBe(0);
    });
  });

  describe('generateOrderAnalytics', () => {
    it('should only aggregate data from the specified dataset', async () => {
      const result = await generateOrderAnalytics(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        dataset1Id
      );

      expect(result.metrics.totalRevenue).toBe(450); // 100 + 200 + 150 (all from dataset 1)
      expect(result.metrics.totalOrders).toBe(3);
      expect(result.metrics.completedOrders).toBe(2);
      expect(result.datasetName).toBe('Dataset 1');
      expect(result.currency).toBe('USD');
    });

    it('should group by status correctly for the specified dataset', async () => {
      const result = await generateOrderAnalytics(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        dataset1Id
      );

      const completedRow = result.tableData.find((row: any) => row.status === 'COMPLETED');
      const pendingRow = result.tableData.find((row: any) => row.status === 'PENDING');

      expect(completedRow).toBeDefined();
      expect(completedRow?.count).toBe(2);
      expect(completedRow?.amount).toBe(300);

      expect(pendingRow).toBeDefined();
      expect(pendingRow?.count).toBe(1);
      expect(pendingRow?.amount).toBe(150);
    });

    it('should return different status breakdowns for different datasets', async () => {
      const result1 = await generateOrderAnalytics(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        dataset1Id
      );

      const result2 = await generateOrderAnalytics(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        dataset2Id
      );

      expect(result1.tableData.length).toBe(2); // COMPLETED, PENDING
      expect(result2.tableData.length).toBe(2); // COMPLETED, PENDING
      expect(result1.tableData[0].count).not.toBe(result2.tableData[0].count);
    });
  });
});
