// Configurações da API
export const API_CONFIG = {
  // URL base da API
  BASE_URL: `${(import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '')}/api`,
  
  // Timeout para requisições (em ms)
  TIMEOUT: 10000,
  
  // Número de tentativas para requisições
  RETRY_ATTEMPTS: 3,
  
  // Intervalo entre tentativas (em ms)
  RETRY_DELAY: 1000,
  
  // Headers padrão
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // Endpoints
  ENDPOINTS: {
    // Mercados
    MARKETS: '/markets',
    MARKET_DETAIL: (id: string) => `/markets/${id}`,
    MARKET_HISTORY: (id: string) => `/markets/${id}/history`,
    MARKET_BETS: () => '/positions',
    MARKET_POSITIONS: (id: string) => `/positions/market/${id}`,
    MARKET_RESOLVE: (id: string) => `/markets/${id}/resolve`,
    
    // IA
    AI_GENERATE: '/ai/generate-market',
    AI_PENDING: '/ai/pending-markets',
    AI_SOURCES: '/ai/sources',
    AI_TOGGLE: '/ai/toggle',
    
    // Estatísticas
    STATS: '/admin/stats',
    ADMIN_FINANCIAL: '/finance/overview',
    FINANCE_REVENUE: '/finance/revenue',
    FINANCE_EXPORT: '/finance/export',
    
    // Autenticação
    AUTH_NONCE: '/auth/nonce',
    AUTH_VERIFY_WALLET: '/auth/verify-wallet',
    AUTH_LINK_WALLET: '/auth/link-wallet',
    
    // Usuário
    USER_PROFILE: '/users/me',
    USER_BETS: '/positions/my',
    USER_STATS: '/users/me/stats',
    USER_LEADERBOARD: '/users/leaderboard',

    // Notificações
    NOTIFICATIONS: '/notifications',
    NOTIFICATION_READ: (id: string) => `/notifications/${id}/read`,
    NOTIFICATION_READ_ALL: '/notifications/read-all',
  }
};

// Função para obter URL completa
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Função para obter token de autenticação
export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Função para configurar headers com autenticação
export const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    ...API_CONFIG.DEFAULT_HEADERS,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};
