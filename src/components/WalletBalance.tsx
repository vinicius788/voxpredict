import React, { useState } from 'react';
import { RefreshCw, ExternalLink, DollarSign, Wallet } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';

interface WalletBalanceProps {
  isBrandTheme?: boolean;
  compact?: boolean;
}

export const WalletBalance: React.FC<WalletBalanceProps> = ({ 
  isBrandTheme = false, 
  compact = false 
}) => {
  const { walletAddress, isWalletConnected } = useWeb3();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simplified mock data
  const balanceData = {
    totalUsdValue: 142.5,
    balances: [
      {
        token: 'USDT',
        balance: '100',
        balanceFormatted: '100 USDT',
        usdValue: 100,
        chain: 'Polygon',
      },
      {
        token: 'MATIC',
        balance: '50',
        balanceFormatted: '50 MATIC',
        usdValue: 42.5,
        chain: 'Polygon',
      }
    ],
    lastUpdated: new Date(),
  };

  const themeClasses = {
    cardBg: isBrandTheme ? 'bg-gray-800' : 'bg-white',
    text: isBrandTheme ? 'text-white' : 'text-gray-900',
    textSecondary: isBrandTheme ? 'text-gray-300' : 'text-gray-600',
    border: isBrandTheme ? 'border-gray-700' : 'border-gray-200',
    hover: isBrandTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
  };

  const refreshBalances = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (!isWalletConnected) {
    return null;
  }

  if (compact) {
    return (
      <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <div className={`text-sm font-medium ${themeClasses.text}`}>
              Balance
            </div>
          </div>
          <button
            onClick={refreshBalances}
            disabled={isRefreshing}
            className={`p-1 ${themeClasses.textSecondary} ${themeClasses.hover} rounded transition-colors disabled:opacity-50`}
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className={`text-lg font-bold ${themeClasses.text}`}>
          ${balanceData.totalUsdValue.toFixed(2)}
        </div>
      </div>
    );
  }

  return (
    <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-semibold ${themeClasses.text}`}>
          Wallet Balance
        </h3>
        <button
          onClick={refreshBalances}
          disabled={isRefreshing}
          className={`p-2 ${themeClasses.textSecondary} ${themeClasses.hover} rounded-lg transition-colors disabled:opacity-50`}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className={`${isBrandTheme ? 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-700' : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'} rounded-xl p-6 border mb-6`}>
        <div className="text-center">
          <div className={`text-sm ${isBrandTheme ? 'text-blue-300' : 'text-blue-700'} font-medium mb-2`}>
            Total Balance
          </div>
          <div className={`text-3xl font-bold ${isBrandTheme ? 'text-blue-300' : 'text-blue-800'}`}>
            ${balanceData.totalUsdValue.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className={`text-lg font-semibold ${themeClasses.text}`}>Tokens</h4>
        
        <div className="space-y-3">
          {balanceData.balances.map((balance, index) => (
            <div
              key={`${balance.token}-${index}`}
              className={`${isBrandTheme ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4 ${themeClasses.hover} transition-colors`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">
                      {balance.token.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className={`font-semibold ${themeClasses.text}`}>
                      {balance.token}
                    </div>
                    <div className={`text-sm ${themeClasses.textSecondary}`}>
                      {balance.chain}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${themeClasses.text}`}>
                    {balance.balanceFormatted}
                  </div>
                  <div className={`text-sm ${themeClasses.textSecondary}`}>
                    ${balance.usdValue.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};