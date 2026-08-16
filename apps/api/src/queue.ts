import { Queue } from 'bullmq';
import { QUEUE_NAME } from 'shared';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6390';

export const reportQueue = new Queue(QUEUE_NAME, {
  connection: {
    url: REDIS_URL
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
});
