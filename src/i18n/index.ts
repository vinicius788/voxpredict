// Simple internationalization system
import { useState } from 'react';

// Available languages
export type Language = 'pt-BR' | 'en-US' | 'es-ES';

// Default language
const DEFAULT_LANGUAGE: Language = 'pt-BR';

// Get browser language
const getBrowserLanguage = (): Language => {
  const browserLang = navigator.language;
  
  if (browserLang.startsWith('pt')) return 'pt-BR';
  if (browserLang.startsWith('es')) return 'es-ES';
  
  return 'en-US';
};

// Get user preferred language from localStorage or browser
const getUserLanguage = (): Language => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  
  const savedLang = localStorage.getItem('voxpredict-language') as Language;
  return savedLang || getBrowserLanguage();
};

// Save user language preference
const saveUserLanguage = (lang: Language): void => {
  localStorage.setItem('voxpredict-language', lang);
};

// Translation dictionaries
export const translations = {
  'pt-BR': {
    // Common
    'app.name': 'VoxPredict',
    'app.tagline': 'Mercados Preditivos Descentralizados',
    
    // Navigation
    'nav.home': 'Início',
    'nav.dashboard': 'Dashboard',
    'nav.markets': 'Mercados',
    'nav.wallet': 'Carteira',
    'nav.profile': 'Perfil',
    
    // Auth
    'auth.signin': 'Entrar',
    'auth.signup': 'Criar Conta',
    'auth.connect': 'Conectar Carteira',
    'auth.logout': 'Sair',
    
    // Markets
    'markets.all': 'Todos os Mercados',
    'markets.active': 'Mercados Ativos',
    'markets.resolved': 'Mercados Resolvidos',
    'markets.my': 'Meus Mercados',
    'markets.search': 'Buscar mercados...',
    'markets.filter': 'Filtrar',
    'markets.sort': 'Ordenar',
    'markets.create': 'Criar Mercado',
    
    // Categories
    'category.politics': 'Política',
    'category.crypto': 'Cripto',
    'category.sports': 'Esportes',
    'category.economy': 'Economia',
    'category.entertainment': 'Entretenimento',
    'category.technology': 'Tecnologia',
    
    // Market Details
    'market.volume': 'Volume',
    'market.participants': 'Participantes',
    'market.endDate': 'Encerra em',
    'market.favorite': 'Favorito',
    'market.odds': 'Odds',
    'market.probability': 'Probabilidade',
    'market.yes': 'SIM',
    'market.no': 'NÃO',
    'market.predict': 'Fazer Previsão',
    'market.amount': 'Valor da aposta (USDT)',
    'market.potential': 'Ganho potencial',
    'market.processing': 'Processando...',
    'market.resolved': 'Mercado Resolvido',
    'market.result': 'Resultado',
    'market.withdraw': 'Sacar Ganhos',
    'market.congrats': 'Parabéns! Você acertou!',
    'market.sorry': 'Infelizmente você não acertou desta vez.',
    
    // Wallet
    'wallet.connect': 'Conectar Carteira',
    'wallet.balance': 'Saldo',
    'wallet.deposit': 'Depositar',
    'wallet.withdraw': 'Sacar',
    'wallet.available': 'Disponível',
    'wallet.locked': 'Travado',
    
    // Dashboard
    'dashboard.predictions': 'Previsões Ativas',
    'dashboard.history': 'Histórico',
    'dashboard.stats': 'Estatísticas',
    'dashboard.winRate': 'Taxa de Acerto',
    'dashboard.totalBet': 'Total Apostado',
    'dashboard.totalWon': 'Total Ganho',
    
    // Errors
    'error.walletRequired': 'Conecte sua carteira primeiro',
    'error.insufficientFunds': 'Saldo insuficiente',
    'error.minAmount': 'Valor mínimo: $5 USDT',
    'error.selectOption': 'Selecione uma opção',
    'error.transactionFailed': 'Transação falhou',
    
    // Success
    'success.betPlaced': 'Previsão realizada com sucesso!',
    'success.withdrawn': 'Saque realizado com sucesso!',
    'success.deposited': 'Depósito realizado com sucesso!',
    
    // Footer
    'footer.about': 'Sobre Nós',
    'footer.terms': 'Termos de Uso',
    'footer.privacy': 'Privacidade',
    'footer.contact': 'Contato',
    'footer.copyright': '© 2025 VoxPredict. Todos os direitos reservados.',
  },
  
  'en-US': {
    // Common
    'app.name': 'VoxPredict',
    'app.tagline': 'Decentralized Prediction Markets',
    
    // Navigation
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.markets': 'Markets',
    'nav.wallet': 'Wallet',
    'nav.profile': 'Profile',
    
    // Auth
    'auth.signin': 'Sign In',
    'auth.signup': 'Sign Up',
    'auth.connect': 'Connect Wallet',
    'auth.logout': 'Logout',
    
    // Markets
    'markets.all': 'All Markets',
    'markets.active': 'Active Markets',
    'markets.resolved': 'Resolved Markets',
    'markets.my': 'My Markets',
    'markets.search': 'Search markets...',
    'markets.filter': 'Filter',
    'markets.sort': 'Sort',
    'markets.create': 'Create Market',
    
    // Categories
    'category.politics': 'Politics',
    'category.crypto': 'Crypto',
    'category.sports': 'Sports',
    'category.economy': 'Economy',
    'category.entertainment': 'Entertainment',
    'category.technology': 'Technology',
    
    // Market Details
    'market.volume': 'Volume',
    'market.participants': 'Participants',
    'market.endDate': 'Ends on',
    'market.favorite': 'Favorite',
    'market.odds': 'Odds',
    'market.probability': 'Probability',
    'market.yes': 'YES',
    'market.no': 'NO',
    'market.predict': 'Make Prediction',
    'market.amount': 'Bet amount (USDT)',
    'market.potential': 'Potential winnings',
    'market.processing': 'Processing...',
    'market.resolved': 'Market Resolved',
    'market.result': 'Result',
    'market.withdraw': 'Withdraw Winnings',
    'market.congrats': 'Congratulations! You won!',
    'market.sorry': 'Sorry, you didn\'t win this time.',
    
    // Wallet
    'wallet.connect': 'Connect Wallet',
    'wallet.balance': 'Balance',
    'wallet.deposit': 'Deposit',
    'wallet.withdraw': 'Withdraw',
    'wallet.available': 'Available',
    'wallet.locked': 'Locked',
    
    // Dashboard
    'dashboard.predictions': 'Active Predictions',
    'dashboard.history': 'History',
    'dashboard.stats': 'Statistics',
    'dashboard.winRate': 'Win Rate',
    'dashboard.totalBet': 'Total Bet',
    'dashboard.totalWon': 'Total Won',
    
    // Errors
    'error.walletRequired': 'Connect your wallet first',
    'error.insufficientFunds': 'Insufficient funds',
    'error.minAmount': 'Minimum amount: $5 USDT',
    'error.selectOption': 'Select an option',
    'error.transactionFailed': 'Transaction failed',
    
    // Success
    'success.betPlaced': 'Prediction placed successfully!',
    'success.withdrawn': 'Withdrawal successful!',
    'success.deposited': 'Deposit successful!',
    
    // Footer
    'footer.about': 'About Us',
    'footer.terms': 'Terms of Use',
    'footer.privacy': 'Privacy',
    'footer.contact': 'Contact',
    'footer.copyright': '© 2025 VoxPredict. All rights reserved.',
  },
  
  'es-ES': {
    // Common
    'app.name': 'VoxPredict',
    'app.tagline': 'Mercados Predictivos Descentralizados',
    
    // Navigation
    'nav.home': 'Inicio',
    'nav.dashboard': 'Panel',
    'nav.markets': 'Mercados',
    'nav.wallet': 'Billetera',
    'nav.profile': 'Perfil',
    
    // Auth
    'auth.signin': 'Iniciar Sesión',
    'auth.signup': 'Registrarse',
    'auth.connect': 'Conectar Billetera',
    'auth.logout': 'Cerrar Sesión',
    
    // Markets
    'markets.all': 'Todos los Mercados',
    'markets.active': 'Mercados Activos',
    'markets.resolved': 'Mercados Resueltos',
    'markets.my': 'Mis Mercados',
    'markets.search': 'Buscar mercados...',
    'markets.filter': 'Filtrar',
    'markets.sort': 'Ordenar',
    'markets.create': 'Crear Mercado',
    
    // Categories
    'category.politics': 'Política',
    'category.crypto': 'Cripto',
    'category.sports': 'Deportes',
    'category.economy': 'Economía',
    'category.entertainment': 'Entretenimiento',
    'category.technology': 'Tecnología',
    
    // Market Details
    'market.volume': 'Volumen',
    'market.participants': 'Participantes',
    'market.endDate': 'Finaliza el',
    'market.favorite': 'Favorito',
    'market.odds': 'Cuotas',
    'market.probability': 'Probabilidad',
    'market.yes': 'SÍ',
    'market.no': 'NO',
    'market.predict': 'Hacer Predicción',
    'market.amount': 'Cantidad de apuesta (USDT)',
    'market.potential': 'Ganancias potenciales',
    'market.processing': 'Procesando...',
    'market.resolved': 'Mercado Resuelto',
    'market.result': 'Resultado',
    'market.withdraw': 'Retirar Ganancias',
    'market.congrats': '¡Felicidades! ¡Has ganado!',
    'market.sorry': 'Lo siento, no has ganado esta vez.',
    
    // Wallet
    'wallet.connect': 'Conectar Billetera',
    'wallet.balance': 'Saldo',
    'wallet.deposit': 'Depositar',
    'wallet.withdraw': 'Retirar',
    'wallet.available': 'Disponible',
    'wallet.locked': 'Bloqueado',
    
    // Dashboard
    'dashboard.predictions': 'Predicciones Activas',
    'dashboard.history': 'Historial',
    'dashboard.stats': 'Estadísticas',
    'dashboard.winRate': 'Tasa de Acierto',
    'dashboard.totalBet': 'Total Apostado',
    'dashboard.totalWon': 'Total Ganado',
    
    // Errors
    'error.walletRequired': 'Conecta tu billetera primero',
    'error.insufficientFunds': 'Fondos insuficientes',
    'error.minAmount': 'Cantidad mínima: $5 USDT',
    'error.selectOption': 'Selecciona una opción',
    'error.transactionFailed': 'La transacción falló',
    
    // Success
    'success.betPlaced': '¡Predicción realizada con éxito!',
    'success.withdrawn': '¡Retiro exitoso!',
    'success.deposited': '¡Depósito exitoso!',
    
    // Footer
    'footer.about': 'Sobre Nosotros',
    'footer.terms': 'Términos de Uso',
    'footer.privacy': 'Privacidad',
    'footer.contact': 'Contacto',
    'footer.copyright': '© 2025 VoxPredict. Todos los derechos reservados.',
  }
};

// Hook for using translations
export const useTranslation = () => {
  const [language, setLanguage] = useState<Language>(getUserLanguage());

  // Set language and save preference
  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    saveUserLanguage(lang);
  };

  // Translation function
  const t = (key: string, params?: Record<string, string>): string => {
    const langDict = translations[language] || translations[DEFAULT_LANGUAGE];
    let text = langDict[key as keyof typeof langDict] || key;
    
    // Replace parameters if provided
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(`{{${param}}}`, value);
      });
    }
    
    return text;
  };

  // Format date according to current language
  const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    
    return dateObj.toLocaleDateString(language, options);
  };

  // Format number according to current language
  const formatNumber = (num: number, options?: Intl.NumberFormatOptions): string => {
    return num.toLocaleString(language, options);
  };

  // Format currency according to current language
  const formatCurrency = (amount: number): string => {
    return formatNumber(amount, { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return {
    language,
    changeLanguage,
    t,
    formatDate,
    formatNumber,
    formatCurrency,
    availableLanguages: ['pt-BR', 'en-US', 'es-ES'] as Language[]
  };
};