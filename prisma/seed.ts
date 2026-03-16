import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedMarkets = [
  {
    id: 1,
    question: 'Lula vai terminar o mandato em 2026?',
    description:
      'Resolve como SIM se Luiz Inácio Lula da Silva completar o mandato presidencial até 31/12/2026 sem impeachment, renúncia ou impedimento. Fonte: Câmara dos Deputados.',
    category: 'politica',
    endTime: new Date('2026-12-31T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 322000,
    totalYes: 186760,
    totalNo: 135240,
    participants: 1102,
    token: 'USDT',
    contractAddress: 'offchain-1',
  },
  {
    id: 2,
    question: 'O PT vai ganhar as eleições municipais de SP em 2028?',
    description:
      'Resolve como SIM se candidato do PT vencer o segundo turno das eleições para prefeito de São Paulo em outubro de 2028. Fonte: TSE.',
    category: 'politica',
    endTime: new Date('2028-10-30T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 143000,
    totalYes: 55870,
    totalNo: 87130,
    participants: 512,
    token: 'USDT',
    contractAddress: 'offchain-2',
  },
  {
    id: 3,
    question: 'Congresso vai aprovar reforma tributária completa até junho de 2026?',
    description:
      'Resolve como SIM se o Congresso Nacional votar e aprovar a regulamentação completa da reforma tributária até 30/06/2026. Fonte: Câmara Federal.',
    category: 'politica',
    endTime: new Date('2026-06-30T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 210000,
    totalYes: 121800,
    totalNo: 88200,
    participants: 744,
    token: 'USDT',
    contractAddress: 'offchain-3',
  },
  {
    id: 4,
    question: 'Selic vai cair abaixo de 12% ao ano até dezembro de 2026?',
    description:
      'Resolve como SIM se o Copom reduzir a taxa Selic para abaixo de 12% a.a. em qualquer reunião até dezembro de 2026. Fonte: Banco Central do Brasil.',
    category: 'economia',
    endTime: new Date('2026-12-31T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 254000,
    totalYes: 147320,
    totalNo: 106680,
    participants: 930,
    token: 'USDT',
    contractAddress: 'offchain-4',
  },
  {
    id: 5,
    question: 'Dólar vai ultrapassar R$7,00 até junho de 2026?',
    description:
      'Resolve como SIM se a cotação do dólar (PTAX) atingir R$7,00 ou mais em qualquer dia útil até 30/06/2026. Fonte: Banco Central.',
    category: 'economia',
    endTime: new Date('2026-06-30T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 198000,
    totalYes: 91872,
    totalNo: 106128,
    participants: 681,
    token: 'USDT',
    contractAddress: 'offchain-5',
  },
  {
    id: 6,
    question: 'Ibovespa vai atingir 160.000 pontos até 2027?',
    description:
      'Resolve como SIM se o índice Ibovespa fechar acima de 160.000 pontos em qualquer sessão até 31/12/2027. Fonte: B3.',
    category: 'economia',
    endTime: new Date('2027-12-31T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 176000,
    totalYes: 102080,
    totalNo: 73920,
    participants: 640,
    token: 'USDC',
    contractAddress: 'offchain-6',
  },
  {
    id: 7,
    question: 'PIB do Brasil vai crescer mais de 2% em 2026?',
    description:
      'Resolve como SIM se o IBGE divulgar crescimento do PIB brasileiro superior a 2% no acumulado de 2026. Fonte: IBGE.',
    category: 'economia',
    endTime: new Date('2027-03-31T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 158000,
    totalYes: 92720,
    totalNo: 65280,
    participants: 598,
    token: 'USDT',
    contractAddress: 'offchain-7',
  },
  {
    id: 8,
    question: 'Bitcoin vai ultrapassar $200.000 até o fim de 2026?',
    description:
      'Resolve como SIM se o BTC/USD atingir $200.000 ou mais em qualquer exchange de grande volume (Binance, Coinbase) até 31/12/2026. Fonte: CoinGecko.',
    category: 'cripto',
    endTime: new Date('2026-12-31T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 401000,
    totalYes: 152380,
    totalNo: 248620,
    participants: 1250,
    token: 'USDT',
    contractAddress: 'offchain-8',
  },
  {
    id: 9,
    question: 'Ethereum vai superar $10.000 até dezembro de 2026?',
    description:
      'Resolve como SIM se o ETH/USD atingir $10.000 ou mais até 31/12/2026. Fonte: CoinGecko.',
    category: 'cripto',
    endTime: new Date('2026-12-31T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 286000,
    totalYes: 120120,
    totalNo: 165880,
    participants: 956,
    token: 'USDT',
    contractAddress: 'offchain-9',
  },
  {
    id: 10,
    question: 'Bitcoin vai cair abaixo de $60.000 em 2026?',
    description:
      'Resolve como SIM se o BTC/USD fechar abaixo de $60.000 em qualquer dia até 31/12/2026. Fonte: CoinGecko.',
    category: 'cripto',
    endTime: new Date('2026-12-31T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 239000,
    totalYes: 108745,
    totalNo: 130255,
    participants: 822,
    token: 'USDC',
    contractAddress: 'offchain-10',
  },
  {
    id: 11,
    question: 'Solana vai ultrapassar $500 até junho de 2026?',
    description:
      'Resolve como SIM se SOL/USD atingir $500 ou mais até 30/06/2026. Fonte: CoinGecko.',
    category: 'cripto',
    endTime: new Date('2026-06-30T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 164000,
    totalYes: 88560,
    totalNo: 75440,
    participants: 604,
    token: 'USDT',
    contractAddress: 'offchain-11',
  },
  {
    id: 12,
    question: 'Flamengo vai ser campeão brasileiro em 2026?',
    description:
      'Resolve como SIM se o Flamengo conquistar o título do Campeonato Brasileiro Série A de 2026. Fonte: CBF.',
    category: 'esportes',
    endTime: new Date('2026-12-15T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 214000,
    totalYes: 96420,
    totalNo: 117580,
    participants: 730,
    token: 'USDT',
    contractAddress: 'offchain-12',
  },
  {
    id: 13,
    question: 'Brasil vai se classificar para a Copa do Mundo 2026?',
    description:
      'Resolve como SIM se a Seleção Brasileira garantir vaga na Copa do Mundo 2026 nas eliminatórias sul-americanas. Fonte: CBF/FIFA.',
    category: 'esportes',
    endTime: new Date('2026-03-31T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 267000,
    totalYes: 212265,
    totalNo: 54735,
    participants: 988,
    token: 'USDT',
    contractAddress: 'offchain-13',
  },
  {
    id: 14,
    question: 'Brasil vai ganhar a Copa América 2026?',
    description:
      'Resolve como SIM se a Seleção Brasileira vencer a Copa América de 2026. Fonte: CONMEBOL.',
    category: 'esportes',
    endTime: new Date('2026-07-31T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 190000,
    totalYes: 98800,
    totalNo: 91200,
    participants: 702,
    token: 'USDC',
    contractAddress: 'offchain-14',
  },
  {
    id: 15,
    question: 'Brasil vai regular cripto com lei específica até 2026?',
    description:
      'Resolve como SIM se o Brasil aprovar legislação específica de regulação de criptoativos e exchanges até 31/12/2026. Fonte: Senado Federal.',
    category: 'tecnologia',
    endTime: new Date('2026-12-31T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 149000,
    totalYes: 84930,
    totalNo: 64070,
    participants: 560,
    token: 'USDT',
    contractAddress: 'offchain-15',
  },
  {
    id: 16,
    question: 'Nubank vai lançar produto de investimento em cripto até 2026?',
    description:
      'Resolve como SIM se o Nubank anunciar oficialmente produto de compra/venda de criptomoedas para clientes brasileiros até 31/12/2026. Fonte: Nubank IR.',
    category: 'tecnologia',
    endTime: new Date('2026-12-31T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 121000,
    totalYes: 71390,
    totalNo: 49610,
    participants: 444,
    token: 'USDC',
    contractAddress: 'offchain-16',
  },
  {
    id: 17,
    question: 'Argentina vai entrar no BRICS até 2027?',
    description:
      'Resolve como SIM se a Argentina confirmar adesão formal ao BRICS até 31/12/2027. Fonte: Ministério das Relações Exteriores.',
    category: 'geopolitica',
    endTime: new Date('2027-12-31T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 118000,
    totalYes: 46020,
    totalNo: 71980,
    participants: 420,
    token: 'USDT',
    contractAddress: 'offchain-17',
  },
  {
    id: 18,
    question: 'Trump vai impor tarifas acima de 20% ao Brasil em 2026?',
    description:
      'Resolve como SIM se o governo dos EUA anunciar tarifas superiores a 20% sobre produtos brasileiros em 2026. Fonte: USTR/Reuters.',
    category: 'geopolitica',
    endTime: new Date('2026-12-31T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 173000,
    totalYes: 64010,
    totalNo: 108990,
    participants: 605,
    token: 'USDT',
    contractAddress: 'offchain-18',
  },
  {
    id: 19,
    question: 'Venezuela vai ter eleições livres até 2027?',
    description:
      'Resolve como SIM se observadores internacionais certificarem eleições livres e justas na Venezuela até 31/12/2027. Fonte: OEA/ONU.',
    category: 'geopolitica',
    endTime: new Date('2027-12-31T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 102000,
    totalYes: 33660,
    totalNo: 68340,
    participants: 366,
    token: 'USDC',
    contractAddress: 'offchain-19',
  },
  {
    id: 20,
    question: 'Acordo Mercosul-UE vai ser ratificado até 2026?',
    description:
      'Resolve como SIM se o acordo comercial Mercosul-União Europeia for ratificado pelos parlamentos e entrar em vigor até 31/12/2026. Fonte: Itamaraty.',
    category: 'geopolitica',
    endTime: new Date('2026-12-31T23:59:59.000Z'),
    status: 'ACTIVE' as const,
    totalVolume: 167000,
    totalYes: 71810,
    totalNo: 95190,
    participants: 584,
    token: 'USDT',
    contractAddress: 'offchain-20',
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
const adminEmail = (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();

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

  if (adminEmail) {
    const adminUser = await prisma.user.findFirst({
      where: { email: adminEmail },
      select: { id: true, username: true },
    });

    if (adminUser && !adminUser.username) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          username: 'vox_admin',
          isPublicProfile: true,
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
