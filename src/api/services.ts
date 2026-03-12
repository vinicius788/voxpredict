import { api } from './client';
import { API_CONFIG } from './config';

// Serviço de Mercados
export const MarketsService = {
  // Obter todos os mercados
  getAll: () => api.get(API_CONFIG.ENDPOINTS.MARKETS),
  
  // Obter detalhes de um mercado
  getById: (id: string) => api.get(API_CONFIG.ENDPOINTS.MARKET_DETAIL(id)),
  getHistory: (id: string, period: string) => api.get(API_CONFIG.ENDPOINTS.MARKET_HISTORY(id), { period }),
  
  // Fazer uma aposta
  placeBet: (marketId: string, side: 'YES' | 'NO', amount: number, token: string, txHash: string) => 
    api.post(API_CONFIG.ENDPOINTS.MARKET_BETS(), { marketId: Number(marketId), side, amount, token, txHash }),
  
  // Resolver mercado (admin)
  resolve: (marketId: string, outcome: 'YES' | 'NO' | 'CANCELLED') =>
    api.post(API_CONFIG.ENDPOINTS.MARKET_RESOLVE(marketId), { outcome }),
  
  // Criar mercado (admin)
  create: (marketData: any) => api.post(API_CONFIG.ENDPOINTS.MARKETS, marketData)
};

// Serviço de IA
export const AIService = {
  // Gerar mercado com IA
  generateMarket: (noticia: string, dataEncerramento: string) => 
    api.post(API_CONFIG.ENDPOINTS.AI_GENERATE, { noticia, dataEncerramento }),
  
  // Obter mercados pendentes
  getPendingMarkets: () => api.get(API_CONFIG.ENDPOINTS.AI_PENDING),
  
  // Aprovar mercado pendente
  approvePendingMarket: (marketId: string) => 
    api.post(`${API_CONFIG.ENDPOINTS.AI_PENDING}/${marketId}/approve`),
  
  // Rejeitar mercado pendente
  rejectPendingMarket: (marketId: string) => 
    api.delete(`${API_CONFIG.ENDPOINTS.AI_PENDING}/${marketId}`),
  
  // Obter fontes de notícias
  getSources: () => api.get(API_CONFIG.ENDPOINTS.AI_SOURCES),
  
  // Adicionar fonte de notícias
  addSource: (name: string, url: string, category: string) => 
    api.post(API_CONFIG.ENDPOINTS.AI_SOURCES, { name, url, category }),
  
  // Ativar/desativar IA
  toggleAI: (active: boolean) => api.post(API_CONFIG.ENDPOINTS.AI_TOGGLE, { active })
};

// Serviço de Estatísticas
export const StatsService = {
  // Obter estatísticas gerais
  getStats: () => api.get(API_CONFIG.ENDPOINTS.STATS),
  
  // Obter dados financeiros (admin)
  getFinancialData: () => api.get(API_CONFIG.ENDPOINTS.ADMIN_FINANCIAL),
  getRevenueSeries: (period = '30d') => api.get(API_CONFIG.ENDPOINTS.FINANCE_REVENUE, { period }),
  exportFinanceCsv: () => api.get(API_CONFIG.ENDPOINTS.FINANCE_EXPORT),
};

// Serviço de Usuário
export const UserService = {
  // Obter perfil do usuário
  getProfile: () => api.get(API_CONFIG.ENDPOINTS.USER_PROFILE),
  
  // Obter apostas do usuário
  getBets: () => api.get(API_CONFIG.ENDPOINTS.USER_BETS),
  
  // Obter estatísticas do usuário
  getStats: () => api.get(API_CONFIG.ENDPOINTS.USER_STATS),
  getLeaderboard: () => api.get(API_CONFIG.ENDPOINTS.USER_LEADERBOARD),
};

export const NotificationsService = {
  getAll: () => api.get(API_CONFIG.ENDPOINTS.NOTIFICATIONS),
  markRead: (id: string) => api.put(API_CONFIG.ENDPOINTS.NOTIFICATION_READ(id)),
  markAllRead: () => api.put(API_CONFIG.ENDPOINTS.NOTIFICATION_READ_ALL),
};
