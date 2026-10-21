export interface ReportData {
  title: string;
  dateRange: string;
  datasetName: string;
  currency: string;
  metrics: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    completedOrders: number;
  };
  tableData: any[];
}
