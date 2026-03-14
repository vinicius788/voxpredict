import React, { useState } from 'react';
import { DollarSign, ArrowDown, ArrowUp, Shield, AlertTriangle } from 'lucide-react';
import { useVaultContract } from '../hooks/useVaultContract';
import { useWeb3 } from '../contexts/Web3Context';

interface VaultManagerProps {
  isBrandTheme?: boolean;
}

export const VaultManager: React.FC<VaultManagerProps> = ({ 
  isBrandTheme = false 
}) => {
  const { isWalletConnected } = useWeb3();
  const { vaultData, isLoading, deposit, withdraw } = useVaultContract(isWalletConnected);
  const [amount, setAmount] = useState('10');
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  const themeClasses = {
    cardBg: isBrandTheme ? 'bg-gray-800' : 'bg-white',
    text: isBrandTheme ? 'text-white' : 'text-gray-900',
    textSecondary: isBrandTheme ? 'text-gray-300' : 'text-gray-600',
    border: isBrandTheme ? 'border-gray-700' : 'border-gray-200',
    input: isBrandTheme ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300',
  };

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    await deposit(parseFloat(amount));
  };

  const handleWithdraw = async () => {
    if (vaultData.availableBalance <= 0) return;
    await withdraw(vaultData.availableBalance);
  };

  if (!isWalletConnected) {
    return (
      <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} p-4`}>
        <div className="text-center py-4">
          <Shield className={`w-8 h-8 ${themeClasses.textSecondary} mx-auto mb-2`} />
          <p className={`${themeClasses.textSecondary} text-sm`}>
            Connect your wallet to manage your vault
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} p-4`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${themeClasses.text}`}>
          Vault Manager
        </h3>
        <div className={`px-3 py-1 rounded-lg ${
          vaultData.isInPrediction
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
        }`}>
          <span className="text-xs font-medium">
            {vaultData.isInPrediction ? 'Locked' : 'Available'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <div className={`text-sm ${themeClasses.textSecondary}`}>
            Balance
          </div>
          <div className={`text-xl font-bold ${themeClasses.text}`}>
            ${vaultData.availableBalance.toFixed(2)}
          </div>
        </div>
        
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'deposit'
                ? 'bg-blue-600 text-white'
                : `${isBrandTheme ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'withdraw'
                ? 'bg-blue-600 text-white'
                : `${isBrandTheme ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
            }`}
          >
            Withdraw
          </button>
        </div>
      </div>

      {activeTab === 'deposit' ? (
        <div className="space-y-3">
          <div>
            <label className={`block text-sm ${themeClasses.textSecondary} mb-1`}>
              Amount (USDT)
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="5"
                step="1"
                className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${themeClasses.input}`}
              />
              <button
                onClick={handleDeposit}
                disabled={isLoading || !amount || parseFloat(amount) < 5 || vaultData.isInPrediction}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <ArrowDown className="w-4 h-4" />
                <span>Deposit</span>
              </button>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Minimum: $5 USDT
            </div>
          </div>
          
          {vaultData.isInPrediction && (
            <div className="flex items-center space-x-2 text-amber-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Vault is locked during active predictions</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className={`p-3 rounded-lg ${isBrandTheme ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div className={`text-sm ${themeClasses.textSecondary}`}>
                Available to withdraw
              </div>
              <div className={`text-lg font-bold ${themeClasses.text}`}>
                ${vaultData.availableBalance.toFixed(2)}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleWithdraw}
            disabled={isLoading || vaultData.availableBalance === 0 || vaultData.isInPrediction}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <ArrowUp className="w-4 h-4" />
            <span>Withdraw All</span>
          </button>
          
          {vaultData.isInPrediction && (
            <div className="flex items-center space-x-2 text-amber-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Vault is locked during active predictions</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
