import { Router, Request, Response } from 'express';
import { prisma, generateSalesSummary, generateOrderAnalytics } from 'database';
import { CreateReportSchema, JOB_STATUS, REPORT_TYPES } from 'shared';
import { reportQueue } from '../queue';
import { authMiddleware } from '../middleware/auth';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';

const router = Router();
router.use(authMiddleware);

// GET /api/reports/preview
router.get('/preview', async (req: Request, res: Response) => {
  try {
    const { type, fromDate, toDate } = req.query;
    
    if (!type || !fromDate || !toDate) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Missing required query parameters' } });
    }

    const from = new Date(fromDate as string);
    const to = new Date(toDate as string);

    let data;
    if (type === 'SALES_SUMMARY') {
      data = await generateSalesSummary(from, to);
    } else if (type === 'ORDER_ANALYTICS') {
      data = await generateOrderAnalytics(from, to);
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

    const { reportType, fromDate, toDate } = parsed.data;

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
        reportType,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
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
    const { status, type, page = '1', limit = '10' } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = { userId };
    if (status) where.status = status;
    if (type) where.reportType = type;

    const [reports, total] = await Promise.all([
      prisma.reportJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.reportJob.count({ where })
    ]);

    res.json({ data: reports, total, page: Number(page), limit: Number(limit) });
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
      include: { artifact: true }
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

// GET /api/reports/:id/download
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser.id;
    const { id } = req.params;

    const report = await prisma.reportJob.findUnique({
      where: { id },
      include: { artifact: true }
    });

    if (!report || !report.artifact) {
      return res.status(404).json({ error: { code: 'REPORT_NOT_FOUND', message: 'Report artifact could not be found' } });
    }

    if (report.userId !== userId) {
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

export default router;
