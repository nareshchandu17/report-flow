import { z } from 'zod';

export const CreateReportSchema = z.object({
  reportType: z.enum(['SALES_SUMMARY', 'ORDER_ANALYTICS']),
  fromDate: z.string().datetime().or(z.string()),
  toDate: z.string().datetime().or(z.string()),
});

export type CreateReportDTO = z.infer<typeof CreateReportSchema>;
