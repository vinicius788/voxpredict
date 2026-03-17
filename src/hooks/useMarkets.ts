import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type MarketFilters } from '../lib/api-client';
import { Market } from '../types';

type ApiMarket = {
  id: number;
  onChainId?: number | null;
  contractAddress?: string;
  question?: string;
  title?: string;
  description: string;
  category: string;
  endTime: string;
  totalVolume: number;
  totalYes?: number;
  totalNo?: number;
  yesPool?: number;
  noPool?: number;
  participants?: number;
  totalBettors?: number;
  simOdds?: number;
  naoOdds?: number;
  yesOdds?: number;
  noOdds?: number;
  yesMultiplier?: number;
  noMultiplier?: number;
  simProbability?: number;
  naoProbability?: number;
  yesProbability?: number;
  noProbability?: number;
  yesProb?: number;
  noProb?: number;
  status: string;
  outcome?: string | null;
  token?: string;
  tags?: string[];
  createdAt?: string;
  resolvedAt?: string | null;
};

type MarketListEnvelope = {
  data?: ApiMarket[];
  markets?: ApiMarket[];
  total?: number;
  page?: number;
  totalPages?: number;
};

const mapStatus = (status: string): Market['status'] => {
  const normalized = status.toLowerCase();
  if (normalized === 'active') return 'active';
  if (normalized === 'resolved') return 'resolved';
  return 'closed';
};

export const mapApiMarketToUi = (market: ApiMarket): Market => {
  const totalYes = Number(market.totalYes ?? market.yesPool ?? 0);
  const totalNo = Number(market.totalNo ?? market.noPool ?? 0);
  const totalVolume = Number(market.totalVolume || totalYes + totalNo || 0);
  const yesProbabilityPct =
    market.simProbability ??
    market.yesProb ??
    (market.yesProbability !== undefined ? Number(market.yesProbability) * 100 : 50);
  const noProbabilityPct =
    market.naoProbability ??
    market.noProb ??
    (market.noProbability !== undefined ? Number(market.noProbability) * 100 : 50);
  const yesOdds = Number(market.simOdds ?? market.yesOdds ?? market.yesMultiplier ?? 2);
  const noOdds = Number(market.naoOdds ?? market.noOdds ?? market.noMultiplier ?? 2);

  return {
    id: String(market.id),
    title: market.title || market.question || 'Mercado sem título',
    description: market.description || '',
    category: market.category,
    endDate: market.endTime,
    createdAt: market.createdAt,
    resolvedAt: market.resolvedAt ?? null,
    totalVolume,
    totalYes,
    totalNo,
    yesPool: totalYes,
    noPool: totalNo,
    contractAddress: market.contractAddress,
    onChainId: market.onChainId ?? market.id,
    totalBettors: Number(market.totalBettors ?? market.participants ?? 0),
    simOdds: yesOdds,
    naoOdds: noOdds,
    yesOdds,
    noOdds,
    simProbability: Number(yesProbabilityPct),
    naoProbability: Number(noProbabilityPct),
    yesProbability: market.yesProbability !== undefined ? Number(market.yesProbability) : Number(yesProbabilityPct) / 100,
    noProbability: market.noProbability !== undefined ? Number(market.noProbability) : Number(noProbabilityPct) / 100,
    status: mapStatus(market.status),
    outcome: market.outcome || null,
    token: market.token || 'USDT',
    tags: market.tags || [],
  };
};

export function useMarkets(filters: MarketFilters = {}) {
  return useQuery({
    queryKey: ['markets', filters],
    queryFn: async () => {
      const response = (await api.getMarkets(filters)) as MarketListEnvelope;
      const rawMarkets = response.markets || response.data || [];
      return {
        markets: rawMarkets.map(mapApiMarketToUi),
        total: Number(response.total || rawMarkets.length || 0),
        page: Number(response.page || 1),
        totalPages: Number(response.totalPages || 1),
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useMarket(id?: number) {
  return useQuery({
    queryKey: ['market', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await api.getMarket(id as number);
      const raw = (response.data || response.market || response) as ApiMarket & {
        probabilityHistory?: Array<{ timestamp: string; yesProb: number; noProb: number; volume: number }>;
      };
      return {
        market: mapApiMarketToUi(raw),
        probabilityHistory: raw.probabilityHistory || [],
      };
    },
  });
}

export function useMarketHistory(id?: number, period = '30d') {
  return useQuery({
    queryKey: ['market-history', id, period],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await api.getMarketHistory(id as number, period);
      return (response.data || response.snapshots || []) as Array<{
        timestamp: string;
        yesProb: number;
        noProb: number;
        volume: number;
      }>;
    },
  });
}

export function useCreateMarket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => api.createMarket(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useResolveMarket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, outcome }: { id: number; outcome: 'YES' | 'NO' }) => api.resolveMarket(id, outcome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}
