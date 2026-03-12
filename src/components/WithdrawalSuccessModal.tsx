import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ExternalLink } from 'lucide-react';
import { useTranslation } from '../i18n';

interface WithdrawalSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  transactionHash?: string;
  isBrandTheme: boolean;
}

export const WithdrawalSuccessModal: React.FC<WithdrawalSuccessModalProps> = ({
  isOpen,
  onClose,
  amount,
  transactionHash,
  isBrandTheme
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  const themeClasses = {
    bg: isBrandTheme ? 'bg-gray-900' : 'bg-white',
    text: isBrandTheme ? 'text-white' : 'text-gray-900',
    textSecondary: isBrandTheme ? 'text-gray-300' : 'text-gray-600',
    border: isBrandTheme ? 'border-gray-700' : 'border-gray-200',
  };

  const getExplorerUrl = (hash: string) => {
    // Default to Polygon
    return `https://polygonscan.com/tx/${hash}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`${themeClasses.bg} rounded-2xl shadow-xl border ${themeClasses.border} max-w-md w-full`}>
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <h2 className={`text-2xl font-bold ${themeClasses.text} mb-2`}>
              {t('withdrawal.success')}
            </h2>
            
            <p className={`${themeClasses.textSecondary} mb-4`}>
              {t('withdrawal.amount')} <span className="font-bold text-green-600">${amount.toFixed(2)}</span> USDT
            </p>
            
            {transactionHash && (
              <a 
                href={getExplorerUrl(transactionHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-1 text-blue-600 hover:text-blue-700 text-sm mb-6"
              >
                <span>{t('withdrawal.viewTransaction')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={() => {
                navigate('/my-predictions');
                onClose();
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              {t('withdrawal.viewPredictions')}
            </button>
            
            <button
              onClick={onClose}
              className={`py-3 px-6 rounded-xl font-medium transition-colors ${isBrandTheme ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              {t('withdrawal.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};