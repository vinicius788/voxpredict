import { Market, User, Notification } from '../types';

export const mockMarkets: Market[] = [
  // 🎯 1. POLÍTICA E GOVERNOS (Opacos e especulativos)
  {
    id: '1',
    title: 'Ministro da Fazenda Fernando Haddad vai cair até junho 2025?',
    description: 'Previsão sobre a permanência do atual Ministro da Fazenda no cargo até junho de 2025.',
    category: 'Política',
    endDate: '2025-06-30',
    createdAt: '2024-02-15',
    totalVolume: 89450,
    totalBettors: 234,
    simOdds: 2.45,
    naoOdds: 1.68,
    simProbability: 40.8,
    naoProbability: 59.2,
    status: 'active',
    tags: ['Haddad', 'Ministério', 'Governo']
  },
  {
    id: '2',
    title: 'Governo vai anunciar novo pacote econômico até março 2025?',
    description: 'Previsão sobre o anúncio de um novo pacote de medidas econômicas pelo governo federal.',
    category: 'Política',
    endDate: '2025-03-31',
    createdAt: '2024-02-10',
    totalVolume: 67890,
    totalBettors: 189,
    simOdds: 1.95,
    naoOdds: 2.05,
    simProbability: 51.3,
    naoProbability: 48.7,
    status: 'active',
    tags: ['Economia', 'Pacote', 'Governo']
  },
  {
    id: '3',
    title: 'Congresso vai aprovar reforma tributária até dezembro 2025?',
    description: 'Previsão sobre a aprovação final da reforma tributária pelo Congresso Nacional.',
    category: 'Política',
    endDate: '2025-12-31',
    createdAt: '2024-02-12',
    totalVolume: 156920,
    totalBettors: 445,
    simOdds: 1.75,
    naoOdds: 2.35,
    simProbability: 57.1,
    naoProbability: 42.9,
    status: 'active',
    tags: ['Reforma', 'Tributária', 'Congresso']
  },

  // 📉 2. INDICADORES ECONÔMICOS (Difíceis de prever)
  {
    id: '4',
    title: 'Inflação oficial do Brasil vai superar 6% em 2025?',
    description: 'Previsão sobre o IPCA acumulado em 12 meses ultrapassar 6% durante o ano de 2025.',
    category: 'Economia',
    endDate: '2025-12-31',
    createdAt: '2024-02-08',
    totalVolume: 98750,
    totalBettors: 312,
    simOdds: 2.80,
    naoOdds: 1.55,
    simProbability: 35.7,
    naoProbability: 64.3,
    status: 'active',
    tags: ['IPCA', 'Inflação', 'IBGE']
  },
  {
    id: '5',
    title: 'Taxa Selic vai cair abaixo de 9% até dezembro 2025?',
    description: 'Previsão sobre a taxa básica de juros brasileira ficar abaixo de 9% ao ano.',
    category: 'Economia',
    endDate: '2025-12-31',
    createdAt: '2024-02-14',
    totalVolume: 78450,
    totalBettors: 267,
    simOdds: 1.65,
    naoOdds: 2.55,
    simProbability: 60.6,
    naoProbability: 39.4,
    status: 'active',
    tags: ['Selic', 'Banco Central', 'Juros']
  },
  {
    id: '6',
    title: 'Dólar vai passar de R$ 6,00 até junho 2025?',
    description: 'Previsão sobre a cotação do dólar americano ultrapassar R$ 6,00 no mercado à vista.',
    category: 'Economia',
    endDate: '2025-06-30',
    createdAt: '2024-02-16',
    totalVolume: 134560,
    totalBettors: 389,
    simOdds: 2.15,
    naoOdds: 1.85,
    simProbability: 46.5,
    naoProbability: 53.5,
    status: 'active',
    tags: ['Dólar', 'Câmbio', 'Moeda']
  },

  // ₿ 3. CRIPTOMOEDAS & BLOCKCHAIN (Super especulativo)
  {
    id: '7',
    title: 'Bitcoin vai bater US$ 150k antes do halving de 2028?',
    description: 'Previsão sobre o Bitcoin atingir US$ 150.000 antes do próximo evento de halving.',
    category: 'Cripto',
    endDate: '2028-04-30',
    createdAt: '2024-02-18',
    totalVolume: 245680,
    totalBettors: 678,
    simOdds: 1.83,
    naoOdds: 2.20,
    simProbability: 54.6,
    naoProbability: 45.4,
    status: 'active',
    tags: ['Bitcoin', 'Halving', 'Preço']
  },
  {
    id: '8',
    title: 'Ethereum vai perder dominância para Solana em 2025?',
    description: 'Previsão sobre a Solana ultrapassar o Ethereum em market cap durante 2025.',
    category: 'Cripto',
    endDate: '2025-12-31',
    createdAt: '2024-02-20',
    totalVolume: 89340,
    totalBettors: 234,
    simOdds: 3.20,
    naoOdds: 1.40,
    simProbability: 31.3,
    naoProbability: 68.7,
    status: 'active',
    tags: ['Ethereum', 'Solana', 'Market Cap']
  },
  {
    id: '9',
    title: 'ETF spot de Ethereum será aprovado nos EUA até agosto 2025?',
    description: 'Previsão sobre a aprovação de um ETF spot de Ethereum pela SEC americana.',
    category: 'Cripto',
    endDate: '2025-08-31',
    createdAt: '2024-02-22',
    totalVolume: 67890,
    totalBettors: 198,
    simOdds: 2.10,
    naoOdds: 1.90,
    simProbability: 47.6,
    naoProbability: 52.4,
    status: 'active',
    tags: ['ETF', 'Ethereum', 'SEC']
  }
];

// Function to get all markets (mock + created)
export const getAllMarkets = () => {
  const createdMarkets = JSON.parse(localStorage.getItem('voxpredict_created_markets') || '[]');
  return [...mockMarkets, ...createdMarkets];
};

export const mockUser: User = {
  id: '1',
  address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5f',
  username: 'CryptoPreditor',
  totalPredictions: 47,
  successRate: 73.2,
  totalVolume: 12450,
  roi: 24.8
};

export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'market_ending',
    title: 'Mercado encerrando em breve',
    message: 'O mercado "Bitcoin atingirá $150k" encerra em 24 horas',
    timestamp: new Date('2024-02-10T10:00:00Z'),
    read: false
  },
  {
    id: '2',
    type: 'volume_spike',
    title: 'Volume disparou!',
    message: 'O mercado "Ministro da Fazenda vai cair" teve aumento de 300% no volume',
    timestamp: new Date('2024-02-09T15:30:00Z'),
    read: false
  },
  {
    id: '3',
    type: 'achievement',
    title: 'Parabéns! 🎉',
    message: 'Você atingiu 70% de assertividade em suas previsões',
    timestamp: new Date('2024-02-08T14:20:00Z'),
    read: true
  }
];