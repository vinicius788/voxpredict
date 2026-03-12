import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Shield, ExternalLink, RefreshCw, 
  TrendingUp, Wallet, AlertTriangle, CheckCircle,
  Eye, Copy, Clock
} from 'lucide-react';
import { treasuryService, SafeData, VOXPREDICT_SAFE_ADDRESS } from '../services/TreasuryService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

interface AdminTreasuryStatusProps {
  isBrandTheme?: boolean;
  compact?: boolean;
}

export const AdminTreasuryStatus: React.FC<AdminTreasuryStatusProps> = ({ 
  isBrandTheme = false,
  compact = false 
}) => {
  const [safeData, setSafeData] = useState<SafeData>({
    address: VOXPREDICT_SAFE_ADDRESS,
    totalUsdValue: 0,
    balances: [],
    lastUpdated: new Date(),
    isLoading: true,
    error: null,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const themeClasses = {
    cardBg: isBrandTheme ? 'bg-gray-800' : 'bg-white',
    text: isBrandTheme ? 'text-white' : 'text-gray-900',
    textSecondary: isBrandTheme ? 'text-gray-300' : 'text-gray-600',
    border: isBrandTheme ? 'border-gray-700' : 'border-gray-200',
    hover: isBrandTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
  };

  // Buscar dados da Safe
  const fetchSafeData = async () => {
    setIsRefreshing(true);
    try {
      const data = await treasuryService.getSafeBalance();
      setSafeData(data);
      
      if (data.error) {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Erro ao buscar dados da Safe:', error);
      toast.error('Erro ao conectar com a blockchain');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh a cada 5 minutos
  useEffect(() => {
    fetchSafeData();
    
    const interval = setInterval(fetchSafeData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(VOXPREDICT_SAFE_ADDRESS);
    toast.success('Endereço da Safe copiado!');
  };

  const openEtherscan = () => {
    window.open(`https://etherscan.io/address/${VOXPREDICT_SAFE_ADDRESS}`, '_blank');
  };

  const openSafeApp = () => {
    window.open(`https://app.safe.global/eth:${VOXPREDICT_SAFE_ADDRESS}`, '_blank');
  };

  if (compact) {
    return (
      <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className={`text-sm font-medium ${themeClasses.text}`}>Tesouraria</div>
              <div className={`text-xs ${themeClasses.textSecondary}`}>Safe Ethereum</div>
            </div>
          </div>
          
          <button
            onClick={fetchSafeData}
            disabled={isRefreshing}
            className={`p-1 ${themeClasses.textSecondary} ${themeClasses.hover} rounded transition-colors disabled:opacity-50`}
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-xs ${themeClasses.textSecondary}`}>Saldo Total</span>
            <span className={`text-sm font-bold ${themeClasses.text}`}>
              {safeData.isLoading ? (
                <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ) : (
                formatCurrency(safeData.totalUsdValue)
              )}
            </span>
          </div>

          {safeData.balances.length > 0 && (
            <div className="space-y-1">
              {safeData.balances.slice(0, 2).map((balance, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className={`text-xs ${themeClasses.textSecondary}`}>{balance.symbol}</span>
                  <span className={`text-xs ${themeClasses.text}`}>
                    {balance.balanceFormatted}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className={`text-xs ${themeClasses.textSecondary}`}>
              {formatDistanceToNow(safeData.lastUpdated, { addSuffix: true, locale: ptBR })}
            </span>
            <button
              onClick={openSafeApp}
              className={`text-xs ${themeClasses.textSecondary} hover:text-blue-600 transition-colors`}
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${themeClasses.text}`}>
              💼 Tesouraria da Plataforma
            </h3>
            <p className={`text-sm ${themeClasses.textSecondary}`}>
              Safe Ethereum - Saldo em tempo real
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchSafeData}
            disabled={isRefreshing}
            className={`p-2 ${themeClasses.textSecondary} ${themeClasses.hover} rounded-lg transition-colors disabled:opacity-50`}
            title="Atualizar saldos"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={openSafeApp}
            className={`p-2 ${themeClasses.textSecondary} ${themeClasses.hover} rounded-lg transition-colors`}
            title="Abrir Safe App"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Saldo Total */}
      <div className={`${isBrandTheme ? 'bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-700' : 'bg-gradient-to-r from-green-50 to-blue-50 border-green-200'} rounded-xl p-6 border mb-6`}>
        <div className="text-center">
          <div className={`text-sm ${isBrandTheme ? 'text-green-300' : 'text-green-700'} font-medium mb-2`}>
            💰 Valor Total da Tesouraria
          </div>
          <div className={`text-4xl font-bold ${isBrandTheme ? 'text-green-300' : 'text-green-800'}`}>
            {safeData.isLoading ? (
              <div className="w-48 h-10 bg-gray-200 dark:bg-gray-700 rounded mx-auto animate-pulse"></div>
            ) : safeData.error ? (
              <div className="text-red-500 text-lg">Erro ao carregar</div>
            ) : (
              formatCurrency(safeData.totalUsdValue)
            )}
          </div>
          <div className={`text-xs ${themeClasses.textSecondary} mt-2`}>
            Última atualização: {formatDistanceToNow(safeData.lastUpdated, { addSuffix: true, locale: ptBR })}
          </div>
        </div>
      </div>

      {/* Error State */}
      {safeData.error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700 dark:text-red-400">{safeData.error}</span>
          </div>
        </div>
      )}

      {/* Detalhamento por Token */}
      <div className="space-y-4 mb-6">
        <h4 className={`text-lg font-semibold ${themeClasses.text}`}>Saldos por Token</h4>
        
        {safeData.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`${isBrandTheme ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse"></div>
                    <div>
                      <div className="w-12 h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mb-1"></div>
                      <div className="w-16 h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-20 h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mb-1"></div>
                    <div className="w-16 h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : safeData.balances.length === 0 ? (
          <div className={`text-center py-8 ${isBrandTheme ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl`}>
            <Wallet className={`w-12 h-12 ${themeClasses.textSecondary} mx-auto mb-3`} />
            <p className={`${themeClasses.textSecondary}`}>Nenhum saldo encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {safeData.balances.map((balance, index) => (
              <div
                key={`${balance.token}-${index}`}
                className={`${isBrandTheme ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4 ${themeClasses.hover} transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {balance.symbol.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className={`font-semibold ${themeClasses.text}`}>
                        {balance.symbol}
                      </div>
                      <div className={`text-sm ${themeClasses.textSecondary}`}>
                        {balance.balanceFormatted}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${themeClasses.text}`}>
                      {formatCurrency(balance.usdValue)}
                    </div>
                    <div className={`text-sm ${themeClasses.textSecondary}`}>
                      {((balance.usdValue / safeData.totalUsdValue) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Informações da Safe */}
      <div className={`${isBrandTheme ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} rounded-xl p-4 border`}>
        <div className="flex items-start space-x-2 mb-3">
          <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-blue-800 dark:text-blue-300">
              🔐 Safe Multisig Ethereum
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              Endereço: {VOXPREDICT_SAFE_ADDRESS.slice(0, 10)}...{VOXPREDICT_SAFE_ADDRESS.slice(-8)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-xs">
          <button
            onClick={copyAddress}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Copy className="w-3 h-3" />
            <span>Copiar endereço</span>
          </button>
          
          <button
            onClick={openEtherscan}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Eye className="w-3 h-3" />
            <span>Ver no Etherscan</span>
          </button>
          
          <button
            onClick={openSafeApp}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Abrir Safe App</span>
          </button>
        </div>
      </div>

      {/* Status Operacional */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-600 font-medium">Safe Operacional</span>
        </div>
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>Atualização automática a cada 5 min</span>
        </div>
      </div>
    </div>
  );
};