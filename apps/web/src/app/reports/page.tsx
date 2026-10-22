"use client";

import { useEffect, useState } from "react";
import { api, ReportJob } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ReportsHistory() {
  const [reports, setReports] = useState<ReportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getReports();
      setReports(res.data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'FAILED': return 'destructive';
      case 'PROCESSING': return 'warning';
      case 'QUEUED': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <FileText className="h-3 w-3" />;
      case 'FAILED': return <AlertCircle className="h-3 w-3" />;
      case 'PROCESSING': return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'QUEUED': return <Loader2 className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Reports History</h1>
          <p className="text-muted-foreground">View all your previously generated reports.</p>
        </div>
        <Button variant="outline" onClick={fetchReports} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border border-white/5">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
                <p>Loading reports...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center flex flex-col items-center gap-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <p className="text-red-400">{error}</p>
                <Button onClick={fetchReports} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                  <RefreshCw className="mr-2 h-4 w-4" /> Retry
                </Button>
              </div>
            ) : reports.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <FileText className="h-12 w-12 text-white/20 mb-4" />
                <p>No reports found. Generate one from the dashboard.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {reports.map((report) => (
                  <Link href={`/reports/${report.id}`} key={report.id}>
                    <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-white">{report.reportType.replace('_', ' ')}</p>
                          <Badge variant={getStatusColor(report.status)} className="scale-90 origin-left flex items-center gap-1">
                            {getStatusIcon(report.status)}
                            {report.status}
                          </Badge>
                          {report.status === 'FAILED' && report.errorMessage && (
                            <span className="text-xs text-red-400 max-w-xs truncate" title={report.errorMessage}>
                              {report.errorMessage}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(report.createdAt).toLocaleString()}
                          {report.completedAt && ` ò Completed: ${new Date(report.completedAt).toLocaleString()}`}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-white/20 group-hover:text-white/60 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
