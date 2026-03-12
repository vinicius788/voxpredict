import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export type UserStats = {
  totalPositions: number;
  activePositions: number;
  winRate: number;
  totalWinnings: number;
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
  market: {
    id: number;
    question: string;
    category: string;
    endTime: string;
    status: string;
    outcome?: string | null;
  };
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
