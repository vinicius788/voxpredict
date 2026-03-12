import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';

interface NetworkSwitcherProps {
  isBrandTheme?: boolean;
  compact?: boolean;
}

export const NetworkSwitcher: React.FC<NetworkSwitcherProps> = ({
  isBrandTheme = false,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { chainId, switchChain } = useWeb3();

  const chains = [
    { id: 137, name: 'Polygon', icon: '🟣' },
    { id: 80002, name: 'Amoy Testnet', icon: '🔮' },
    { id: 8453, name: 'Base', icon: '🔵' },
    { id: 1, name: 'Ethereum', icon: '🔷' },
    { id: 11155111, name: 'Sepolia Testnet', icon: '🧪' }
  ];

  const themeClasses = {
    button: isBrandTheme 
      ? 'bg-gray-700 text-white hover:bg-gray-600' 
      : 'bg-white text-gray-900 hover:bg-gray-100',
    dropdown: isBrandTheme
      ? 'bg-gray-800 border-gray-700'
      : 'bg-white border-gray-200',
    option: isBrandTheme
      ? 'hover:bg-gray-700 text-white'
      : 'hover:bg-gray-100 text-gray-900',
  };

  const handleSelectChain = (chainId: number) => {
    switchChain(chainId);
    setIsOpen(false);
  };

  const selectedChain = chains.find(c => c.id === chainId) || chains[0];

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-1 p-2 rounded-lg transition-colors ${themeClasses.button}`}
          aria-label="Select network"
        >
          <span>{selectedChain?.icon || '🌐'}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className={`absolute right-0 mt-1 w-40 rounded-lg shadow-lg ${themeClasses.dropdown} border z-20`}>
              {chains.map((chainOption) => (
                <button
                  key={chainOption.id}
                  onClick={() => handleSelectChain(chainOption.id)}
                  className={`flex items-center justify-between w-full px-4 py-2 text-sm ${themeClasses.option} ${
                    chainId === chainOption.id ? 'font-bold bg-blue-50 dark:bg-blue-900/20' : ''
                  } first:rounded-t-lg last:rounded-b-lg`}
                >
                  <div className="flex items-center space-x-2">
                    <span>{chainOption.icon}</span>
                    <span>{chainOption.name}</span>
                  </div>
                  {chainId === chainOption.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${themeClasses.button}`}
      >
        <span>{selectedChain?.icon || '🌐'}</span>
        <span>{selectedChain?.name || 'Select Network'}</span>
        <ChevronDown className="w-4 h-4 ml-1" />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className={`absolute right-0 mt-1 w-48 rounded-lg shadow-lg ${themeClasses.dropdown} border z-20`}>
            {chains.map((chainOption) => (
              <button
                key={chainOption.id}
                onClick={() => handleSelectChain(chainOption.id)}
                className={`flex items-center justify-between w-full px-4 py-3 text-sm ${themeClasses.option} ${
                  chainId === chainOption.id ? 'font-bold bg-blue-50 dark:bg-blue-900/20' : ''
                } first:rounded-t-lg last:rounded-b-lg`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{chainOption.icon}</span>
                  <span>{chainOption.name}</span>
                </div>
                {chainId === chainOption.id && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
