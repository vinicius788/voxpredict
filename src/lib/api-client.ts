const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const getAccessToken = () => localStorage.getItem('auth_token');

const buildUrl = (endpoint: string) => `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

export async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();

  const response = await fetch(buildUrl(endpoint), {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    credentials: 'include',
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error || payload?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export type MarketFilters = {
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'volume' | 'newest' | 'ending' | 'resolvedAt';
};

export type RegisterPositionInput = {
  marketId: number;
  side: 'YES' | 'NO';
  amount: string;
  token: string;
  txHash: string;
};

export type CategoryInput = {
  key?: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  active?: boolean;
  sortOrder?: number;
};

export const api = {
  getMarkets: (params?: MarketFilters) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).length > 0) {
          query.set(key, String(value));
        }
      });
    }
    const qs = query.toString();
    return request<any>(`/api/markets${qs ? `?${qs}` : ''}`);
  },

  getMarket: (id: number | string) => request<any>(`/api/markets/${id}`),
  getMarketHistory: (id: number | string, period: string) =>
    request<any>(`/api/markets/${id}/history?period=${encodeURIComponent(period)}`),
  createMarket: (input: Record<string, unknown>) =>
    request<any>('/api/markets', { method: 'POST', body: JSON.stringify(input) }),
  updateMarket: (id: number | string, input: Record<string, unknown>) =>
    request<any>(`/api/markets/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  resolveMarket: (id: number | string, outcome: 'YES' | 'NO') =>
    request<any>(`/api/markets/${id}/resolve`, { method: 'POST', body: JSON.stringify({ outcome }) }),

  getMyStats: () => request<any>('/api/users/me/stats'),
  getMyPositions: () => request<any>('/api/positions/my'),
  getNotifications: () => request<any>('/api/notifications'),
  markAllRead: () => request<any>('/api/notifications/read-all', { method: 'PUT' }),

  getAdminStats: () => request<any>('/api/admin/stats'),
  getFinancialOverview: () => request<any>('/api/finance/overview'),

  getCategories: () => request<any>('/api/categories'),
  createCategory: (data: CategoryInput) =>
    request<any>('/api/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Partial<CategoryInput>) =>
    request<any>(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  reorderCategories: (orderedIds: string[]) =>
    request<any>('/api/categories/reorder/list', {
      method: 'PUT',
      body: JSON.stringify({ orderedIds }),
    }),
  deleteCategory: (id: string) => request<any>(`/api/categories/${id}`, { method: 'DELETE' }),

  generateMarketFromAI: (newsText: string, endDate: string) =>
    request<any>('/api/ai/generate-market', {
      method: 'POST',
      body: JSON.stringify({ newsText, endDate }),
    }),
  toggleAIStatus: (active: boolean) =>
    request<any>('/api/ai/toggle', {
      method: 'POST',
      body: JSON.stringify({ active }),
    }),
  getAIStatus: () => request<any>('/api/ai/status'),

  registerPosition: (data: RegisterPositionInput) =>
    request<any>('/api/positions', { method: 'POST', body: JSON.stringify(data) }),
  markPositionClaimed: (marketId: number, txHash: string) =>
    request<any>(`/api/positions/${marketId}/claim`, {
      method: 'PUT',
      body: JSON.stringify({ txHash }),
    }),
};
