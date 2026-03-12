import React from 'react';
import { Wallet, ExternalLink, Shield, Zap } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { toast } from 'react-hot-toast';

interface WalletButtonProps {
  isBrandTheme?: boolean;
  showBalance?: boolean;
}

export const WalletButton: React.FC<WalletButtonProps> = ({ 
  isBrandTheme = false, 
  showBalance = false 
}) => {
  const { 
    isWalletConnected, 
    walletAddress, 
    connectWallet,
    disconnectWallet, 
    isConnecting,
    walletType 
  } = useWeb3();

  const themeClasses = {
    cardBg: isBrandTheme ? 'bg-gray-800' : 'bg-white',
    text: isBrandTheme ? 'text-white' : 'text-gray-900',
    textSecondary: isBrandTheme ? 'text-gray-300' : 'text-gray-600',
    border: isBrandTheme ? 'border-gray-700' : 'border-gray-200',
    hover: isBrandTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast.success('Address copied!');
    }
  };

  const getWalletIcon = () => {
    if (walletType === 'embedded') {
      return <Shield className="w-4 h-4" />;
    }
    return <ExternalLink className="w-4 h-4" />;
  };

  const getWalletTypeLabel = () => {
    if (walletType === 'embedded') {
      return 'Instant Wallet';
    }
    return 'External Wallet';
  };

  if (isWalletConnected && walletAddress) {
    return (
      <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {getWalletIcon()}
            <span className={`text-sm font-medium ${themeClasses.text}`}>
              {getWalletTypeLabel()}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-green-600 font-medium">Connected</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className={`text-xs ${themeClasses.textSecondary} mb-1`}>Address</div>
            <button
              onClick={copyAddress}
              className={`text-sm font-mono ${themeClasses.text} ${themeClasses.hover} px-2 py-1 rounded transition-colors`}
            >
              {formatAddress(walletAddress)}
            </button>
          </div>

          {showBalance && (
            <div>
              <div className={`text-xs ${themeClasses.textSecondary} mb-1`}>Total Balance</div>
              <div className={`text-lg font-bold ${themeClasses.text}`}>
                <div className="w-20 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={disconnectWallet}
              className={`flex-1 px-3 py-2 text-sm font-medium ${isBrandTheme ? 'bg-red-900/20 text-red-300 hover:bg-red-900/30' : 'bg-red-50 text-red-700 hover:bg-red-100'} rounded-lg transition-colors`}
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} p-6`}>
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        
        <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>
          Connect Web3 Wallet
        </h3>
        
        <p className={`text-sm ${themeClasses.textSecondary} mb-6`}>
          Connect your wallet to make predictions on markets
        </p>

        <div className="space-y-3 mb-6">
          <div className={`${isBrandTheme ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-lg p-3`}>
            <div className="flex items-center space-x-2 mb-2">
              <ExternalLink className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                External Wallets
              </span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              MetaMask, Trust Wallet, Coinbase, etc.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            void connectWallet();
          }}
          disabled={isConnecting}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isConnecting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Connect Wallet</span>
            </>
          )}
        </button>

        <div className={`mt-4 p-3 ${isBrandTheme ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
          <div className="flex items-center space-x-2 mb-1">
            <Shield className="w-3 h-3 text-green-600" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">
              Secure & Decentralized
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Your private keys always stay with you
          </p>
        </div>
      </div>
    </div>
  );
};
