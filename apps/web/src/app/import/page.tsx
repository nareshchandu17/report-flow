"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, FileText, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<'upload' | 'mapping' | 'confirm'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [csvData, setCsvData] = useState<string>('');
  const [preview, setPreview] = useState<any>(null);

  const [datasetName, setDatasetName] = useState('');
  const [currency, setCurrency] = useState('USD');

  const [columnMapping, setColumnMapping] = useState({
    date: '',
    amount: '',
    status: '',
    customerName: ''
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvData(content);
    };
    reader.readAsText(file);
  };

  const handleUploadPreview = async () => {
    if (!csvData) {
      setError('Please select a CSV file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await api.uploadCSVPreview(csvData);
      setPreview(result);

      // Auto-map columns if possible
      const mapping = { ...columnMapping };
      result.columns.forEach((col: string) => {
        const lowerCol = col.toLowerCase();
        if (lowerCol.includes('date')) mapping.date = col;
        else if (lowerCol.includes('amount') || lowerCol.includes('price') || lowerCol.includes('total')) mapping.amount = col;
        else if (lowerCol.includes('status')) mapping.status = col;
        else if (lowerCol.includes('customer') || lowerCol.includes('name')) mapping.customerName = col;
      });
      setColumnMapping(mapping);

      setStep('mapping');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDataset = async () => {
    if (!datasetName || !csvData) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await api.createDataset(datasetName, currency, csvData, columnMapping);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-white">Import Data</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {step === 'upload' && (
          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">Upload CSV File</CardTitle>
              <CardDescription className="text-zinc-400">
                Upload a CSV file containing your order data. The file should include columns for date, amount, and status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-zinc-600 transition-colors">
                <Upload className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="max-w-xs mx-auto"
                />
                {csvData && (
                  <div className="mt-4 text-sm text-green-400 flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    File loaded successfully
                  </div>
                )}
              </div>

              <div className="bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-400">
                <p className="font-medium text-zinc-300 mb-2">Required columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>date</strong> - Order date (YYYY-MM-DD format)</li>
                  <li><strong>amount</strong> - Order amount (numeric)</li>
                  <li><strong>status</strong> - Order status (PENDING, PROCESSING, COMPLETED, CANCELLED, FAILED)</li>
                </ul>
                <p className="font-medium text-zinc-300 mt-4 mb-2">Optional columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>customerName</strong> - Customer name</li>
                </ul>
              </div>

              <Button
                onClick={handleUploadPreview}
                disabled={!csvData || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing CSV...</>
                ) : (
                  'Continue to Column Mapping'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'mapping' && preview && (
          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">Map Columns</CardTitle>
              <CardDescription className="text-zinc-400">
                Map your CSV columns to the required fields. Found {preview.rowCount} rows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Date Column *</Label>
                  <Select value={columnMapping.date} onValueChange={(val: string) => setColumnMapping({ ...columnMapping, date: val })}>
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {preview.columns.map((col: string) => (
                        <SelectItem key={col} value={col} className="text-white">{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Amount Column *</Label>
                  <Select value={columnMapping.amount} onValueChange={(val: string) => setColumnMapping({ ...columnMapping, amount: val })}>
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {preview.columns.map((col: string) => (
                        <SelectItem key={col} value={col} className="text-white">{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Status Column *</Label>
                  <Select value={columnMapping.status} onValueChange={(val: string) => setColumnMapping({ ...columnMapping, status: val })}>
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {preview.columns.map((col: string) => (
                        <SelectItem key={col} value={col} className="text-white">{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Customer Name Column</Label>
                  <Select value={columnMapping.customerName} onValueChange={(val: string) => setColumnMapping({ ...columnMapping, customerName: val })}>
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                      <SelectValue placeholder="Select column (optional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="">None</SelectItem>
                      {preview.columns.map((col: string) => (
                        <SelectItem key={col} value={col} className="text-white">{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-zinc-300 mb-3">Sample Data Preview</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-700">
                        {preview.columns.map((col: string) => (
                          <th key={col} className="text-left py-2 px-3 text-zinc-400 font-medium">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sampleRows.map((row: any, i: number) => (
                        <tr key={i} className="border-b border-zinc-800">
                          {preview.columns.map((col: string) => (
                            <td key={col} className="py-2 px-3 text-zinc-300">{row[col]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('upload')}
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep('confirm')}
                  disabled={!columnMapping.date || !columnMapping.amount || !columnMapping.status}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'confirm' && (
          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">Create Dataset</CardTitle>
              <CardDescription className="text-zinc-400">
                Name your dataset and select the currency for your data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-zinc-300">Dataset Name *</Label>
                <Input
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="e.g., Q4 2024 Sales"
                  className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Currency *</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="USD" className="text-white">USD ($)</SelectItem>
                    <SelectItem value="EUR" className="text-white">EUR (€)</SelectItem>
                    <SelectItem value="GBP" className="text-white">GBP (£)</SelectItem>
                    <SelectItem value="INR" className="text-white">INR (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
                <h3 className="text-sm font-medium text-zinc-300">Summary</h3>
                <div className="text-sm text-zinc-400 space-y-1">
                  <p>Rows to import: <span className="text-white">{preview?.rowCount}</span></p>
                  <p>Date column: <span className="text-white">{columnMapping.date}</span></p>
                  <p>Amount column: <span className="text-white">{columnMapping.amount}</span></p>
                  <p>Status column: <span className="text-white">{columnMapping.status}</span></p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('mapping')}
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateDataset}
                  disabled={!datasetName || isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Dataset...</>
                  ) : (
                    'Create Dataset'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
