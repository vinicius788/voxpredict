import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, CheckCircle, XCircle, Clock, AlertTriangle, 
  Zap, Database, TrendingUp, RefreshCw, Settings, Shield
} from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useOracleIntegration } from '../hooks/useOracleIntegration';

export const OracleDashboard: React.FC = () => {
  const navigate = useNavigate();
  const isBrandTheme = true;
  const { isAdmin, adminEmail } = useAdminAccess();
  const { 
    pendingMarkets, 
    resolvedMarkets, 
    isProcessing, 
    resolveAllMarkets,
    getOracleStats 
  } = useOracleIntegration();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'manage' | 'sources' | 'history'>('overview');

  const stats = getOracleStats();

  const themeClasses = {
    bg: isBrandTheme ? 'bg-gray-900' : 'bg-gray-50',
    cardBg: isBrandTheme ? 'bg-gray-800' : 'bg-white',
    text: isBrandTheme ? 'text-white' : 'text-gray-900',
    textSecondary: isBrandTheme ? 'text-gray-300' : 'text-gray-600',
    border: isBrandTheme ? 'border-gray-700' : 'border-gray-200',
  };

  // Admin verification
  if (!isAdmin) {
    return (
      <div className={`min-h-screen ${themeClasses.bg}`}>
        <Header />
        
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className={`${themeClasses.cardBg} rounded-2xl shadow-xl border ${themeClasses.border} p-8 text-center max-w-md`}>
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className={`text-xl font-bold ${themeClasses.text} mb-2`}>
              Restricted Access
            </h2>
            <p className={`${themeClasses.textSecondary} mb-6`}>
              The Oracle is accessible only to administrators.
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

  const handleResolveAll = async () => {
    const resolved = await resolveAllMarkets();
    console.log(`${resolved} markets automatically resolved`);
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg}`}>
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header of the Oracle */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${themeClasses.text}`}>
                 Automatic Oracle
              </h1>
              <p className={`${themeClasses.textSecondary}`}>
                Automatic resolution system based on trusted public data - {adminEmail}
              </p>
            </div>
          </div>

          {/* Admin Verification */}
          <div className={`${isBrandTheme ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'} rounded-xl p-4 border`}>
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                 Active Oracle - Automatic Resolution Enabled
              </span>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
              System connected to trusted data sources for automatic market resolution
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeClasses.textSecondary} mb-1`}>Pending Markets</p>
                <p className={`text-3xl font-bold ${themeClasses.text}`}>{pendingMarkets.length}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeClasses.textSecondary} mb-1`}>Auto Resolved</p>
                <p className={`text-3xl font-bold ${themeClasses.text}`}>{stats.totalResolved}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeClasses.textSecondary} mb-1`}>Average Confidence</p>
                <p className={`text-3xl font-bold ${themeClasses.text}`}>{stats.averageConfidence.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeClasses.textSecondary} mb-1`}>Success Rate</p>
                <p className={`text-3xl font-bold ${themeClasses.text}`}>{stats.successRate.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex space-x-1 ${isBrandTheme ? 'bg-gray-700' : 'bg-gray-100'} rounded-xl p-1 mb-8`}>
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'manage', label: 'Manage', icon: Brain },
            { id: 'sources', label: 'Sources', icon: Database },
            { id: 'history', label: 'History', icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? `${themeClasses.cardBg} ${themeClasses.text} shadow-sm`
                    : `${themeClasses.textSecondary} hover:text-purple-600`
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${themeClasses.text}`}>
                  Quick Actions
                </h2>
                
                <button
                  onClick={handleResolveAll}
                  disabled={isProcessing || pendingMarkets.length === 0}
                  className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Resolve Expired ({pendingMarkets.length})</span>
                    </>
                  )}
                </button>
              </div>

              {/* Important Warning */}
              <div className={`${isBrandTheme ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'} rounded-xl p-4 border mb-4`}>
                <div className="flex items-start space-x-2">
                  <Shield className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-amber-800 dark:text-amber-300">
                       Active Temporal Protection
                    </div>
                    <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      The oracle can only resolve markets that have already expired. Active markets are protected against premature resolution.
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Sources Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries({
                  'coingecko': true,
                  'coinmarketcap': true,
                  'newsapi': false,
                  'sportsapi': true
                }).map(([source, status]) => (
                  <div key={source} className={`flex items-center space-x-2 p-3 rounded-lg ${isBrandTheme ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={`text-sm ${themeClasses.text} capitalize`}>{source}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
              <h2 className={`text-xl font-semibold ${themeClasses.text} mb-6`}>
                Recent Resolutions
              </h2>
              
              {Object.keys(resolvedMarkets).length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className={`w-16 h-16 ${themeClasses.textSecondary} mx-auto mb-4`} />
                  <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>
                    All markets resolved!
                  </h3>
                  <p className={`${themeClasses.textSecondary}`}>
                    No markets pending for automatic resolution.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(resolvedMarkets).slice(0, 5).map(([marketId, result]) => (
                    <div key={marketId} className={`flex items-center space-x-4 p-4 ${isBrandTheme ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl`}>
                      <div className="flex-shrink-0">
                        {result.result === 'SIM' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${themeClasses.text}`}>
                          Market resolved: {result.result}
                        </p>
                        <p className={`text-sm ${themeClasses.textSecondary}`}>
                          {result.reasoning}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${themeClasses.text}`}>
                          {result.confidence}% confidence
                        </p>
                        <p className={`text-xs ${themeClasses.textSecondary}`}>
                          {result.timestamp.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
            <h2 className={`text-xl font-semibold ${themeClasses.text} mb-6`}>
              Manage Oracle
            </h2>
            <div className="text-center py-8">
              <Brain className={`w-16 h-16 ${themeClasses.textSecondary} mx-auto mb-4`} />
              <p className={`${themeClasses.textSecondary}`}>
                Oracle management panel in development...
              </p>
            </div>
          </div>
        )}

        {activeTab === 'sources' && (
          <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
            <h2 className={`text-xl font-semibold ${themeClasses.text} mb-6`}>
              Data Sources
            </h2>
            <div className="text-center py-8">
              <Database className={`w-16 h-16 ${themeClasses.textSecondary} mx-auto mb-4`} />
              <p className={`${themeClasses.textSecondary}`}>
                Sources panel in development...
              </p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
            <h2 className={`text-xl font-semibold ${themeClasses.text} mb-6`}>
              Resolution History
            </h2>
            <div className="text-center py-8">
              <Clock className={`w-16 h-16 ${themeClasses.textSecondary} mx-auto mb-4`} />
              <p className={`${themeClasses.textSecondary}`}>
                Detailed history in development...
              </p>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};
