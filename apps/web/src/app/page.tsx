"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChart, FileOutput, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState('SALES_SUMMARY');
  const [dateRange, setDateRange] = useState('month'); // default last 30 days

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const toDate = new Date();
      const fromDate = new Date();
      
      if (dateRange === 'week') {
        fromDate.setDate(toDate.getDate() - 7);
      } else if (dateRange === 'month') {
        fromDate.setDate(toDate.getDate() - 30);
      } else if (dateRange === 'year') {
        fromDate.setFullYear(toDate.getFullYear() - 1);
      }

      const res = await api.createReport({
        reportType,
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString()
      }, `req-${Date.now()}`);

      if (res.jobId) {
        router.push(`/reports/${res.jobId}`);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome to ReportFlow</h1>
        <p className="text-muted-foreground">Generate production-grade background reports asynchronously.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-blue-500" />
              Sales Summary Report
            </CardTitle>
            <CardDescription>
              Comprehensive overview of sales performance, revenue metrics, and order completion rates over time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="glass" onClick={() => { setReportType('SALES_SUMMARY'); handleGenerate(); }} disabled={isGenerating} className="w-full">
              {isGenerating && reportType === 'SALES_SUMMARY' ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Queuing Job...</>
              ) : (
                <><FileOutput className="mr-2 h-4 w-4" /> Generate Sales Report</>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              Order Analytics Report
            </CardTitle>
            <CardDescription>
              Detailed breakdown of order statuses, fulfillment metrics, and average order values.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="glass" onClick={() => { setReportType('ORDER_ANALYTICS'); handleGenerate(); }} disabled={isGenerating} className="w-full">
              {isGenerating && reportType === 'ORDER_ANALYTICS' ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Queuing Job...</>
              ) : (
                <><FileOutput className="mr-2 h-4 w-4" /> Generate Analytics Report</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
