import { Router, Request, Response } from 'express';
import { prisma, generateSalesSummary, generateOrderAnalytics } from 'database';
import { CreateReportSchema, PaginationSchema, JOB_STATUS, REPORT_TYPES } from 'shared';
import { reportQueue } from '../queue';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';

const router = Router();

// GET /api/reports/:id/download (Publicly accessible with valid report UUID, validates user if authenticated)
router.get('/:id/download', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const report = await prisma.reportJob.findUnique({
      where: { id },
      include: { artifact: true }
    });

    if (!report || !report.artifact) {
      return res.status(404).json({ error: { code: 'REPORT_NOT_FOUND', message: 'Report artifact could not be found' } });
    }

    if (req.currentUser && report.userId !== req.currentUser.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have access to this report' } });
    }

    if (report.status !== JOB_STATUS.COMPLETED) {
      return res.status(400).json({ error: { code: 'NOT_READY', message: 'Report is not ready for download' } });
    }

    const artifact = report.artifact;
    
    try {
      await stat(artifact.storagePath);
    } catch {
      return res.status(404).json({ error: { code: 'FILE_NOT_FOUND', message: 'Artifact file is missing' } });
    }

    res.setHeader('Content-Type', artifact.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${artifact.fileName}"`);
    
    const readStream = createReadStream(artifact.storagePath);
    readStream.pipe(res);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' } });
  }
});

// Apply auth middleware to all other routes
router.use(authMiddleware);

// POST /api/auth/register
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Missing required fields' } });
    }

    const bcrypt = (await import('bcrypt')).default;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword }
    });

    const jwt = (await import('jsonwebtoken')).default;
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });

    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: { code: 'USER_EXISTS', message: 'Email already registered' } });
    }
    req.log.error(error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' } });
  }
});

// POST /api/auth/login
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Missing email or password' } });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const bcrypt = (await import('bcrypt')).default;
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const jwt = (await import('jsonwebtoken')).default;
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });

    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' } });
  }
});

// Apply auth middleware to all other routes
router.use(authMiddleware);

// GET /api/datasets
router.get('/datasets', async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser.id;

    const datasets = await prisma.dataset.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(datasets);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' } });
  }
});

// GET /api/reports/preview
router.get('/preview', async (req: Request, res: Response) => {
  try {
    const { type, fromDate, toDate, datasetId } = req.query;
    
    if (!type || !fromDate || !toDate || !datasetId) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Missing required query parameters' } });
    }

    const from = new Date(fromDate as string);
    const to = new Date(toDate as string);
    
    // Set toDate to end of day to include all data on the last day
    to.setHours(23, 59, 59, 999);

    let data;
    if (type === 'SALES_SUMMARY') {
      data = await generateSalesSummary(from, to, datasetId as string);
    } else if (type === 'ORDER_ANALYTICS') {
      data = await generateOrderAnalytics(from, to, datasetId as string);
    } else {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Invalid report type' } });
    }

    res.json(data);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' } });
  }
});

// POST /api/reports
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser.id;
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    // Validate payload
    const parsed = CreateReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Invalid report parameters' } });
    }

    const { reportType, fromDate, toDate, datasetId } = parsed.data;

    // Verify dataset ownership
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId }
    });

    if (!dataset || dataset.userId !== userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have access to this dataset' } });
    }

    // Set toDate to end of day to include all data on the last day
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    // Check idempotency
    if (idempotencyKey) {
      const existingJob = await prisma.reportJob.findFirst({
        where: { idempotencyKey, userId }
      });
      if (existingJob) {
        return res.status(200).json({ jobId: existingJob.id, status: existingJob.status });
      }
    }

    // Create report job in DB
    const reportJob = await prisma.reportJob.create({
      data: {
        userId,
        datasetId,
        reportType,
        fromDate: new Date(fromDate),
        toDate: to,
        idempotencyKey
      }
    });

    // Enqueue job in BullMQ
    await reportQueue.add('generate-report', { jobId: reportJob.id });

    res.status(202).json({ jobId: reportJob.id, status: JOB_STATUS.QUEUED });
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' } });
  }
});

// GET /api/reports
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser.id;
    const { status, type, search, sort = 'newest', fromDate, toDate, page = '1', limit = '10' } = req.query;

    // Validate pagination
    const pagination = PaginationSchema.parse({ page, limit });
    const skip = (pagination.page - 1) * pagination.limit;
    
    const where: any = { userId };
    if (status && status !== 'ALL') where.status = status;
    if (type && type !== 'ALL') where.reportType = type;

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate as string);
      if (toDate) {
        const to = new Date(toDate as string);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { reportType: { contains: q } },
        { dataset: { name: { contains: q } } }
      ];
    }

    const orderBy: any = sort === 'oldest' ? { createdAt: 'asc' } : { createdAt: 'desc' };

    const [reports, total] = await Promise.all([
      prisma.reportJob.findMany({
        where,
        include: { dataset: true, artifact: true },
        orderBy,
        skip,
        take: pagination.limit
      }),
      prisma.reportJob.count({ where })
    ]);

    res.json({ data: reports, total, page: pagination.page, limit: pagination.limit });
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' } });
  }
});

// DELETE /api/reports/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser.id;
    const { id } = req.params;

    const report = await prisma.reportJob.findUnique({
      where: { id },
      include: { artifact: true }
    });

    if (!report) {
      return res.status(404).json({ error: { code: 'REPORT_NOT_FOUND', message: 'Report could not be found' } });
    }

    if (report.userId !== userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have access to this report' } });
    }

    // Delete artifact file from disk if present
    if (report.artifact && report.artifact.storagePath) {
      try {
        const fs = await import('fs/promises');
        await fs.unlink(report.artifact.storagePath).catch(() => {});
      } catch (err) {
        // Ignore file delete errors
      }
    }

    await prisma.reportArtifact.deleteMany({ where: { jobId: id } });
    await prisma.reportJob.delete({ where: { id } });

    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' } });
  }
});

// GET /api/reports/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser.id;
    const { id } = req.params;

    const report = await prisma.reportJob.findUnique({
      where: { id },
      include: { artifact: true, dataset: true }
    });

    if (!report) {
      return res.status(404).json({ error: { code: 'REPORT_NOT_FOUND', message: 'Report could not be found' } });
    }

    if (report.userId !== userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have access to this report' } });
    }

    res.json({
      id: report.id,
      reportType: report.reportType,
      status: report.status,
      progress: report.progress,
      createdAt: report.createdAt,
      startedAt: report.startedAt,
      completedAt: report.completedAt,
      errorMessage: report.errorMessage,
      dataset: report.dataset,
      downloadAvailable: report.status === JOB_STATUS.COMPLETED && !!report.artifactId
    });
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' } });
  }
});

// POST /api/reports/:id/retry
router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser.id;
    const { id } = req.params;

    const report = await prisma.reportJob.findUnique({
      where: { id }
    });

    if (!report) {
      return res.status(404).json({ error: { code: 'REPORT_NOT_FOUND', message: 'Report could not be found' } });
    }

    if (report.userId !== userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have access to this report' } });
    }

    if (report.status !== JOB_STATUS.FAILED) {
      return res.status(400).json({ error: { code: 'INVALID_STATE', message: 'Only failed reports can be retried' } });
    }

    // Re-queue the job and reset status
    await prisma.reportJob.update({
      where: { id },
      data: {
        status: JOB_STATUS.QUEUED,
        progress: 0,
        errorMessage: null
      }
    });

    await reportQueue.add('generate-report', { jobId: report.id });

    res.json({ jobId: report.id, status: JOB_STATUS.QUEUED });
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' } });
  }
});

export default router;
