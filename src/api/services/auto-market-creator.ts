import { MarketTemplate, Prisma, TemplateFrequency } from '@prisma/client';
import { prisma } from '../db/prisma';

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return Number(value.toString());
};

const formatMonthYear = (date: Date) =>
  date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });

const addByFrequency = (baseDate: Date, frequency: TemplateFrequency) => {
  const next = new Date(baseDate);
  if (frequency === 'WEEKLY') {
    next.setDate(next.getDate() + 7);
    return next;
  }
  if (frequency === 'QUARTERLY') {
    next.setMonth(next.getMonth() + 3);
    return next;
  }
  next.setMonth(next.getMonth() + 1);
  return next;
};

const getNextRunAt = (frequency: TemplateFrequency, fromDate = new Date()) => {
  const base = new Date(fromDate);
  base.setHours(9, 0, 0, 0);
  return addByFrequency(base, frequency);
};

const getFallbackPrices = () => ({
  btc: 90000,
  eth: 4500,
  ibov: 130000,
});

const fetchCoinGeckoPrices = async () => {
  const fallback = getFallbackPrices();
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
      { headers: { accept: 'application/json' } },
    );
    if (!response.ok) {
      return fallback;
    }
    const data = (await response.json()) as {
      bitcoin?: { usd?: number };
      ethereum?: { usd?: number };
    };
    return {
      btc: data.bitcoin?.usd || fallback.btc,
      eth: data.ethereum?.usd || fallback.eth,
      ibov: fallback.ibov,
    };
  } catch {
    return fallback;
  }
};

const roundToNearest = (value: number, step: number) => Math.round(value / step) * step;

const getNextCopomDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const fixedMeetings = [
    new Date(`${year}-01-30T00:00:00.000Z`),
    new Date(`${year}-03-20T00:00:00.000Z`),
    new Date(`${year}-05-08T00:00:00.000Z`),
    new Date(`${year}-06-19T00:00:00.000Z`),
    new Date(`${year}-07-31T00:00:00.000Z`),
    new Date(`${year}-09-18T00:00:00.000Z`),
    new Date(`${year}-11-06T00:00:00.000Z`),
    new Date(`${year + 1}-01-29T00:00:00.000Z`),
  ];
  return fixedMeetings.find((date) => date.getTime() > today.getTime()) || fixedMeetings[fixedMeetings.length - 1];
};

const resolveVariables = async (rawVariables: unknown) => {
  const vars = typeof rawVariables === 'object' && rawVariables !== null ? (rawVariables as Record<string, string>) : {};
  const prices = await fetchCoinGeckoPrices();
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const replacements: Record<string, string> = {};

  Object.entries(vars).forEach(([key, value]) => {
    if (value === 'auto_btc_110pct') {
      replacements[key] = String(roundToNearest(prices.btc * 1.1, 500));
      return;
    }
    if (value === 'auto_eth_110pct') {
      replacements[key] = String(roundToNearest(prices.eth * 1.1, 100));
      return;
    }
    if (value === 'auto_ibov_102pct') {
      replacements[key] = String(roundToNearest(prices.ibov * 1.02, 500));
      return;
    }
    if (value === 'auto_next_month') {
      replacements[key] = formatMonthYear(nextMonth);
      return;
    }
    if (value === 'auto_current_month') {
      replacements[key] = formatMonthYear(new Date());
      return;
    }
    if (value === 'auto_next_copom') {
      replacements[key] = getNextCopomDate().toLocaleDateString('pt-BR');
      return;
    }
    replacements[key] = String(value);
  });

  return replacements;
};

const renderTemplateString = (template: string, replacements: Record<string, string>) => {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => replacements[key] || '');
};

const getAutoEndTime = (frequency: TemplateFrequency) => {
  const date = new Date();
  if (frequency === 'WEEKLY') {
    date.setDate(date.getDate() + 7);
  } else if (frequency === 'QUARTERLY') {
    date.setMonth(date.getMonth() + 3);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  date.setHours(23, 59, 59, 999);
  return date;
};

export const createMarketFromTemplate = async (template: MarketTemplate) => {
  const replacements = await resolveVariables(template.variables);
  const question = renderTemplateString(template.titleTemplate, replacements).trim();
  const description = renderTemplateString(template.descTemplate, replacements).trim();
  const endTime = getAutoEndTime(template.frequency);
  const latest = await prisma.market.aggregate({ _max: { id: true } });
  const nextId = (latest._max.id || 0) + 1;

  const market = await prisma.market.create({
    data: {
      id: nextId,
      contractAddress: `offchain-${nextId}`,
      question,
      description,
      category: template.category,
      endTime,
      status: 'ACTIVE',
      totalVolume: 0,
      totalYes: 0,
      totalNo: 0,
      participants: 0,
      token: 'USDT',
    },
  });

  await prisma.marketTemplate.update({
    where: { id: template.id },
    data: {
      lastRunAt: new Date(),
      nextRunAt: getNextRunAt(template.frequency),
    },
  });

  return {
    id: market.id,
    question: market.question,
    category: market.category,
    endTime: market.endTime,
    totalVolume: toNumber(market.totalVolume),
  };
};

export const runAutoMarketCreator = async () => {
  const now = new Date();
  const dueTemplates = await prisma.marketTemplate.findMany({
    where: {
      active: true,
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
    },
    orderBy: { id: 'asc' },
  });

  const created: Array<{ templateId: number; marketId: number }> = [];
  const failed: Array<{ templateId: number; error: string }> = [];

  for (const template of dueTemplates) {
    try {
      const market = await createMarketFromTemplate(template);
      created.push({ templateId: template.id, marketId: market.id });
      console.log(`[auto-market-creator] template=${template.id} market=${market.id}`);
    } catch (error: any) {
      failed.push({ templateId: template.id, error: error?.message || 'unknown error' });
      console.error(`[auto-market-creator] failed template=${template.id}`, error);
    }
  }

  return { created, failed };
};

export const computeInitialNextRunAt = (frequency: TemplateFrequency) => getNextRunAt(frequency, new Date());
