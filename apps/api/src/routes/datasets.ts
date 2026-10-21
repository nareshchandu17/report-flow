import { Router, Request, Response } from 'express';
import { prisma } from 'database';
import { authMiddleware } from '../middleware/auth';
import Papa from 'papaparse';

const router = Router();
router.use(authMiddleware);

interface CSVRow {
  [key: string]: string;
}

// POST /api/datasets/upload
router.post('/upload', async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser.id;
    const { csvData } = req.body;

    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'CSV data is required' } });
    }

    // Parse CSV
    const parseResult = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });

    if (parseResult.errors.length > 0) {
      return res.status(400).json({
        error: { code: 'CSV_PARSE_ERROR', message: 'Failed to parse CSV' },
        details: parseResult.errors
      });
    }

    const rows = parseResult.data as CSVRow[];

    if (rows.length === 0) {
      return res.status(400).json({ error: { code: 'EMPTY_CSV', message: 'CSV file is empty' } });
    }

    if (rows.length > 10000) {
      return res.status(400).json({ error: { code: 'CSV_TOO_LARGE', message: 'CSV file exceeds maximum row limit (10,000)' } });
    }

    // Get available columns
    const columns = Object.keys(rows[0]);

    // Validate required columns exist
    const requiredColumns = ['date', 'amount', 'status'];
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));

    if (missingColumns.length > 0) {
      return res.status(400).json({
        error: { code: 'MISSING_COLUMNS', message: 'Missing required columns' },
        missing: missingColumns,
        available: columns
      });
    }

    // Validate sample rows
    const validationErrors: string[] = [];
    const sampleSize = Math.min(5, rows.length);

    for (let i = 0; i < sampleSize; i++) {
      const row = rows[i];

      // Validate date
      const dateValue = row['date'];
      if (!dateValue || isNaN(new Date(dateValue).getTime())) {
        validationErrors.push(`Row ${i + 1}: Invalid date format`);
      }

      // Validate amount
      const amountValue = row['amount'];
      if (amountValue === undefined || amountValue === null || isNaN(Number(amountValue))) {
        validationErrors.push(`Row ${i + 1}: Invalid amount`);
      }

      // Validate status
      const statusValue = row['status'];
      const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED'];
      if (!statusValue || !validStatuses.includes(String(statusValue).toUpperCase())) {
        validationErrors.push(`Row ${i + 1}: Invalid status (must be one of: ${validStatuses.join(', ')})`);
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'CSV data validation failed' },
        errors: validationErrors
      });
    }

    // Return preview data
    res.json({
      rowCount: rows.length,
      columns,
      sampleRows: rows.slice(0, 5),
      currency: 'USD' // Default currency, can be overridden in UI
    });
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' } });
  }
});

// POST /api/datasets/create
router.post('/create', async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser.id;
    const { name, currency, csvData, columnMapping } = req.body;

    if (!name || !currency || !csvData) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Missing required fields' } });
    }

    // Parse CSV
    const parseResult = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });

    if (parseResult.errors.length > 0) {
      return res.status(400).json({
        error: { code: 'CSV_PARSE_ERROR', message: 'Failed to parse CSV' },
        details: parseResult.errors
      });
    }

    const rows = parseResult.data as CSVRow[];

    // Create dataset
    const dataset = await prisma.dataset.create({
      data: {
        userId,
        name,
        currency,
        rowCount: rows.length
      }
    });

    // Map columns and create orders
    const orders = rows.map(row => ({
      datasetId: dataset.id,
      customerName: row[columnMapping.customerName] || 'Unknown',
      amount: Number(row[columnMapping.amount]),
      status: String(row[columnMapping.status]).toUpperCase(),
      createdAt: new Date(row[columnMapping.date])
    }));

    // Bulk create orders (in batches to avoid hitting limits)
    const batchSize = 100;
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      await prisma.order.createMany({
        data: batch
      });
    }

    res.json({
      dataset,
      importedCount: orders.length
    });
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' } });
  }
});

export default router;
