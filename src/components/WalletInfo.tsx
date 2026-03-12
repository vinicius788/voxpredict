import React from 'react';
import { ExternalLink, Copy, Wallet } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { toast } from 'react-hot-toast';

interface WalletInfoProps {
  isBrandTheme?: boolean;
  compact?: boolean;
}

export const WalletInfo: React.FC<WalletInfoProps> = ({ 
  isBrandTheme = false, 
  compact = false 
}) => {
  const { walletAddress, isWalletConnected } = useWeb3();
  
  const themeClasses = {
    cardBg: isBrandTheme ? 'bg-gray-800' : 'bg-white',
    text: isBrandTheme ? 'text-white' : 'text-gray-900',
    textSecondary: isBrandTheme ? 'text-gray-300' : 'text-gray-600',
    border: isBrandTheme ? 'border-gray-700' : 'border-gray-200',
    hover: isBrandTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
  };

  if (!isWalletConnected || !walletAddress) {
    return null;
  }

  const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    toast.success('Address copied!');
  };

  const openExplorer = () => {
    window.open(`https://polygonscan.com/address/${walletAddress}`, '_blank');
  };

  if (compact) {
    return (
      <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} p-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-blue-600" />
            <div>
              <div className={`text-sm font-medium ${themeClasses.text}`}>
                {shortAddress}
              </div>
              <div className={`text-xs ${themeClasses.textSecondary}`}>
                Polygon Network
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={copyAddress}
              className={`p-1 ${themeClasses.textSecondary} ${themeClasses.hover} rounded transition-colors`}
              title="Copy address"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={openExplorer}
              className={`p-1 ${themeClasses.textSecondary} ${themeClasses.hover} rounded transition-colors`}
              title="View in explorer"
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
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${themeClasses.text}`}>
          Wallet Information
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={copyAddress}
            className={`p-2 ${themeClasses.textSecondary} ${themeClasses.hover} rounded-lg transition-colors`}
            title="Copy address"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={openExplorer}
            className={`p-2 ${themeClasses.textSecondary} ${themeClasses.hover} rounded-lg transition-colors`}
            title="View in explorer"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className={`text-sm ${themeClasses.textSecondary} mb-1`}>
            Wallet Address
          </div>
          <div className={`font-mono text-sm ${themeClasses.text} break-all`}>
            {walletAddress}
          </div>
        </div>

        <div>
          <div className={`text-sm ${themeClasses.textSecondary} mb-1`}>
            Balance
          </div>
          <div className={`text-lg font-bold ${themeClasses.text}`}>
            100 USDT
          </div>
        </div>

        <div className={`${isBrandTheme ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} rounded-xl p-4 border`}>
          <div className="flex items-start space-x-2">
            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <div>
              <div className={`text-sm font-medium ${isBrandTheme ? 'text-blue-300' : 'text-blue-800'}`}>
                Connected Wallet
              </div>
              <div className={`text-xs ${isBrandTheme ? 'text-blue-400' : 'text-blue-700'} mt-1`}>
                Polygon Network
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};