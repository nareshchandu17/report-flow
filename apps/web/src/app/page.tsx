"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChart, FileOutput, Loader2, Calendar, DollarSign, ShoppingCart, CheckCircle, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar } from 'recharts';

export default function Dashboard() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState('SALES_SUMMARY');
  
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

  useEffect(() => {
    async function fetchPreview() {
      setIsLoadingPreview(true);
      try {
        const data = await api.getReportPreview(reportType, new Date(fromDate).toISOString(), new Date(toDate).toISOString());
        setPreviewData(data);
      } catch (err) {
        console.error("Failed to fetch preview", err);
      } finally {
        setIsLoadingPreview(false);
      }
    }
    fetchPreview();
  }, [reportType, fromDate, toDate]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await api.createReport({
        reportType,
        fromDate: new Date(fromDate).toISOString(),
        toDate: new Date(toDate).toISOString()
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

  const formatCurrency = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Live Analytics</h1>
          <p className="text-muted-foreground">Interactive preview of your data before generating static reports.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 bg-white/5 p-2 rounded-xl border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2 px-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input 
              type="date" 
              value={fromDate} 
              onChange={e => setFromDate(e.target.value)}
              className="bg-transparent border-none text-sm text-white focus:ring-0 outline-none"
            />
            <span className="text-muted-foreground">-</span>
            <input 
              type="date" 
              value={toDate} 
              onChange={e => setToDate(e.target.value)}
              className="bg-transparent border-none text-sm text-white focus:ring-0 outline-none"
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
      </div>

      {isLoadingPreview || !previewData ? (
        <div className="h-[400px] flex items-center justify-center border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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
                <div className="text-2xl font-bold text-white">{formatCurrency(previewData.metrics.totalRevenue)}</div>
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
                <div className="text-2xl font-bold text-white">{formatCurrency(previewData.metrics.avgOrderValue)}</div>
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
                      <YAxis stroke="#888" tick={{fill: '#888'}} tickFormatter={(value) => `$${value}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
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
