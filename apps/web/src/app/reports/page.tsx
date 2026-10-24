"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, ReportJob } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ReportsHistory() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    if (!localStorage.getItem('auth_token')) {
      router.push('/login');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.getReports();
      setReports(res.data);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        api.logout();
        router.push('/login');
      } else {
        console.error(err);
      }
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
              <div className="divide-y divide-white/5" role="status" aria-label="Loading reports">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="flex items-center justify-between p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                        <div className="h-5 w-20 animate-pulse rounded-full bg-white/10" />
                      </div>
                      <div className="h-3 w-44 animate-pulse rounded bg-white/[0.06]" />
                    </div>
                    <div className="h-5 w-5 animate-pulse rounded bg-white/[0.06]" />
                  </div>
                ))}
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
