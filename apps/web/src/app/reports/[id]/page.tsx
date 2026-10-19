"use client";

import { useEffect, useState, use } from "react";
import { api, ReportJob } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDown, RefreshCw, AlertCircle, ArrowLeft, Loader2, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

export default function ReportDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const [report, setReport] = useState<ReportJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const fetchReport = async () => {
    try {
      const data = await api.getReport(id);
      setReport(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch report details');
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
      setRetrying(true);
      await api.retryReport(id);
      await fetchReport();
    } catch (err: any) {
      console.error('Retry failed:', err);
      setError(err.message || 'Failed to retry job');
    } finally {
      setRetrying(false);
    }
  };

  if (loading && !report) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-blue-500 h-8 w-8 mx-auto" />
          <p className="text-muted-foreground">Loading report details...</p>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="text-red-500 h-12 w-12 mx-auto" />
          <p className="text-red-400">{error}</p>
          <Button onClick={fetchReport} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="text-muted-foreground h-12 w-12 mx-auto" />
          <p className="text-muted-foreground">Report not found</p>
          <Button variant="outline" asChild>
            <Link href="/reports">Back to Reports</Link>
          </Button>
        </div>
      </div>
    );
  }

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
      case 'COMPLETED': return <CheckCircle2 className="h-3 w-3" />;
      case 'FAILED': return <AlertCircle className="h-3 w-3" />;
      case 'PROCESSING': return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'QUEUED': return <Clock className="h-3 w-3" />;
      default: return null;
    }
  };

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
            <Badge variant={getStatusColor(report.status)} className="flex items-center gap-1">
              {getStatusIcon(report.status)}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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

          {report.status === 'PROCESSING' && (
            <div className="rounded-lg bg-blue-500/20 border border-blue-500/30 p-4 flex items-start gap-3">
              <Loader2 className="h-5 w-5 text-blue-500 mt-0.5 animate-spin" />
              <div>
                <h4 className="text-sm font-semibold text-blue-400">Processing in Progress</h4>
                <p className="text-sm text-blue-400/80 mt-1">Your report is being generated. This may take a few moments.</p>
              </div>
            </div>
          )}

          {report.status === 'QUEUED' && (
            <div className="rounded-lg bg-yellow-500/20 border border-yellow-500/30 p-4 flex items-start gap-3">
              <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-yellow-400">Queued for Processing</h4>
                <p className="text-sm text-yellow-400/80 mt-1">Your report is in the queue and will be processed shortly.</p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between bg-white/[0.02] border-t border-white/5 py-4">
          {report.status === 'FAILED' ? (
            <Button variant="outline" onClick={handleRetry} disabled={retrying}>
              <RefreshCw className={`mr-2 h-4 w-4 ${retrying ? 'animate-spin' : ''}`} /> 
              {retrying ? 'Retrying...' : 'Retry Job'}
            </Button>
          ) : report.status === 'COMPLETED' ? (
            <Button 
              variant="default" 
              asChild 
              className="bg-blue-600 hover:bg-blue-700"
            >
              <a href={`${API_BASE_URL}/reports/${report.id}/download`} download>
                <FileDown className="mr-2 h-4 w-4" /> Download PDF
              </a>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              {report.status === 'PROCESSING' ? 'Processing...' : 'Queued...'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
