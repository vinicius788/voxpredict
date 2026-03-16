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
  includeAll?: boolean;
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

export type ProposalInput = {
  title: string;
  description: string;
  category: string;
  resolveBy: string;
  tags?: string[];
};

export type TemplateInput = {
  name: string;
  titleTemplate: string;
  descTemplate: string;
  category: string;
  frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  variables?: Record<string, string>;
  minBet?: number;
  maxBet?: number;
  active?: boolean;
};

export type VaultMutationInput = {
  txHash: string;
  amount: number | string;
  token: string;
};

export type TransakDepositInput = {
  orderId: string;
  amount: number;
  currency?: string;
  fiatAmount?: number;
};

export type LeaderboardFilters = {
  period?: '7d' | '30d' | 'all';
  category?: string;
  limit?: number;
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
  getMyActivity: (limit = 20) => request<any>(`/api/users/me/activity?limit=${Math.max(1, Math.floor(limit))}`),
  getMyPortfolioHistory: (period: '7d' | '30d' | '90d' | 'all' = '30d') =>
    request<any>(`/api/users/me/portfolio-history?period=${encodeURIComponent(period)}`),
  getMyPositions: () => request<any>('/api/positions/my'),
  getNotifications: () => request<any>('/api/notifications'),
  markAllRead: () => request<any>('/api/notifications/read-all', { method: 'PUT' }),
  registerVaultDeposit: (data: VaultMutationInput) =>
    request<any>('/api/vault/deposit', { method: 'POST', body: JSON.stringify(data) }),
  registerVaultWithdrawal: (data: VaultMutationInput) =>
    request<any>('/api/vault/withdraw', { method: 'POST', body: JSON.stringify(data) }),
  registerTransakDeposit: (data: TransakDepositInput) =>
    request<any>('/api/vault/transak-deposit', { method: 'POST', body: JSON.stringify(data) }),

  getAdminStats: () => request<any>('/api/admin/stats'),
  getFinancialOverview: () => request<any>('/api/finance/overview'),
  getLeaderboard: (params?: LeaderboardFilters) => {
    const query = new URLSearchParams();
    if (params?.period) query.set('period', params.period);
    if (params?.category) query.set('category', params.category);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<any>(`/api/leaderboard${qs ? `?${qs}` : ''}`);
  },
  getMyLeaderboard: () => request<any>('/api/leaderboard/me'),

  getCategories: (params?: { includeInactive?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.includeInactive) {
      query.set('includeInactive', 'true');
    }
    const qs = query.toString();
    return request<any>(`/api/categories${qs ? `?${qs}` : ''}`);
  },
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

  generateMarketFromAI: (newsText?: string, endDate?: string) =>
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

  createProposal: (data: ProposalInput) =>
    request<any>('/api/proposals', { method: 'POST', body: JSON.stringify(data) }),
  getMyProposals: () => request<any>('/api/proposals/my'),
  getProposals: (status?: 'PENDING' | 'APPROVED' | 'REJECTED') =>
    request<any>(`/api/proposals${status ? `?status=${status}` : ''}`),
  approveProposal: (
    id: number,
    data?: Partial<ProposalInput & { minBet: number; maxBet: number; adminNote: string }>,
  ) => request<any>(`/api/proposals/${id}/approve`, { method: 'PUT', body: JSON.stringify(data || {}) }),
  rejectProposal: (id: number, adminNote: string) =>
    request<any>(`/api/proposals/${id}/reject`, { method: 'PUT', body: JSON.stringify({ adminNote }) }),

  getTemplates: () => request<any>('/api/templates'),
  createTemplate: (data: TemplateInput) =>
    request<any>('/api/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: (id: number, data: Partial<TemplateInput>) =>
    request<any>(`/api/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  runTemplate: (id: number) => request<any>(`/api/templates/${id}/run`, { method: 'POST' }),
  runDueTemplates: () => request<any>('/api/templates/run-due', { method: 'POST' }),
};
