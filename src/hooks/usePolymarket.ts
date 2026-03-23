import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export type PolymarketReference = {
  title: string;
  url: string;
  eventId: string | null;
  slug: string | null;
  conditionId: string | null;
  yesTokenId: string | null;
  noTokenId: string | null;
  volumeTotal: number;
  volumeLive: number;
  marketLiveVolume: number;
  yesProbability: number;
  noProbability: number;
  yesOdds: number;
  noOdds: number;
  history: Array<{ t: number; p: number }>;
  comments: Array<{ id: string; content: string; createdAt: string; userName: string | null; userAddress: string | null }>;
};

type PolymarketReferenceEnvelope = {
  reference?: PolymarketReference | null;
  data?: { reference?: PolymarketReference | null };
};

export function usePolymarketReference(marketId?: number | string) {
  const normalizedMarketId = Number(marketId);

  return useQuery({
    queryKey: ['polymarket-reference', normalizedMarketId],
    enabled: Number.isFinite(normalizedMarketId) && normalizedMarketId > 0,
    queryFn: async () => {
      const response = (await api.getPolymarketReference(normalizedMarketId)) as PolymarketReferenceEnvelope;
      return response.reference ?? response.data?.reference ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePolymarketTrending(limit = 6) {
  return useQuery({
    queryKey: ['polymarket-trending', limit],
    queryFn: async () => {
      const response = await api.getPolymarketTrending(limit);
      return (response.events || response.data || []) as Array<{
        id: string;
        title: string;
        slug: string;
        volumeTotal: number;
        volume24h: number;
        url: string;
        market: {
          yesProbability: number;
          noProbability: number;
        } | null;
      }>;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePolymarketLeaderboard(limit = 10) {
  return useQuery({
    queryKey: ['polymarket-global-leaderboard', limit],
    queryFn: async () => {
      const response = await api.getPolymarketLeaderboard(limit);
      return (response.traders || response.data || []) as Array<{
        rank: number;
        proxyWalletAddress: string;
        userName: string | null;
        pnl: number;
        volume: number;
        percentPositive: number;
        verifiedBadge: boolean;
      }>;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePolymarketMarketSuggestions(query: string, limit = 3) {
  const cleaned = query.trim();

  return useQuery({
    queryKey: ['polymarket-market-suggestions', cleaned, limit],
    enabled: cleaned.length >= 10,
    queryFn: async () => {
      const response = await api.searchPolymarketMarkets(cleaned, limit);
      return (response.markets || response.data || []) as Array<{
        id: string;
        question: string;
        eventTitle: string | null;
        eventSlug: string | null;
        volumeTotal: number;
        volume24h: number;
        yesProbability: number;
        noProbability: number;
      }>;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function usePolymarketProfile(walletAddress?: string | null) {
  return useQuery({
    queryKey: ['polymarket-profile', walletAddress || ''],
    enabled: Boolean(walletAddress),
    queryFn: async () => {
      const response = await api.getPolymarketProfile(walletAddress as string);
      return (response.profile || response.data?.profile || null) as
        | {
            name: string | null;
            pseudonym: string | null;
            proxyWalletAddress: string;
            verifiedBadge: boolean;
            marketsTraded: number;
            currentValue: number;
            recentClosedCount: number;
            winRate: number;
            estimatedVolume: number;
            realizedPnl: number;
          }
        | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
