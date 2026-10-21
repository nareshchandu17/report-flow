export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Dataset {
  id: string;
  userId: string;
  name: string;
  currency: string;
  rowCount: number;
  createdAt: string;
  updatedAt: string;
}

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
  dataset?: Dataset;
}

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const api = {
  register: async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || 'Registration failed');
    }
    return res.json();
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || 'Login failed');
    }
    return res.json();
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  },

  getDatasets: async (): Promise<Dataset[]> => {
    const res = await fetch(`${API_BASE_URL}/datasets`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch datasets');
    return res.json();
  },

  uploadCSVPreview: async (csvData: string) => {
    const res = await fetch(`${API_BASE_URL}/datasets/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ csvData })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || 'CSV upload failed');
    }
    return res.json();
  },

  createDataset: async (name: string, currency: string, csvData: string, columnMapping: any) => {
    const res = await fetch(`${API_BASE_URL}/datasets/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ name, currency, csvData, columnMapping })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || 'Dataset creation failed');
    }
    return res.json();
  },

  createReport: async (data: { reportType: string; fromDate: string; toDate: string; datasetId: string }, idempotencyKey?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
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

    const res = await fetch(`${API_BASE_URL}/reports?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
  },

  getReport: async (id: string): Promise<ReportJob> => {
    const res = await fetch(`${API_BASE_URL}/reports/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch report status');
    return res.json();
  },

  retryReport: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/reports/${id}/retry`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to retry report');
    return res.json();
  },

  getReportPreview: async (type: string, fromDate: string, toDate: string, datasetId: string) => {
    const params = new URLSearchParams({ type, fromDate, toDate, datasetId });
    const res = await fetch(`${API_BASE_URL}/reports/preview?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch report preview');
    return res.json();
  }
};
