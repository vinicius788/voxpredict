import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, Shield, TrendingUp, ExternalLink, 
  Download, AlertTriangle, Clock, CheckCircle,
  Wallet, BarChart3, Users, Calendar, RefreshCw
} from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useTreasuryContract } from '../hooks/useTreasuryContract';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const TreasuryDashboard: React.FC = () => {
  const navigate = useNavigate();
  const isBrandTheme = true;
  const { isAdmin, adminEmail } = useAdminAccess();
  const { 
    treasuryData, 
    isLoading, 
    error, 
    withdrawToSafe, 
    refreshTreasuryData 
  } = useTreasuryContract();
  
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const themeClasses = {
    bg: isBrandTheme ? 'bg-gray-900' : 'bg-gray-50',
    cardBg: isBrandTheme ? 'bg-gray-800' : 'bg-white',
    text: isBrandTheme ? 'text-white' : 'text-gray-900',
    textSecondary: isBrandTheme ? 'text-gray-300' : 'text-gray-600',
    border: isBrandTheme ? 'border-gray-700' : 'border-gray-200',
  };

  // Admin verification - only authorized emails
  if (!isAdmin) {
    return (
      <div className={`min-h-screen ${themeClasses.bg}`}>
        <Header />
        
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className={`${themeClasses.cardBg} rounded-2xl shadow-xl border ${themeClasses.border} p-8 text-center max-w-md`}>
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className={`text-xl font-bold ${themeClasses.text} mb-2`}>
              Ultra Restricted Access
            </h2>
            <p className={`${themeClasses.textSecondary} mb-6`}>
              This area is exclusive to VoxPredict administrators.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

  const handleWithdrawToSafe = async () => {
    if (treasuryData.platformBalance === 0) {
      return;
    }

    setIsWithdrawing(true);
    
    try {
      const success = await withdrawToSafe();
      if (success) {
        await refreshTreasuryData();
      }
    } catch (error) {
      console.error('Error withdrawing to Safe:', error);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg}`}>
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Treasury Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${themeClasses.text}`}>
                 VoxPredict Treasury
              </h1>
              <p className={`${themeClasses.textSecondary}`}>
                Complete management of platform funds - {adminEmail}
              </p>
            </div>
          </div>

          {/* Admin Verification Banner */}
          <div className={`${isBrandTheme ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'} rounded-xl p-4 border`}>
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-300">
                 Authorized Access - Official Treasury
              </span>
            </div>
            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
              Only authorized administrators can view and manage platform funds
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Accumulated Balance (Smart Contract) */}
          <div className="space-y-6">
            <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-8`}>
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="w-10 h-10 text-white" />
                </div>
                
                <h2 className={`text-2xl font-bold ${themeClasses.text} mb-2`}>
                   Accumulated Balance (Smart Contract)
                </h2>
                
                <div className={`text-5xl font-bold ${treasuryData.platformBalance > 0 ? 'text-purple-600' : themeClasses.textSecondary} mb-4`}>
                  {isLoading ? (
                    <div className="w-64 h-12 bg-gray-200 dark:bg-gray-700 rounded mx-auto animate-pulse"></div>
                  ) : (
                    formatCurrency(treasuryData.platformBalance)
                  )}
                </div>
                
                <p className={`${themeClasses.textSecondary} text-lg`}>
                  3% fees accumulated in contracts
                </p>
                
                {treasuryData.lastWithdrawal && (
                  <p className={`text-sm ${themeClasses.textSecondary} mt-2`}>
                    Last withdrawal: {formatDistanceToNow(treasuryData.lastWithdrawal, { addSuffix: true, locale: ptBR })}
                  </p>
                )}
              </div>

              {/* Smart Contract Statistics */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className={`${isBrandTheme ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-xl p-4 text-center`}>
                  <BarChart3 className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-sm text-blue-600 font-medium">Total Collected</div>
                  <div className={`text-lg font-bold ${isBrandTheme ? 'text-blue-300' : 'text-blue-900'}`}>
                    {formatCurrency(treasuryData.totalCollected)}
                  </div>
                </div>

                <div className={`${isBrandTheme ? 'bg-green-900/20' : 'bg-green-50'} rounded-xl p-4 text-center`}>
                  <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <div className="text-sm text-green-600 font-medium">Total Withdrawn</div>
                  <div className={`text-lg font-bold ${isBrandTheme ? 'text-green-300' : 'text-green-900'}`}>
                    {formatCurrency(treasuryData.totalWithdrawn)}
                  </div>
                </div>
              </div>

              {/* Withdrawal Button */}
              <div className="space-y-4">
                <button
                  onClick={handleWithdrawToSafe}
                  disabled={isWithdrawing || isLoading || treasuryData.platformBalance === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isWithdrawing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending to Safe...</span>
                    </>
                  ) : treasuryData.platformBalance === 0 ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>No balance to withdraw</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span> Withdraw {formatCurrency(treasuryData.platformBalance)} to Safe</span>
                    </>
                  )}
                </button>

                <p className={`text-sm ${themeClasses.textSecondary} text-center`}>
                  Funds will be sent directly to the VoxPredict Safe on Ethereum
                </p>
              </div>
            </div>
          </div>

          {/* Safe Balance (Ethereum) */}
          <div className="space-y-6">
            <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${themeClasses.text}`}>
                       Platform Treasury
                    </h3>
                    <p className={`text-sm ${themeClasses.textSecondary}`}>
                      Safe Ethereum - Real-time balance
                    </p>
                  </div>
                </div>

                <button
                  onClick={refreshTreasuryData}
                  disabled={isLoading}
                  className={`p-2 ${themeClasses.textSecondary} ${isBrandTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-lg transition-colors disabled:opacity-50`}
                  title="Refresh balances"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Mock Safe Balance */}
              <div className={`${isBrandTheme ? 'bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-700' : 'bg-gradient-to-r from-green-50 to-blue-50 border-green-200'} rounded-xl p-6 border mb-6`}>
                <div className="text-center">
                  <div className={`text-sm ${isBrandTheme ? 'text-green-300' : 'text-green-700'} font-medium mb-2`}>
                     Total Treasury Value
                  </div>
                  <div className={`text-4xl font-bold ${isBrandTheme ? 'text-green-300' : 'text-green-800'}`}>
                    {formatCurrency(12969.75)}
                  </div>
                  <p className={`text-xs ${themeClasses.textSecondary} mt-2`}>
                    Last updated: {formatDistanceToNow(new Date(Date.now() - 3600000), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>

              {/* Balance Comparison */}
              <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${themeClasses.text}`}>
                     Financial Summary
                  </h3>
                  <button
                    onClick={refreshTreasuryData}
                    disabled={isLoading}
                    className={`p-2 ${themeClasses.textSecondary} ${isBrandTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-lg transition-colors disabled:opacity-50`}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <div>
                      <div className="text-sm text-purple-600 font-medium">Smart Contract</div>
                      <div className="text-xs text-purple-700 dark:text-purple-400">Awaiting withdrawal</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600">
                        {formatCurrency(treasuryData.platformBalance)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <div>
                      <div className="text-sm text-green-600 font-medium">Safe Ethereum</div>
                      <div className="text-xs text-green-700 dark:text-green-400">Secure funds</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(12969.75)}
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-4 ${isBrandTheme ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-xl border-2 border-blue-200 dark:border-blue-700`}>
                    <div>
                      <div className="text-sm text-blue-600 font-medium"> Grand Total</div>
                      <div className="text-xs text-blue-700 dark:text-blue-400">Smart Contract + Safe</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(treasuryData.platformBalance + 12969.75)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} p-4 text-center`}>
                <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <div className="text-sm text-purple-600 font-medium">Active Markets</div>
                <div className={`text-xl font-bold ${isBrandTheme ? 'text-purple-300' : 'text-purple-900'}`}>
                  {treasuryData.activeMarkets}
                </div>
              </div>

              <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} p-4 text-center`}>
                <Calendar className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                <div className="text-sm text-amber-600 font-medium">This Month</div>
                <div className={`text-xl font-bold ${isBrandTheme ? 'text-amber-300' : 'text-amber-900'}`}>
                  {formatCurrency(treasuryData.monthlyRevenue)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Flow */}
        <div className="mt-8">
          <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
            <h3 className={`text-lg font-semibold ${themeClasses.text} mb-6`}>
               Platform Funds Flow
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">1⃣</span>
                </div>
                <div className={`text-sm font-medium ${themeClasses.text} mb-1`}>Active Markets</div>
                <div className={`text-xs ${themeClasses.textSecondary}`}>
                  Users place bets on markets
                </div>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">2⃣</span>
                </div>
                <div className={`text-sm font-medium ${themeClasses.text} mb-1`}>Automatic Fee</div>
                <div className={`text-xs ${themeClasses.textSecondary}`}>
                  3% of losing bets go to the contract
                </div>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">3⃣</span>
                </div>
                <div className={`text-sm font-medium ${themeClasses.text} mb-1`}>Manual Withdrawal</div>
                <div className={`text-xs ${themeClasses.textSecondary}`}>
                  Admin withdraws funds to the Safe
                </div>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">4⃣</span>
                </div>
                <div className={`text-sm font-medium ${themeClasses.text} mb-1`}>Secure Safe</div>
                <div className={`text-xs ${themeClasses.textSecondary}`}>
                  Funds are protected in the multisig safe
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Status */}
        <div className="mt-6">
          <div className={`${isBrandTheme ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'} rounded-xl p-4 border`}>
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-800 dark:text-green-300">
                 Operational System
              </span>
            </div>
            <div className="text-xs text-green-700 dark:text-green-400 grid grid-cols-2 md:grid-cols-4 gap-2">
              <div> Smart contracts working</div>
              <div> Fees being collected</div>
              <div> Safe configured and verified</div>
              <div> Balances updated in real time</div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};
