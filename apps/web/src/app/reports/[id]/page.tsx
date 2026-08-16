"use client";

import { useEffect, useState, use } from "react";
import { api, ReportJob } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDown, RefreshCw, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

export default function ReportDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const [report, setReport] = useState<ReportJob | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      const data = await api.getReport(id);
      setReport(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    
    // Poll every 1 second while not completed or failed
    const interval = setInterval(() => {
      if (report && (report.status === 'COMPLETED' || report.status === 'FAILED')) {
        clearInterval(interval);
      } else {
        fetchReport();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [id, report?.status]);

  const handleRetry = async () => {
    try {
      setLoading(true);
      await api.retryReport(id);
      await fetchReport();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  if (loading && !report) {
    return <div className="flex h-64 items-center justify-center"><RefreshCw className="animate-spin text-white/50" /></div>;
  }

  if (!report) {
    return <div className="text-red-400">Report not found</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-white">Report Details</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{report.reportType.replace('_', ' ')}</CardTitle>
            <Badge variant={
              report.status === 'COMPLETED' ? 'success' :
              report.status === 'FAILED' ? 'destructive' :
              report.status === 'PROCESSING' ? 'warning' : 'default'
            }>
              {report.status}
            </Badge>
          </div>
          <CardDescription>Job ID: {report.id}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-white">{report.progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div 
                className="h-full bg-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${report.progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium text-white">{new Date(report.createdAt).toLocaleString()}</p>
            </div>
            {report.startedAt && (
              <div>
                <p className="text-muted-foreground">Started processing</p>
                <p className="font-medium text-white">{new Date(report.startedAt).toLocaleString()}</p>
              </div>
            )}
            {report.completedAt && (
              <div>
                <p className="text-muted-foreground">Finished</p>
                <p className="font-medium text-white">{new Date(report.completedAt).toLocaleString()}</p>
              </div>
            )}
          </div>

          {report.status === 'FAILED' && report.errorMessage && (
            <div className="rounded-lg bg-destructive/20 border border-destructive/30 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-destructive">Job Failed</h4>
                <p className="text-sm text-destructive/80 mt-1">{report.errorMessage}</p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between bg-white/[0.02] border-t border-white/5 py-4">
          {report.status === 'FAILED' ? (
            <Button variant="outline" onClick={handleRetry} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry Job
            </Button>
          ) : (
            <Button 
              variant="glass" 
              asChild 
              disabled={!report.downloadAvailable}
              className={!report.downloadAvailable ? 'opacity-50 pointer-events-none' : ''}
            >
              <a href={`${API_BASE_URL}/reports/${report.id}/download`} download>
                <FileDown className="mr-2 h-4 w-4" /> Download PDF Artifact
              </a>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
