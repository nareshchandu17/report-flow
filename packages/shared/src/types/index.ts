export interface ReportData {
  title: string;
  dateRange: string;
  metrics: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    completedOrders: number;
  };
  tableData: any[];
}
