import React from 'react';
import { X, Wallet, Shield, Zap } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';

interface WalletRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  isBrandTheme?: boolean;
  action?: string;
}

export const WalletRequiredModal: React.FC<WalletRequiredModalProps> = ({
  isOpen,
  onClose,
  isBrandTheme = false,
  action = 'fazer previsões'
}) => {
  const { connectWallet } = useWeb3();

  if (!isOpen) return null;

  const themeClasses = {
    bg: isBrandTheme ? 'bg-gray-900' : 'bg-white',
    text: isBrandTheme ? 'text-white' : 'text-gray-900',
    textSecondary: isBrandTheme ? 'text-gray-300' : 'text-gray-600',
    border: isBrandTheme ? 'border-gray-700' : 'border-gray-200',
  };

  const handleConnectWallet = async () => {
    await connectWallet();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className={`${themeClasses.bg} rounded-2xl shadow-xl border ${themeClasses.border} max-w-md w-full`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${themeClasses.text}`}>
                Carteira Necessária
              </h2>
              <button
                onClick={onClose}
                className={`p-2 ${themeClasses.textSecondary} hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-10 h-10 text-white" />
              </div>
              
              <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>
                Conecte sua carteira para {action}
              </h3>
              
              <p className={`${themeClasses.textSecondary} leading-relaxed`}>
                Para garantir segurança e transparência, você precisa conectar uma carteira Web3 
                para participar dos mercados preditivos.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className={`font-medium ${themeClasses.text}`}>100% Seguro</div>
                  <div className={`text-sm ${themeClasses.textSecondary}`}>
                    Seus fundos ficam sempre sob seu controle
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className={`font-medium ${themeClasses.text}`}>Conexão Rápida</div>
                  <div className={`text-sm ${themeClasses.textSecondary}`}>
                    MetaMask, Trust Wallet, WalletConnect e mais
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleConnectWallet}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-colors shadow-lg"
              >
                Conectar Carteira
              </button>
              
              <button
                onClick={onClose}
                className={`w-full py-3 px-6 rounded-xl font-medium transition-colors ${isBrandTheme ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};