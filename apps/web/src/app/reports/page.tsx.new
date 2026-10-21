"use client";

import { useEffect, useState } from "react";
import { api, ReportJob } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function ReportsHistory() {
  const [reports, setReports] = useState<ReportJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.getReports();
      setReports(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

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
            {reports.length === 0 && !loading ? (
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
                          <Badge variant={
                            report.status === 'COMPLETED' ? 'success' :
                            report.status === 'FAILED' ? 'destructive' :
                            report.status === 'PROCESSING' ? 'warning' : 'default'
                          } className="scale-90 origin-left">
                            {report.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(report.createdAt).toLocaleString()}
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
