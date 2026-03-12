import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface MarketInfo {
  question: string;
  description: string;
  options: string[];
  endTime: Date;
  totalVolume: number;
  totalBettors: number;
  isActive: boolean;
  isResolved: boolean;
  winningOption: number;
}

export const usePredictionMarket = (marketAddress: string) => {
  const [info, setInfo] = useState<MarketInfo | null>(null);
  const [odds, setOdds] = useState<number[]>([]);
  const [probabilities, setProbabilities] = useState<number[]>([]);
  const [userBets, setUserBets] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMarketData = async () => {
      setIsLoading(true);
      try {
        // Mock data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockInfo: MarketInfo = {
          question: 'Bitcoin atingirá $100,000 até dezembro 2024?',
          description: 'Este mercado prevê se o preço do Bitcoin (BTC) atingirá ou ultrapassará a marca de $100,000 USD em qualquer exchange principal antes do final do ano. A resolução será baseada em dados verificáveis de pelo menos três grandes exchanges (Binance, Coinbase, Kraken).',
          options: ['SIM', 'NÃO'],
          endTime: new Date('2024-12-31'),
          totalVolume: 15420.50,
          totalBettors: 127,
          isActive: true,
          isResolved: false,
          winningOption: 0
        };
        
        setInfo(mockInfo);
        setOdds([2.15, 1.85]);
        setProbabilities([46.5, 53.5]);
        setUserBets([100, 0]);
      } catch (error) {
        console.error('Error fetching market data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (marketAddress) {
      fetchMarketData();
    }
  }, [marketAddress]);

  const placeBet = async (option: number, amount: number) => {
    setIsLoading(true);
    try {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update user bets
      const newUserBets = [...userBets];
      newUserBets[option] += amount;
      setUserBets(newUserBets);
      
      // Update market info
      if (info) {
        setInfo({
          ...info,
          totalVolume: info.totalVolume + amount,
          totalBettors: info.totalBettors + 1
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error placing bet:', error);
      toast.error('Failed to place bet');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const withdraw = async () => {
    setIsLoading(true);
    try {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Reset user bets
      setUserBets(userBets.map(() => 0));
      
      toast.success('Withdrawal successful!');
      return true;
    } catch (error) {
      console.error('Error withdrawing:', error);
      toast.error('Failed to withdraw');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    info,
    odds,
    probabilities,
    userBets,
    isLoading,
    placeBet,
    withdraw
  };
};