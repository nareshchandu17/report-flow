export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

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
  if (token && !document.cookie.includes('auth_token=')) {
    document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
  }
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
      document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Lax';
    }
  },

  getDatasets: async (): Promise<Dataset[]> => {
    const res = await fetch(`${API_BASE_URL}/datasets`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const errorText = await res.text();
      if (res.status !== 401) {
        console.error('Failed to fetch datasets:', res.status, errorText);
      }
      throw new ApiError(res.status === 401 ? 'Unauthorized' : 'Failed to fetch datasets', res.status);
    }
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

  getReports: async (paramsObj: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    search?: string;
    sort?: string;
    fromDate?: string;
    toDate?: string;
  } | number = 1, limitArg = 10, typeArg?: string, statusArg?: string) => {
    let params: URLSearchParams;
    if (typeof paramsObj === 'object') {
      params = new URLSearchParams();
      if (paramsObj.page) params.append('page', paramsObj.page.toString());
      if (paramsObj.limit) params.append('limit', paramsObj.limit.toString());
      if (paramsObj.type && paramsObj.type !== 'ALL') params.append('type', paramsObj.type);
      if (paramsObj.status && paramsObj.status !== 'ALL') params.append('status', paramsObj.status);
      if (paramsObj.search) params.append('search', paramsObj.search);
      if (paramsObj.sort) params.append('sort', paramsObj.sort);
      if (paramsObj.fromDate) params.append('fromDate', paramsObj.fromDate);
      if (paramsObj.toDate) params.append('toDate', paramsObj.toDate);
    } else {
      params = new URLSearchParams({ page: paramsObj.toString(), limit: limitArg.toString() });
      if (typeArg && typeArg !== 'ALL') params.append('type', typeArg);
      if (statusArg && statusArg !== 'ALL') params.append('status', statusArg);
    }

    const res = await fetch(`${API_BASE_URL}/reports?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const errorText = await res.text();
      if (res.status !== 401) {
        console.error('Failed to fetch reports:', res.status, errorText);
      }
      throw new ApiError(res.status === 401 ? 'Unauthorized' : 'Failed to fetch reports', res.status);
    }
    return res.json();
  },

  deleteReport: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/reports/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to delete report');
    }
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
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to fetch report preview');
    }
    return res.json();
  },

  getDownloadUrl: (id: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return `${API_BASE_URL}/reports/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  downloadReport: async (id: string, fileName?: string) => {
    const res = await fetch(`${API_BASE_URL}/reports/${id}/download`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to download report');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `report-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};
