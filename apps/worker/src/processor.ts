import { Job } from 'bullmq';
import { prisma } from 'database';
import { JOB_STATUS, REPORT_TYPES } from 'shared';
import { generateSalesSummary, generateOrderAnalytics } from 'database';
import { generatePDF } from './pdf/generator';
import { LocalArtifactStorage } from './storage/LocalArtifactStorage';

const storage = new LocalArtifactStorage();

export default async function (job: Job) {
  let { jobId } = job.data;

  try {
    // Handle scheduled cron jobs
    if (job.name === 'schedule-daily-sales-report') {
      const toDate = new Date();
      toDate.setHours(0, 0, 0, 0); // Midnight today
      const fromDate = new Date(toDate);
      fromDate.setDate(fromDate.getDate() - 1); // Midnight yesterday
      
      const user = await prisma.user.findFirst({ where: { email: 'test@example.com' } });
      if (!user) throw new Error("No admin user found to attach scheduled report to");

      const dataset = await prisma.dataset.findFirst({ where: { userId: user.id } });
      if (!dataset) throw new Error("No dataset found for scheduled report");

      const scheduledJob = await prisma.reportJob.create({
        data: {
          userId: user.id,
          datasetId: dataset.id,
          reportType: REPORT_TYPES.SALES_SUMMARY,
          fromDate,
          toDate,
          status: JOB_STATUS.QUEUED
        }
      });
      jobId = scheduledJob.id;
    }

    const reportJob = await prisma.reportJob.findUnique({
      where: { id: jobId }
    });

    if (!reportJob) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // 10% → Job started
    await prisma.reportJob.update({
      where: { id: jobId },
      data: {
        status: JOB_STATUS.PROCESSING,
        startedAt: new Date(),
        progress: 10,
        attempts: job.attemptsMade + 1,
        errorMessage: null
      }
    });

    // 30% → DB querying complete
    await job.updateProgress(30);
    await prisma.reportJob.update({ where: { id: jobId }, data: { progress: 30 } });

    let reportData;
    if (reportJob.reportType === REPORT_TYPES.SALES_SUMMARY) {
      reportData = await generateSalesSummary(reportJob.fromDate, reportJob.toDate, reportJob.datasetId);
    } else if (reportJob.reportType === REPORT_TYPES.ORDER_ANALYTICS) {
      reportData = await generateOrderAnalytics(reportJob.fromDate, reportJob.toDate, reportJob.datasetId);
    } else {
      throw new Error(`Unsupported report type: ${reportJob.reportType}`);
    }

    // 60% → Report data prepared
    await job.updateProgress(60);
    await prisma.reportJob.update({ where: { id: jobId }, data: { progress: 60 } });

    // 80% → PDF generated
    const pdfBuffer = await generatePDF(reportData);
    await job.updateProgress(80);
    await prisma.reportJob.update({ where: { id: jobId }, data: { progress: 80 } });

    // 95% → Artifact stored
    const fileName = `report_${reportJob.reportType}_${jobId}.pdf`;
    
    // Check if artifact already exists (idempotency)
    let artifact;
    if (reportJob.artifactId) {
      artifact = await prisma.reportArtifact.findUnique({
        where: { id: reportJob.artifactId }
      });
    }
    
    if (!artifact) {
      const { path: storagePath, size } = await storage.store(jobId, fileName, pdfBuffer);
      
      try {
        artifact = await prisma.reportArtifact.create({
          data: {
            jobId,
            fileName,
            storagePath,
            mimeType: 'application/pdf',
            fileSize: size
          }
        });
      } catch (dbError: any) {
        // Cleanup orphaned file if DB update fails
        try {
          const fs = await import('fs/promises');
          await fs.unlink(storagePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup orphaned file:', cleanupError);
        }
        throw dbError;
      }
    }

    await job.updateProgress(95);
    await prisma.reportJob.update({ where: { id: jobId }, data: { progress: 95, artifactId: artifact.id } });

    // 100% → DB marked completed
    await prisma.reportJob.update({
      where: { id: jobId },
      data: {
        status: JOB_STATUS.COMPLETED,
        progress: 100,
        completedAt: new Date()
      }
    });
    await job.updateProgress(100);

    return { status: 'success' };
  } catch (error: any) {
    console.error(`Error processing job ${jobId}:`, error);

    await prisma.reportJob.update({
      where: { id: jobId },
      data: {
        status: JOB_STATUS.FAILED,
        errorMessage: error.message || 'Worker failure',
        completedAt: new Date()
      }
    });

    throw error;
  }
}
