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
    category: 'política',
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
];

const seedCategories = [
  { key: 'politica', label: 'Política', icon: '🏛️', color: '#3B82F6', description: 'Eventos políticos, eleições e governos', sortOrder: 1 },
  { key: 'cripto', label: 'Cripto', icon: '₿', color: '#F97316', description: 'Mercados de criptomoedas e blockchain', sortOrder: 2 },
  { key: 'esportes', label: 'Esportes', icon: '⚽', color: '#EF4444', description: 'Eventos esportivos e competições', sortOrder: 3 },
  { key: 'tecnologia', label: 'Tecnologia', icon: '💻', color: '#8B5CF6', description: 'Inovações tecnológicas e lançamentos', sortOrder: 4 },
  { key: 'economia', label: 'Economia', icon: '📈', color: '#10B981', description: 'Indicadores econômicos e mercados financeiros', sortOrder: 5 },
  { key: 'entretenimento', label: 'Entretenimento', icon: '🎬', color: '#EC4899', description: 'Cinema, música e cultura pop', sortOrder: 6 },
  { key: 'geopolitica', label: 'Geopolítica', icon: '🌍', color: '#F59E0B', description: 'Relações internacionais e conflitos globais', sortOrder: 7 },
  { key: 'negocios', label: 'Negócios', icon: '💼', color: '#06B6D4', description: 'Empresas, startups e mercado corporativo', sortOrder: 8 },
  { key: 'ciencia', label: 'Ciência', icon: '🔬', color: '#6366F1', description: 'Descobertas científicas e pesquisas', sortOrder: 9 },
];

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

async function seed() {
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
