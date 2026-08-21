import { prisma } from './client';
import { ReportData } from 'shared';

export const generateSalesSummary = async (fromDate: Date, toDate: Date): Promise<ReportData> => {
  const result = await prisma.order.aggregate({
    where: {
      createdAt: { gte: fromDate, lte: toDate }
    },
    _sum: { amount: true },
    _count: { _all: true }
  });

  const completedResult = await prisma.order.aggregate({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
      status: 'COMPLETED'
    },
    _count: { _all: true }
  });

  const totalRevenue = result._sum.amount || 0;
  const totalOrders = result._count._all || 0;
  const completedOrders = completedResult._count._all || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Daily revenue aggregation
  const dailyData = await prisma.$queryRaw<any[]>`
    SELECT 
      DATE("createdAt" / 1000, 'unixepoch') as "Date", 
      COUNT(*) as "Orders", 
      SUM(amount) as "Revenue"
    FROM "Order"
    WHERE "createdAt" >= ${fromDate.getTime()} AND "createdAt" <= ${toDate.getTime()}
    GROUP BY DATE("createdAt" / 1000, 'unixepoch')
    ORDER BY "Date" ASC
  `;

  return {
    title: 'Sales Performance Report',
    dateRange: `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`,
    metrics: {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      completedOrders
    },
    tableData: dailyData.map(d => ({
      Date: typeof d.Date === 'string' ? d.Date : d.Date.toISOString().split('T')[0],
      Orders: Number(d.Orders),
      Revenue: Number(d.Revenue)
    }))
  };
};

export const generateOrderAnalytics = async (fromDate: Date, toDate: Date): Promise<ReportData> => {
  const result = await prisma.order.aggregate({
    where: {
      createdAt: { gte: fromDate, lte: toDate }
    },
    _sum: { amount: true },
    _count: { _all: true }
  });

  const completedResult = await prisma.order.aggregate({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
      status: 'COMPLETED'
    },
    _count: { _all: true }
  });

  const statusData = await prisma.$queryRaw<any[]>`
    SELECT 
      status, 
      COUNT(*) as "count", 
      SUM(amount) as "amount"
    FROM "Order"
    WHERE "createdAt" >= ${fromDate} AND "createdAt" <= ${toDate}
    GROUP BY status
    ORDER BY "count" DESC
  `;

  return {
    title: 'Order Analytics Report',
    dateRange: `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`,
    metrics: {
      totalRevenue: result._sum.amount || 0,
      totalOrders: result._count._all || 0,
      avgOrderValue: result._count._all ? (result._sum.amount || 0) / result._count._all : 0,
      completedOrders: completedResult._count._all || 0
    },
    tableData: statusData.map(d => ({
      status: d.status,
      count: Number(d.count),
      amount: Number(d.amount)
    }))
  };
};
