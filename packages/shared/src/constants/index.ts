export const REPORT_TYPES = {
  SALES_SUMMARY: 'SALES_SUMMARY',
  ORDER_ANALYTICS: 'ORDER_ANALYTICS',
} as const;

export const JOB_STATUS = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export const QUEUE_NAME = 'report-generation-queue';
