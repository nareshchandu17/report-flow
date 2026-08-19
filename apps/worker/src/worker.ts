import { Worker, Queue } from 'bullmq';
import { QUEUE_NAME } from 'shared';
import processor from './processor';
import path from 'path';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6390';

console.log('Starting ReportWorker...');

const queue = new Queue(QUEUE_NAME, { connection: { url: REDIS_URL } });

// Register the nightly cron job
queue.add('schedule-daily-sales-report', {}, {
  repeat: {
    pattern: '0 0 * * *' // Midnight every day
  },
  jobId: 'daily-sales-report' // Prevents duplicate registrations
});

const worker = new Worker(QUEUE_NAME, processor, {
  connection: {
    url: REDIS_URL
  },
  concurrency: 5
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down worker gracefully...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down worker gracefully...');
  await worker.close();
  process.exit(0);
});
