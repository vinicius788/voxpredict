import React from 'react';
import { User } from '../types';
import { Trophy, Target, DollarSign, TrendingUp, Star, X } from 'lucide-react';

interface UserProfileProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  isBrandTheme?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, isOpen, onClose, isBrandTheme = false }) => {
  if (!isOpen) return null;

  const themeClasses = {
    bg: isBrandTheme ? 'bg-gray-900' : 'bg-white',
    text: isBrandTheme ? 'text-white' : 'text-gray-900',
    textSecondary: isBrandTheme ? 'text-gray-300' : 'text-gray-600',
    border: isBrandTheme ? 'border-gray-700' : 'border-gray-200',
    hover: isBrandTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 w-96 ${themeClasses.bg} shadow-xl z-50 overflow-y-auto`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-bold ${themeClasses.text}`}>Perfil do Usuário</h2>
            <button
              onClick={onClose}
              className={`p-2 ${themeClasses.textSecondary} ${themeClasses.hover} rounded-lg`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <h3 className={`text-lg font-semibold ${themeClasses.text} mb-1`}>
              {user.username || 'Usuário Anônimo'}
            </h3>
            <p className={`text-sm ${themeClasses.textSecondary} font-mono`}>
              {user.address.slice(0, 6)}...{user.address.slice(-4)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className={`${isBrandTheme ? 'bg-green-900/20' : 'bg-green-50'} rounded-xl p-4 text-center`}>
              <Target className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-sm text-green-600 font-medium">Assertividade</div>
              <div className={`text-2xl font-bold ${isBrandTheme ? 'text-green-300' : 'text-green-900'}`}>
                {user.successRate.toFixed(1)}%
              </div>
            </div>

            <div className={`${isBrandTheme ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-xl p-4 text-center`}>
              <DollarSign className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-sm text-blue-600 font-medium">Volume Total</div>
              <div className={`text-2xl font-bold ${isBrandTheme ? 'text-blue-300' : 'text-blue-900'}`}>
                ${user.totalVolume.toLocaleString()}
              </div>
            </div>

            <div className={`${isBrandTheme ? 'bg-purple-900/20' : 'bg-purple-50'} rounded-xl p-4 text-center`}>
              <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <div className="text-sm text-purple-600 font-medium">ROI</div>
              <div className={`text-2xl font-bold ${isBrandTheme ? 'text-purple-300' : 'text-purple-900'}`}>
                +{user.roi.toFixed(1)}%
              </div>
            </div>

            <div className={`${isBrandTheme ? 'bg-amber-900/20' : 'bg-amber-50'} rounded-xl p-4 text-center`}>
              <Star className="w-6 h-6 text-amber-600 mx-auto mb-2" />
              <div className="text-sm text-amber-600 font-medium">Previsões</div>
              <div className={`text-2xl font-bold ${isBrandTheme ? 'text-amber-300' : 'text-amber-900'}`}>
                {user.totalPredictions}
              </div>
            </div>
          </div>

          <div className={`${isBrandTheme ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-700' : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'} rounded-xl p-4 border`}>
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <span className={`text-sm font-medium ${isBrandTheme ? 'text-blue-300' : 'text-blue-800'}`}>Conta Verificada</span>
            </div>
            <p className={`text-sm ${isBrandTheme ? 'text-blue-400' : 'text-blue-700'}`}>
               Protegido por Blockchain<br />
               Plataforma Descentralizada<br />
               Foco América Latina
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
