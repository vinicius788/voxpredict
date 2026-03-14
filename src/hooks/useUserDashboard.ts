import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`timeout:${timeoutMs}`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export type UserStats = {
  totalPositions: number;
  activePositions: number;
  closedPositions?: number;
  winRate: number;
  totalWinnings: number;
  totalBet?: number;
  totalWon?: number;
  realizedStake?: number;
  realizedReturns?: number;
  realizedPnl?: number;
  unrealizedStake?: number;
  unrealizedValue?: number;
  unrealizedPnl?: number;
  totalFeePaid?: number;
  portfolioValue: number;
  vaultBalance: number;
  totalDeposited?: number;
  totalWithdrawn?: number;
  ranking: number | null;
  totalVolume: number;
};

export type ApiPosition = {
  id: string;
  marketId: number;
  side: 'YES' | 'NO';
  amount: number;
  token: string;
  txHash: string;
  claimed: boolean;
  createdAt: string;
  currentOdds?: number;
  estimatedValue?: number;
  estimatedProfit?: number;
  market: {
    id: number;
    question: string;
    title?: string;
    category: string | { name: string; emoji?: string };
    endTime: string;
    closeTime?: string;
    status: string;
    outcome?: string | null;
    yesPool?: number;
    noPool?: number;
    totalYes?: number;
    totalNo?: number;
  };
};

export type UserActivity = {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'BET' | 'CLAIM' | 'REFUND';
  amount: number;
  token: string;
  createdAt: string;
  side?: 'YES' | 'NO' | null;
  label?: string;
  market?: {
    id: number;
    title: string;
  } | null;
};

export type PortfolioHistoryPoint = {
  date: string;
  label: string;
  value: number;
};

export type UserMarketProposal = {
  id: number;
  title: string;
  description: string;
  category: string;
  resolveBy: string;
  tags: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function useUserStats(enabled = true) {
  return useQuery({
    queryKey: ['user-stats'],
    enabled,
    queryFn: async () => {
      const response = await api.getMyStats();
      return (response.data || response) as UserStats;
    },
  });
}

export function useMyPositions(enabled = true) {
  return useQuery({
    queryKey: ['my-positions'],
    enabled,
    queryFn: async () => {
      const response = await api.getMyPositions();
      return (response.data || response) as ApiPosition[];
    },
  });
}

export function useRecentActivity(enabled = true, limit = 20) {
  return useQuery({
    queryKey: ['user-activity', limit],
    enabled,
    retry: false,
    queryFn: async () => {
      try {
        const response = await withTimeout(api.getMyActivity(limit), 5000);
        const rows = (response.data || response.transactions || response) as UserActivity[];
        return Array.isArray(rows) ? rows : [];
      } catch {
        return [];
      }
    },
  });
}

export function usePortfolioHistory(period: '7d' | '30d' | '90d' | 'all', enabled = true) {
  return useQuery({
    queryKey: ['portfolio-history', period],
    enabled,
    queryFn: async () => {
      const response = await api.getMyPortfolioHistory(period);
      return (response.data || response.history || response) as PortfolioHistoryPoint[];
    },
  });
}

export function useMyProposals(enabled = true) {
  return useQuery({
    queryKey: ['my-proposals'],
    enabled,
    queryFn: async () => {
      const response = await api.getMyProposals();
      return (response.data || response) as UserMarketProposal[];
    },
    staleTime: 20_000,
  });
}
