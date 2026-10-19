import { z } from 'zod';

export const CreateReportSchema = z.object({
  reportType: z.enum(['SALES_SUMMARY', 'ORDER_ANALYTICS'], {
    errorMap: () => ({ message: 'Invalid report type. Must be SALES_SUMMARY or ORDER_ANALYTICS' })
  }),
  fromDate: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, { message: 'Invalid fromDate. Must be a valid date string' }),
  toDate: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, { message: 'Invalid toDate. Must be a valid date string' }),
}).refine((data) => {
  const from = new Date(data.fromDate);
  const to = new Date(data.toDate);
  return from <= to;
}, {
  message: 'fromDate must be before or equal to toDate',
  path: ['toDate']
});

export type CreateReportDTO = z.infer<typeof CreateReportSchema>;

export const PaginationSchema = z.object({
  page: z.string().optional().default('1').transform((val) => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  }),
  limit: z.string().optional().default('10').transform((val) => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 || num > 100 ? 10 : num;
  }),
});

export type PaginationDTO = z.infer<typeof PaginationSchema>;
