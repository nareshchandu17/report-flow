import { prisma } from 'database';
import { JOB_STATUS, REPORT_TYPES } from 'shared';
import processor from '../processor';
import fs from 'fs/promises';

describe('Worker Processor Integration Test', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Get the seed user
    const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
    if (!user) throw new Error('Seed user not found');
    testUserId = user.id;
  });

  it('should process a job, create a PDF artifact, and update the database', async () => {
    // 1. Create a job
    const job = await prisma.reportJob.create({
      data: {
        userId: testUserId,
        reportType: REPORT_TYPES.SALES_SUMMARY,
        fromDate: new Date('2026-08-01'),
        toDate: new Date('2026-08-16'),
        status: JOB_STATUS.QUEUED,
      }
    });

    // Mock BullMQ Job object
    const mockBullJob: any = {
      data: { jobId: job.id },
      attemptsMade: 0,
      updateProgress: jest.fn()
    };

    // 2. Process the job
    await processor(mockBullJob);

    // 3. Verify Job status
    const updatedJob = await prisma.reportJob.findUnique({
      where: { id: job.id },
      include: { artifact: true }
    });

    expect(updatedJob).toBeDefined();
    expect(updatedJob?.status).toBe(JOB_STATUS.COMPLETED);
    expect(updatedJob?.progress).toBe(100);
    expect(updatedJob?.artifact).toBeDefined();

    // 4. Verify PDF artifact exists on disk with non-zero size
    const artifact = updatedJob!.artifact!;
    const stats = await fs.stat(artifact.storagePath);
    expect(stats.size).toBeGreaterThan(0);
    expect(artifact.fileSize).toBe(stats.size);
    expect(artifact.mimeType).toBe('application/pdf');

    // Clean up file
    await fs.unlink(artifact.storagePath).catch(() => {});
  });
});
