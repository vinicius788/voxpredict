import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedMarkets = [
  {
    id: 1,
    question: 'Bitcoin vai bater US$ 150k antes do halving de 2028?',
    description: 'Mercado de previsão sobre o preço do Bitcoin com liquidação baseada em fontes públicas.',
    category: 'cripto',
    endTime: new Date('2028-04-29T00:00:00.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 246000,
    totalYes: 135300,
    totalNo: 110700,
    participants: 678,
    token: 'USDT',
    contractAddress: 'offchain-1',
  },
  {
    id: 2,
    question: 'Congresso vai aprovar reforma tributária até dezembro de 2026?',
    description: 'Resolução baseada na publicação oficial no Diário Oficial e comunicados do Congresso.',
    category: 'politica',
    endTime: new Date('2026-12-30T00:00:00.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 157000,
    totalYes: 89490,
    totalNo: 67510,
    participants: 445,
    token: 'USDT',
    contractAddress: 'offchain-2',
  },
  {
    id: 3,
    question: 'Taxa Selic ficará abaixo de 9% até o fim de 2026?',
    description: 'Resultado confirmado pela decisão oficial do COPOM e publicação do Banco Central.',
    category: 'economia',
    endTime: new Date('2026-12-20T00:00:00.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 112400,
    totalYes: 59890,
    totalNo: 52510,
    participants: 372,
    token: 'USDC',
    contractAddress: 'offchain-3',
  },
  {
    id: 4,
    question: 'Brasil vai se classificar para a final da Copa América 2028?',
    description: 'Mercado esportivo com resolução baseada no resultado oficial da competição.',
    category: 'esportes',
    endTime: new Date('2028-07-15T00:00:00.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 93450,
    totalYes: 45200,
    totalNo: 48250,
    participants: 291,
    token: 'USDT',
    contractAddress: 'offchain-4',
  },
  {
    id: 5,
    question: 'A OpenAI vai lançar um novo modelo multimodal flagship até setembro de 2026?',
    description: 'Mercado de tecnologia com resolução por anúncio oficial público e documentação de produto.',
    category: 'tecnologia',
    endTime: new Date('2026-09-30T00:00:00.000Z'),
    status: 'RESOLVED' as const,
    outcome: 'YES',
    resolvedAt: new Date('2026-10-01T10:00:00.000Z'),
    totalVolume: 128900,
    totalYes: 76850,
    totalNo: 52050,
    participants: 349,
    token: 'USDT',
    contractAddress: 'offchain-5',
  },
  {
    id: 6,
    question: 'Inflação IPCA anual ficará abaixo de 4% em 2026?',
    description: 'Resolução com base no valor oficial divulgado pelo IBGE ao fim de 2026.',
    category: 'economia',
    endTime: new Date('2026-12-31T00:00:00.000Z'),
    status: 'CANCELLED' as const,
    outcome: 'CANCELLED',
    resolvedAt: new Date('2026-11-20T12:00:00.000Z'),
    totalVolume: 68420,
    totalYes: 35200,
    totalNo: 33220,
    participants: 187,
    token: 'USDC',
    contractAddress: 'offchain-6',
  },
];

const seedCategories = [
  { key: 'politica', label: 'Política', icon: '🏛️', color: '#6366F1', description: 'Eleições, governos e decisões institucionais', sortOrder: 1, active: true },
  { key: 'cripto', label: 'Cripto', icon: '₿', color: '#F59E0B', description: 'Criptoativos, blockchain e ecossistema Web3', sortOrder: 2, active: true },
  { key: 'esportes', label: 'Esportes', icon: '⚽', color: '#10B981', description: 'Eventos esportivos e competições internacionais', sortOrder: 3, active: true },
  { key: 'economia', label: 'Economia', icon: '📈', color: '#3B82F6', description: 'Indicadores macroeconômicos e política monetária', sortOrder: 4, active: true },
  { key: 'tecnologia', label: 'Tecnologia', icon: '💻', color: '#8B5CF6', description: 'Inovação, produtos e movimentos de big tech', sortOrder: 5, active: true },
  { key: 'geopolitica', label: 'Geopolítica', icon: '🌎', color: '#EF4444', description: 'Relações internacionais, conflitos e acordos globais', sortOrder: 6, active: true },
];

const marketTemplates = [
  {
    name: 'BTC Mensal',
    titleTemplate: 'O Bitcoin vai fechar acima de ${{btc_target}} em {{month_year}}?',
    descTemplate: 'Resolução baseada no fechamento mensal do BTC em fonte pública confiável.',
    category: 'cripto',
    frequency: 'MONTHLY' as const,
    variables: { btc_target: 'auto_btc_110pct', month_year: 'auto_next_month' },
  },
  {
    name: 'Selic Trimestral',
    titleTemplate: 'O Copom vai cortar a Selic em {{meeting_date}}?',
    descTemplate: 'Resolução com base no comunicado oficial do Banco Central após a reunião do Copom.',
    category: 'economia',
    frequency: 'QUARTERLY' as const,
    variables: { meeting_date: 'auto_next_copom' },
  },
  {
    name: 'ETH Mensal',
    titleTemplate: 'O Ethereum vai superar ${{eth_target}} até o fim de {{month_year}}?',
    descTemplate: 'Resultado confirmado pelo preço de fechamento mensal do ETH em fonte pública.',
    category: 'cripto',
    frequency: 'MONTHLY' as const,
    variables: { eth_target: 'auto_eth_110pct', month_year: 'auto_next_month' },
  },
  {
    name: 'Ibovespa Mensal',
    titleTemplate: 'O Ibovespa vai fechar acima de {{ibov_target}} pontos em {{month_year}}?',
    descTemplate: 'Resolução baseada no fechamento mensal oficial do índice Ibovespa.',
    category: 'economia',
    frequency: 'MONTHLY' as const,
    variables: { ibov_target: 'auto_ibov_102pct', month_year: 'auto_next_month' },
  },
];

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

async function seed() {
  await prisma.position.deleteMany({
    where: {
      marketId: { notIn: seedMarkets.map((market) => market.id) },
    },
  });

  await prisma.probabilitySnapshot.deleteMany({
    where: {
      marketId: { notIn: seedMarkets.map((market) => market.id) },
    },
  });

  await prisma.market.deleteMany({
    where: {
      id: { notIn: seedMarkets.map((market) => market.id) },
    },
  });

  await prisma.category.deleteMany({
    where: {
      key: { notIn: seedCategories.map((category) => category.key) },
    },
  });

  for (const category of seedCategories) {
    await prisma.category.upsert({
      where: { key: category.key },
      update: category,
      create: category,
    });
  }

  for (const market of seedMarkets) {
    await prisma.market.upsert({
      where: { id: market.id },
      update: market,
      create: market,
    });

    await prisma.probabilitySnapshot.deleteMany({ where: { marketId: market.id } });

    for (let i = 30; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const baseline = market.totalYes > market.totalNo ? 55 : 45;
      const variation = randomBetween(-8, 8);
      const yesProb = Math.max(20, Math.min(80, baseline + variation));
      const noProb = 100 - yesProb;
      const volume = market.totalVolume * ((30 - i + 1) / 31);

      await prisma.probabilitySnapshot.create({
        data: {
          marketId: market.id,
          yesProb: Number(yesProb.toFixed(2)),
          noProb: Number(noProb.toFixed(2)),
          volume: Number(volume.toFixed(2)),
          timestamp: date,
        },
      });
    }
  }

  for (const template of marketTemplates) {
    await prisma.marketTemplate.upsert({
      where: { name: template.name },
      update: {
        titleTemplate: template.titleTemplate,
        descTemplate: template.descTemplate,
        category: template.category,
        frequency: template.frequency,
        variables: template.variables,
        active: true,
      },
      create: {
        ...template,
        minBet: 5,
        maxBet: 1000,
        active: true,
      },
    });
  }
}

seed()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Prisma seed completed.');
  })
  .catch(async (error) => {
    console.error('Prisma seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
