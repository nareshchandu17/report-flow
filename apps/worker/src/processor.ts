import { Job } from 'bullmq';
import { prisma } from 'database';
import { JOB_STATUS, REPORT_TYPES } from 'shared';
import { generateSalesSummary, generateOrderAnalytics } from './aggregations';
import { generatePDF } from './pdf/generator';
import { LocalArtifactStorage } from './storage/LocalArtifactStorage';

const storage = new LocalArtifactStorage();

export default async function (job: Job) {
  const { jobId } = job.data;
  
  try {
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
      reportData = await generateSalesSummary(reportJob.fromDate, reportJob.toDate);
    } else if (reportJob.reportType === REPORT_TYPES.ORDER_ANALYTICS) {
      reportData = await generateOrderAnalytics(reportJob.fromDate, reportJob.toDate);
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
    const { path: storagePath, size } = await storage.store(jobId, fileName, pdfBuffer);
    
    const artifact = await prisma.reportArtifact.create({
      data: {
        jobId,
        fileName,
        storagePath,
        mimeType: 'application/pdf',
        fileSize: size
      }
    });

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
