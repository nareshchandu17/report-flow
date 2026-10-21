import request from 'supertest';
import express from 'express';
import datasetRoutes from '../routes/datasets';
import { prisma } from 'database';
import { authMiddleware } from '../middleware/auth';

describe('Dataset API Tests', () => {
  let app: express.Application;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test-datasets@example.com',
        password: 'hashedpassword'
      }
    });
    testUserId = user.id;

    // Create mock JWT token
    const jwt = (await import('jsonwebtoken')).default;
    authToken = jwt.sign({ userId: user.id }, 'test-secret');

    // Setup express app
    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req: any, res, next) => {
      req.currentUser = { id: testUserId };
      next();
    });

    app.use('/api/datasets', datasetRoutes);
  });

  afterAll(async () => {
    // Cleanup
    await prisma.order.deleteMany({ where: { dataset: { userId: testUserId } } });
    await prisma.dataset.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  describe('POST /api/datasets/upload', () => {
    it('should validate CSV with correct format', async () => {
      const validCSV = `date,amount,status,customerName
2024-01-01,100.00,COMPLETED,John Doe
2024-01-02,150.50,PENDING,Jane Smith`;

      const response = await request(app)
        .post('/api/datasets/upload')
        .send({ csvData: validCSV })
        .expect(200);

      expect(response.body).toHaveProperty('rowCount', 2);
      expect(response.body).toHaveProperty('columns');
      expect(response.body.columns).toContain('date');
      expect(response.body.columns).toContain('amount');
      expect(response.body.columns).toContain('status');
    });

    it('should reject CSV with missing required columns', async () => {
      const invalidCSV = `date,customerName
2024-01-01,John Doe`;

      const response = await request(app)
        .post('/api/datasets/upload')
        .send({ csvData: invalidCSV })
        .expect(400);

      expect(response.body.error).toHaveProperty('code', 'MISSING_COLUMNS');
    });

    it('should reject CSV with invalid date format', async () => {
      const invalidCSV = `date,amount,status
invalid-date,100.00,COMPLETED`;

      const response = await request(app)
        .post('/api/datasets/upload')
        .send({ csvData: invalidCSV })
        .expect(400);

      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should reject CSV with invalid status', async () => {
      const invalidCSV = `date,amount,status
2024-01-01,100.00,INVALID_STATUS`;

      const response = await request(app)
        .post('/api/datasets/upload')
        .send({ csvData: invalidCSV })
        .expect(400);

      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should reject CSV with invalid amount', async () => {
      const invalidCSV = `date,amount,status
2024-01-01,not-a-number,COMPLETED`;

      const response = await request(app)
        .post('/api/datasets/upload')
        .send({ csvData: invalidCSV })
        .expect(400);

      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should reject empty CSV', async () => {
      const response = await request(app)
        .post('/api/datasets/upload')
        .send({ csvData: '' })
        .expect(400);

      expect(response.body.error).toHaveProperty('code', 'EMPTY_CSV');
    });
  });

  describe('POST /api/datasets/create', () => {
    it('should create dataset and import orders', async () => {
      const csvData = `date,amount,status,customerName
2024-01-01,100.00,COMPLETED,John Doe
2024-01-02,150.50,PENDING,Jane Smith`;

      const response = await request(app)
        .post('/api/datasets/create')
        .send({
          name: 'Test Dataset',
          currency: 'USD',
          csvData,
          columnMapping: {
            date: 'date',
            amount: 'amount',
            status: 'status',
            customerName: 'customerName'
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('dataset');
      expect(response.body.dataset).toHaveProperty('name', 'Test Dataset');
      expect(response.body.dataset).toHaveProperty('currency', 'USD');
      expect(response.body).toHaveProperty('importedCount', 2);

      // Verify orders were created
      const orders = await prisma.order.findMany({
        where: { datasetId: response.body.dataset.id }
      });
      expect(orders.length).toBe(2);
    });
  });
});
