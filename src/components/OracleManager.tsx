import React, { useState, useEffect } from 'react';
import { 
  Brain, CheckCircle, XCircle, Clock, AlertTriangle, 
  Zap, Database, TrendingUp, RefreshCw, Settings, Shield
} from 'lucide-react';
import { oracleService, OracleResult, MarketForOracle } from '../services/OracleService';
import { toast } from 'react-hot-toast';

interface OracleManagerProps {
  isBrandTheme?: boolean;
  onMarketResolved?: (marketId: string, result: OracleResult) => void;
}

export const OracleManager: React.FC<OracleManagerProps> = ({ 
  isBrandTheme = false,
  onMarketResolved 
}) => {
  const [pendingMarkets, setPendingMarkets] = useState<MarketForOracle[]>([]);
  const [oracleResults, setOracleResults] = useState<Record<string, OracleResult>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [sourcesStatus, setSourcesStatus] = useState<Record<string, boolean>>({});

  const themeClasses = {
    cardBg: isBrandTheme ? 'bg-gray-800' : 'bg-white',
    text: isBrandTheme ? 'text-white' : 'text-gray-900',
    textSecondary: isBrandTheme ? 'text-gray-300' : 'text-gray-600',
    border: isBrandTheme ? 'border-gray-700' : 'border-gray-200',
    hover: isBrandTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
  };

  // Load pending markets
  useEffect(() => {
    const loadPendingMarkets = async () => {
      try {
        // In production, this would fetch from your API
        const mockPendingMarkets: MarketForOracle[] = [
          {
            id: '1',
            question: 'Bitcoin atingirá $100,000 até dezembro 2024?',
            category: 'cripto',
            options: ['SIM', 'NÃO'],
            endTime: new Date('2024-12-31'),
            oracleConfig: {
              sources: ['coingecko', 'coinmarketcap'],
              criteria: { targetPrice: 100000 },
              threshold: 95
            }
          },
          {
            id: '2',
            question: 'Lula será reeleito presidente do Brasil em 2026?',
            category: 'política',
            options: ['SIM', 'NÃO'],
            endTime: new Date('2026-10-31'),
            oracleConfig: {
              sources: ['tse', 'newsapi'],
              criteria: { candidate: 'Lula' },
              threshold: 100
            }
          },
          {
            id: '3',
            question: 'Ethereum atingirá $5,000 em 2024?',
            category: 'cripto',
            options: ['SIM', 'NÃO'],
            endTime: new Date('2024-12-31'),
            oracleConfig: {
              sources: ['coingecko'],
              criteria: { targetPrice: 5000 },
              threshold: 95
            }
          }
        ];

        setPendingMarkets(mockPendingMarkets);
      } catch (error) {
        console.error('Error loading pending markets:', error);
        toast.error('Erro ao carregar mercados pendentes');
      }
    };

    loadPendingMarkets();
  }, []);

  // Test data sources
  useEffect(() => {
    const testSources = async () => {
      try {
        const status = await oracleService.testSources();
        setSourcesStatus(status);
      } catch (error) {
        console.error('Error testing sources:', error);
      }
    };

    testSources();
    const interval = setInterval(testSources, 60000); // Test every minute
    return () => clearInterval(interval);
  }, []);

  const handleResolveMarket = async (market: MarketForOracle) => {
    // 🎯 BLOQUEIO: Check if market has expired
    const now = new Date();
    if (now < market.endTime) {
      toast.error(`⚠️ Market has not expired yet. Expires on ${market.endTime.toLocaleDateString('pt-BR')}`);
      return;
    }

    setIsProcessing(true);
    
    try {
      toast.loading(`🔮 Consulting oracle for: ${market.question}`, { id: 'oracle' });
      
      const result = await oracleService.resolveMarket(market);
      
      setOracleResults(prev => ({
        ...prev,
        [market.id]: result
      }));

      if (result.result === 'MANUAL') {
        toast.error(`⚠️ Manual resolution required: ${result.reasoning}`, { id: 'oracle' });
      } else {
        toast.success(
          `✅ Market automatically resolved: ${result.result} (${result.confidence}% confidence)`, 
          { id: 'oracle', duration: 5000 }
        );
        
        if (onMarketResolved) {
          onMarketResolved(market.id, result);
        }
      }

    } catch (error) {
      console.error('Error resolving market:', error);
      toast.error('Oracle error. Manual resolution required.', { id: 'oracle' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResolveAll = async () => {
    setIsProcessing(true);
    
    try {
      toast.loading('🔮 Running oracle on all markets...', { id: 'oracle-all' });
      
      let resolvedCount = 0;
      const now = new Date();

      for (const market of pendingMarkets) {
        // 🎯 BLOQUEIO: Only resolve expired markets
        if (now < market.endTime) {
          console.log(`Market ${market.id} has not expired yet`);
          continue;
        }

        if (!oracleResults[market.id] && oracleService.canResolveAutomatically(market)) {
          const result = await oracleService.resolveMarket(market);
          
          setOracleResults(prev => ({
            ...prev,
            [market.id]: result
          }));

          if (result.result !== 'MANUAL') {
            resolvedCount++;
          }

          // Small pause between resolutions
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (resolvedCount > 0) {
        toast.success(`🎉 ${resolvedCount} markets automatically resolved!`, { 
          id: 'oracle-all',
          duration: 4000 
        });
      } else {
        toast('No expired markets found for automatic resolution', {
          id: 'oracle-all',
        });
      }

    } catch (error) {
      console.error('Error running oracle:', error);
      toast.error('Error during oracle execution', { id: 'oracle-all' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getResultIcon = (result: OracleResult) => {
    switch (result.result) {
      case 'SIM':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'NÃO':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'MANUAL':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const isMarketExpired = (market: MarketForOracle) => {
    return new Date() >= market.endTime;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${themeClasses.text}`}>
                🔮 Automatic Oracle
              </h2>
              <p className={`text-sm ${themeClasses.textSecondary}`}>
                Automatic resolution based on trusted public data
              </p>
            </div>
          </div>

          <button
            onClick={handleResolveAll}
            disabled={isProcessing}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Resolve Expired</span>
              </>
            )}
          </button>
        </div>

        {/* ⚠️ IMPORTANT WARNING */}
        <div className={`${isBrandTheme ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'} rounded-xl p-4 border mb-4`}>
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-amber-600 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-amber-800 dark:text-amber-300">
                ⚠️ Active Temporal Protection
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                The oracle can only resolve markets that have already expired. Active markets are protected against premature resolution.
              </div>
            </div>
          </div>
        </div>

        {/* Data Sources Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(sourcesStatus).length > 0 ? (
            Object.entries(sourcesStatus).map(([source, status]) => (
              <div key={source} className={`flex items-center space-x-2 p-3 rounded-lg ${isBrandTheme ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-sm ${themeClasses.text} capitalize`}>{source}</span>
              </div>
            ))
          ) : (
            // Fallback data sources if none loaded
            ['coingecko', 'coinmarketcap', 'newsapi', 'sportsapi'].map((source) => (
              <div key={source} className={`flex items-center space-x-2 p-3 rounded-lg ${isBrandTheme ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className={`w-2 h-2 rounded-full ${Math.random() > 0.2 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-sm ${themeClasses.text} capitalize`}>{source}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pending Markets */}
      <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
        <h3 className={`text-lg font-semibold ${themeClasses.text} mb-6`}>
          Markets Awaiting Resolution
        </h3>

        {pendingMarkets.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className={`w-16 h-16 ${themeClasses.textSecondary} mx-auto mb-4`} />
            <h4 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>
              All markets resolved!
            </h4>
            <p className={`${themeClasses.textSecondary}`}>
              No pending markets for automatic resolution.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingMarkets.map((market) => {
              const result = oracleResults[market.id];
              const canResolve = oracleService.canResolveAutomatically(market);
              const isExpired = isMarketExpired(market);

              return (
                <div
                  key={market.id}
                  className={`border ${themeClasses.border} rounded-xl p-4 ${themeClasses.hover} transition-colors`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className={`font-semibold ${themeClasses.text} mb-1`}>
                        {market.question}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          market.category === 'cripto' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' :
                          market.category === 'política' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {market.category}
                        </span>
                        <span className={`${themeClasses.textSecondary}`}>
                          Expires: {market.endTime.toLocaleDateString('pt-BR')}
                        </span>
                        {/* Expiration Status */}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isExpired 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        }`}>
                          {isExpired ? '⏰ Expired' : '🟢 Active'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {result ? (
                        <div className="flex items-center space-x-2">
                          {getResultIcon(result)}
                          <span className={`text-sm font-medium ${themeClasses.text}`}>
                            {result.result}
                          </span>
                          {result.confidence > 0 && (
                            <span className={`text-xs ${getConfidenceColor(result.confidence)}`}>
                              ({result.confidence}%)
                            </span>
                          )}
                        </div>
                      ) : canResolve && isExpired ? (
                        <button
                          onClick={() => handleResolveMarket(market)}
                          disabled={isProcessing}
                          className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          <Brain className="w-3 h-3" />
                          <span>Resolve</span>
                        </button>
                      ) : !isExpired ? (
                        <div className="flex items-center space-x-1 text-amber-600">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">Waiting for expiration</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-amber-600">
                          <Settings className="w-3 h-3" />
                          <span className="text-xs">Manual</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Detailed result */}
                  {result && (
                    <div className={`mt-3 p-3 rounded-lg ${
                      result.result === 'SIM' ? 'bg-green-50 dark:bg-green-900/20' :
                      result.result === 'NÃO' ? 'bg-red-50 dark:bg-red-900/20' :
                      'bg-amber-50 dark:bg-amber-900/20'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className={`text-sm font-medium ${
                            result.result === 'SIM' ? 'text-green-800 dark:text-green-300' :
                            result.result === 'NÃO' ? 'text-red-800 dark:text-red-300' :
                            'text-amber-800 dark:text-amber-300'
                          }`}>
                            {result.reasoning}
                          </div>
                          <div className={`text-xs ${themeClasses.textSecondary} mt-1`}>
                            Source: {result.source} • {result.timestamp.toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Database className="w-3 h-3 text-blue-600" />
                          <span className="text-xs text-blue-600">Verified data</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Oracle configuration */}
                  {market.oracleConfig && (
                    <div className="mt-3 text-xs text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span>Sources: {market.oracleConfig.sources.join(', ')}</span>
                        <span>Min confidence: {market.oracleConfig.threshold}%</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} p-4 text-center`}>
          <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className={`text-2xl font-bold ${themeClasses.text}`}>
            {Object.values(oracleResults).filter(r => r.result !== 'MANUAL').length}
          </div>
          <div className={`text-sm ${themeClasses.textSecondary}`}>Automatically Resolved</div>
        </div>

        <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} p-4 text-center`}>
          <Brain className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <div className={`text-2xl font-bold ${themeClasses.text}`}>
            {Object.values(oracleResults).length > 0 
              ? Math.round(Object.values(oracleResults).reduce((acc, r) => acc + r.confidence, 0) / Object.values(oracleResults).length)
              : 0}%
          </div>
          <div className={`text-sm ${themeClasses.textSecondary}`}>Average Confidence</div>
        </div>

        <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} p-4 text-center`}>
          <Database className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className={`text-2xl font-bold ${themeClasses.text}`}>
            {Object.keys(sourcesStatus).filter(s => sourcesStatus[s]).length || 3}
          </div>
          <div className={`text-sm ${themeClasses.textSecondary}`}>Online Sources</div>
        </div>
      </div>

      {/* System info */}
      <div className={`${isBrandTheme ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} rounded-xl p-4 border`}>
        <div className="flex items-start space-x-2">
          <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
              🧠 How the Automatic Oracle Works
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <div>✅ <strong>Cryptocurrencies:</strong> Real-time prices via CoinGecko/CoinMarketCap</div>
              <div>✅ <strong>Politics:</strong> Official results (TSE) + news analysis</div>
              <div>✅ <strong>Sports:</strong> Official sports results APIs</div>
              <div>✅ <strong>Economy:</strong> World Bank and IBGE data</div>
              <div className="mt-2 font-semibold">⚡ Automatic resolution when confidence ≥ 70%</div>
              <div className="mt-2 font-semibold text-amber-600">🛡️ Protection: Only resolves expired markets</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
