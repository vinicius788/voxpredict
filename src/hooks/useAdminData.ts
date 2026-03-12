import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export function useAdminStats(enabled = true) {
  return useQuery({
    queryKey: ['admin-stats'],
    enabled,
    queryFn: async () => {
      const response = await api.getAdminStats();
      return response.data || response;
    },
    refetchInterval: 30_000,
  });
}

export function useFinancialOverview(enabled = true) {
  return useQuery({
    queryKey: ['financial-overview'],
    enabled,
    queryFn: async () => {
      const response = await api.getFinancialOverview();
      return response.data || response;
    },
  });
}
