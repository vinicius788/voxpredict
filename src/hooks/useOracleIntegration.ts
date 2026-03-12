import { useState, useEffect } from 'react';

interface PendingMarket {
  id: string;
  question: string;
  endDate: Date;
  category: string;
}

interface ResolvedMarket {
  result: 'SIM' | 'NÃO';
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

export const useOracleIntegration = () => {
  const [pendingMarkets, setPendingMarkets] = useState<PendingMarket[]>([]);
  const [resolvedMarkets, setResolvedMarkets] = useState<Record<string, ResolvedMarket>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Mock pending markets
    setPendingMarkets([
      {
        id: '1',
        question: 'Bitcoin atingirá $100k até dezembro 2024?',
        endDate: new Date('2024-12-31'),
        category: 'cripto'
      },
      {
        id: '2',
        question: 'Lula será reeleito presidente do Brasil em 2026?',
        endDate: new Date('2026-10-31'),
        category: 'política'
      },
      {
        id: '3',
        question: 'Ethereum atingirá $5,000 em 2024?',
        endDate: new Date('2024-12-31'),
        category: 'cripto'
      }
    ]);

    // Mock resolved markets
    setResolvedMarkets({
      '4': {
        result: 'SIM',
        confidence: 95,
        reasoning: 'Bitcoin atingiu $100k em 15 de novembro de 2024',
        timestamp: new Date('2024-12-31')
      },
      '5': {
        result: 'NÃO',
        confidence: 98,
        reasoning: 'O candidato X foi eleito presidente',
        timestamp: new Date('2024-10-31')
      }
    });
  }, []);

  const resolveAllMarkets = async () => {
    setIsProcessing(true);
    try {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 2000));
      const resolved = pendingMarkets.length;
      
      // Create mock resolved markets
      const newResolvedMarkets = { ...resolvedMarkets };
      pendingMarkets.forEach(market => {
        newResolvedMarkets[market.id] = {
          result: Math.random() > 0.5 ? 'SIM' : 'NÃO',
          confidence: Math.floor(Math.random() * 30) + 70, // 70-99
          reasoning: `Resolução automática baseada em dados verificados`,
          timestamp: new Date()
        };
      });
      
      setResolvedMarkets(newResolvedMarkets);
      setPendingMarkets([]);
      
      return resolved;
    } catch (error) {
      console.error('Error resolving markets:', error);
      return 0;
    } finally {
      setIsProcessing(false);
    }
  };

  const getOracleStats = () => {
    return {
      totalResolved: Object.keys(resolvedMarkets).length,
      averageConfidence: 95.2,
      successRate: 98.7
    };
  };

  return {
    pendingMarkets,
    resolvedMarkets,
    isProcessing,
    resolveAllMarkets,
    getOracleStats
  };
};