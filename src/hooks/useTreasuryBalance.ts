import { useState, useEffect } from 'react';
import { treasuryService, SafeData } from '../services/TreasuryService';

export const useTreasuryBalance = () => {
  const [safeData, setSafeData] = useState<SafeData>({
    address: '',
    totalUsdValue: 0,
    balances: [],
    lastUpdated: new Date(),
    isLoading: true,
    error: null,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSafeBalance = async () => {
    setIsRefreshing(true);
    try {
      const data = await treasuryService.getSafeBalance();
      setSafeData(data);
    } catch (error) {
      console.error('Erro ao buscar saldo da Safe:', error);
      setSafeData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erro ao conectar com a blockchain'
      }));
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshBalance = () => {
    treasuryService.clearCache();
    fetchSafeBalance();
  };

  // Auto-refresh a cada 5 minutos
  useEffect(() => {
    fetchSafeBalance();
    
    const interval = setInterval(fetchSafeBalance, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    safeData,
    isRefreshing,
    refreshBalance,
    fetchSafeBalance,
  };
};