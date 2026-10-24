"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChart, FileOutput, Loader2, Calendar, DollarSign, ShoppingCart, CheckCircle, TrendingUp, AlertCircle, RefreshCw, Database, LogOut, Upload } from "lucide-react";
import { api, ApiError, Dataset } from "@/lib/api";
import { useRouter } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar } from 'recharts';

export default function Dashboard() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState('SALES_SUMMARY');

  // Dataset state
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true);

  // Date states (default to last 30 days)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Preview Data State
  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoadingDatasets(false);
      router.push('/login');
      return;
    }

    let cancelled = false;
    async function fetchDatasets() {
      try {
        const data = await api.getDatasets();
        if (cancelled) return;
        setDatasets(data);
        setSelectedDataset((current) => current ?? data[0]?.id ?? null);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 401) {
          api.logout();
          router.push('/login');
        } else {
          console.error("Failed to fetch datasets", err);
        }
      } finally {
        if (!cancelled) setIsLoadingDatasets(false);
      }
    }

    fetchDatasets();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    async function fetchPreview() {
      if (!selectedDataset) {
        setIsLoadingPreview(false);
        return;
      }
      setIsLoadingPreview(true);
      setPreviewError(null);
      try {
        const data = await api.getReportPreview(reportType, new Date(fromDate).toISOString(), new Date(toDate).toISOString(), selectedDataset);
        setPreviewData(data);
        setPreviewError(null);
      } catch (err: any) {
        console.error("Failed to fetch preview", err);
        setPreviewError(err.message || 'Failed to load preview data');
        setPreviewData(null);
      } finally {
        setIsLoadingPreview(false);
      }
    }
    fetchPreview();
  }, [reportType, fromDate, toDate, selectedDataset]);

  const handleGenerate = async () => {
    if (!selectedDataset) {
      alert('Please select a dataset');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await api.createReport({
        reportType,
        fromDate: new Date(fromDate).toISOString(),
        toDate: new Date(toDate).toISOString(),
        datasetId: selectedDataset
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

  const formatCurrency = (val: number, currency = 'USD') => {
    const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
    const symbol = symbols[currency] || currency;
    return `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Live Analytics</h1>
          <p className="text-muted-foreground">Interactive preview of your data before generating static reports.</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            api.logout();
            router.push('/login');
          }}
          className="group relative isolate shrink-0 overflow-hidden border-rose-400/25 bg-rose-500/[0.06] text-rose-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 hover:border-rose-300/50 hover:bg-rose-500/10 hover:text-rose-100 focus-visible:ring-rose-400/60 motion-reduce:transition-none"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-rose-200/10 to-transparent transition-transform duration-700 group-hover:translate-x-full motion-reduce:transition-none"
          />
          <LogOut className="relative mr-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none" />
          <span className="relative">Logout</span>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex max-w-full flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-md">
          <div className="flex items-center gap-2 px-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            {isLoadingDatasets ? (
              <div
                className="h-4 w-28 animate-pulse rounded bg-white/10"
                role="status"
                aria-label="Loading datasets"
              />
            ) : datasets.length === 0 ? (
              <span className="text-sm text-muted-foreground">No datasets</span>
            ) : (
              <select
                value={selectedDataset || ''}
                onChange={e => setSelectedDataset(e.target.value)}
                className="max-w-full bg-transparent border-none text-sm text-white focus:ring-0 outline-none cursor-pointer"
              >
                {datasets.map(ds => (
                  <option key={ds.id} value={ds.id} className="bg-zinc-900">
                    {ds.name} ({ds.currency})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
          <div className="flex items-center gap-2 px-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-[8.5rem] max-w-full bg-transparent border-none text-sm text-white focus:ring-0 outline-none"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-[8.5rem] max-w-full bg-transparent border-none text-sm text-white focus:ring-0 outline-none"
            />
          </div>
          <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
          <div className="flex gap-1">
            <Button
              variant={reportType === 'SALES_SUMMARY' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setReportType('SALES_SUMMARY')}
              className={reportType === 'SALES_SUMMARY' ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-zinc-400"}
            >
              Sales
            </Button>
            <Button
              variant={reportType === 'ORDER_ANALYTICS' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setReportType('ORDER_ANALYTICS')}
              className={reportType === 'ORDER_ANALYTICS' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-zinc-400"}
            >
              Orders
            </Button>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/import')}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          <Upload className="mr-2 h-4 w-4" /> Import Data
        </Button>
      </div>

      {isLoadingPreview ? (
        <div
          className="h-[400px] rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
          role="status"
          aria-label="Loading report preview"
        >
          <div className="flex h-full animate-pulse flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="h-5 w-44 rounded bg-white/10" />
                <div className="h-3 w-60 max-w-full rounded bg-white/[0.06]" />
              </div>
              <div className="h-9 w-36 rounded-md bg-white/10" />
            </div>
            <div className="flex min-h-0 flex-1 items-end gap-3 rounded-lg border border-white/5 bg-black/20 px-6 pb-6 pt-10">
              {[35, 55, 42, 75, 60, 90, 68, 48, 78, 58, 84, 66].map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t bg-blue-500/15"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : previewError ? (
        <div className="h-[400px] flex flex-col items-center justify-center border border-red-500/20 rounded-2xl bg-red-500/5 backdrop-blur-sm gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-red-400 text-center max-w-md">{previewError}</p>
          <Button 
            onClick={() => {
              setPreviewError(null);
              setIsLoadingPreview(true);
            }}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      ) : !previewData ? (
        <div className="h-[400px] flex items-center justify-center border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm">
          <p className="text-muted-foreground">No data available for selected date range</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-zinc-400">Total Revenue</CardTitle>
                <DollarSign className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{formatCurrency(previewData.metrics.totalRevenue, previewData.currency)}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-zinc-400">Total Orders</CardTitle>
                <ShoppingCart className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{previewData.metrics.totalOrders.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-zinc-400">Completed Orders</CardTitle>
                <CheckCircle className="w-4 h-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{previewData.metrics.completedOrders.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-zinc-400">Avg Order Value</CardTitle>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{formatCurrency(previewData.metrics.avgOrderValue, previewData.currency)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Chart */}
          <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl text-white">{previewData.title}</CardTitle>
                <CardDescription>Live data visualization for the selected period</CardDescription>
              </div>
              <Button onClick={handleGenerate} disabled={isGenerating} className="bg-white text-black hover:bg-zinc-200">
                {isGenerating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating PDF...</>
                ) : (
                  <><FileOutput className="mr-2 h-4 w-4" /> Download PDF Report</>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  {reportType === 'SALES_SUMMARY' ? (
                    <AreaChart data={previewData.tableData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="Date" stroke="#888" tick={{fill: '#888'}} tickMargin={10} />
                      <YAxis stroke="#888" tick={{fill: '#888'}} tickFormatter={(value) => value !== undefined ? formatCurrency(Number(value), previewData.currency) : ''} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: any) => value !== undefined ? formatCurrency(Number(value), previewData.currency) : ''}
                      />
                      <Area type="monotone" dataKey="Revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  ) : (
                    <RechartsBarChart data={previewData.tableData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="status" stroke="#888" tick={{fill: '#888'}} tickMargin={10} />
                      <YAxis stroke="#888" tick={{fill: '#888'}} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
