import React, { useState } from 'react';
import { Bell, X, Clock, TrendingUp, Trophy, CheckCircle } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificationCenterProps {
  isBrandTheme?: boolean;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isBrandTheme = false
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const themeClasses = {
    cardBg: isBrandTheme ? 'bg-gray-800' : 'bg-white',
    text: isBrandTheme ? 'text-white' : 'text-gray-900',
    textSecondary: isBrandTheme ? 'text-gray-300' : 'text-gray-600',
    border: isBrandTheme ? 'border-gray-700' : 'border-gray-200',
    hover: isBrandTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'market_created':
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'market_ending':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'market_resolved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'bet_placed':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'winnings_available':
        return <Trophy className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTime = (date: Date) => {
    return formatDistanceToNow(date, { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 ${isBrandTheme ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700`}
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className={`absolute right-0 top-full mt-2 w-96 ${themeClasses.cardBg} rounded-2xl shadow-xl border ${themeClasses.border} z-50 max-h-96 overflow-hidden`}>
            <div className={`p-4 border-b ${themeClasses.border}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${themeClasses.text}`}>
                  Notificações
                </h3>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className={`p-1 ${isBrandTheme ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className={`w-12 h-12 ${isBrandTheme ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-3`} />
                  <p className={`${themeClasses.textSecondary}`}>Nenhuma notificação</p>
                  <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>
                    Você será notificado sobre novos mercados e resultados
                  </p>
                </div>
              ) : (
                <div className={`divide-y ${isBrandTheme ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 ${themeClasses.hover} transition-colors cursor-pointer ${
                        !notification.read ? `${isBrandTheme ? 'bg-blue-900/20 border-l-4 border-l-blue-500' : 'bg-blue-50 border-l-4 border-l-blue-500'}` : ''
                      }`}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id);
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${themeClasses.text}`}>
                            {notification.title}
                          </p>
                          <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
                            {notification.message}
                          </p>
                          <p className={`text-xs ${isBrandTheme ? 'text-gray-500' : 'text-gray-400'} mt-2`}>
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
