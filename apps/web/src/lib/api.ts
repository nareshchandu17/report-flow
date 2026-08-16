export const API_BASE_URL = 'http://localhost:4000/api';

export interface ReportJob {
  id: string;
  reportType: string;
  status: string;
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  downloadAvailable: boolean;
}

export const api = {
  createReport: async (data: { reportType: string; fromDate: string; toDate: string }, idempotencyKey?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    
    const res = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    
    if (!res.ok) throw new Error('Failed to create report');
    return res.json();
  },

  getReports: async (page = 1, limit = 10, type?: string, status?: string) => {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (type) params.append('type', type);
    if (status) params.append('status', status);

    const res = await fetch(`${API_BASE_URL}/reports?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
  },

  getReport: async (id: string): Promise<ReportJob> => {
    const res = await fetch(`${API_BASE_URL}/reports/${id}`);
    if (!res.ok) throw new Error('Failed to fetch report status');
    return res.json();
  },

  retryReport: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/reports/${id}/retry`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to retry report');
    return res.json();
  }
};
