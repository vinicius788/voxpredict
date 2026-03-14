import express, { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const PLATFORM_FEE_RATE = 0.03;

const createMarketSchema = z.object({
  question: z.string().min(10).max(200),
  description: z.string().min(20).max(1000),
  category: z.string().min(2).max(50),
  endTime: z.string().datetime(),
  minBet: z.number().min(1).default(5),
  maxBet: z.number().max(100_000).default(1000),
  tags: z.array(z.string()).optional(),
  contractAddress: z.string().optional(),
  token: z.string().min(2).max(10).optional(),
});

const updateMarketSchema = z.object({
  question: z.string().min(10).max(200).optional(),
  description: z.string().min(20).max(1000).optional(),
  category: z.string().min(2).max(50).optional(),
  endTime: z.string().datetime().optional(),
  status: z.enum(['ACTIVE', 'CLOSED', 'RESOLVED', 'CANCELLED']).optional(),
  outcome: z.enum(['YES', 'NO', 'CANCELLED']).nullable().optional(),
});

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return Number(value.toString());
};

const parsePagination = (req: Request) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 12)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const parseMarketId = (rawId: string) => {
  const parsed = Number(rawId);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const calculateMultiplier = (totalYes: number, totalNo: number, side: 'YES' | 'NO') => {
  const sidePool = side === 'YES' ? totalYes : totalNo;
  const otherPool = side === 'YES' ? totalNo : totalYes;
  const total = totalYes + totalNo;

  if (total === 0 || sidePool === 0) return 2;

  const netPrize = otherPool * (1 - PLATFORM_FEE_RATE);
  return Number(((sidePool + netPrize) / sidePool).toFixed(2));
};

const mapMarket = (market: {
  id: number;
  contractAddress: string;
  question: string;
  description: string;
  category: string;
  endTime: Date;
  status: string;
  outcome: string | null;
  totalVolume: Prisma.Decimal;
  totalYes: Prisma.Decimal;
  totalNo: Prisma.Decimal;
  participants: number;
  createdAt: Date;
  resolvedAt: Date | null;
  token: string;
}) => {
  const totalVolume = toNumber(market.totalVolume);
  const totalYes = toNumber(market.totalYes);
  const totalNo = toNumber(market.totalNo);
  const totalPool = totalYes + totalNo;
  const yesProbability = totalPool > 0 ? totalYes / totalPool : 0.5;
  const noProbability = totalPool > 0 ? totalNo / totalPool : 0.5;
  const yesProbabilityPct = Number((yesProbability * 100).toFixed(1));
  const noProbabilityPct = Number((noProbability * 100).toFixed(1));
  const yesMultiplier = calculateMultiplier(totalYes, totalNo, 'YES');
  const noMultiplier = calculateMultiplier(totalYes, totalNo, 'NO');

  return {
    id: market.id,
    contractAddress: market.contractAddress,
    question: market.question,
    title: market.question,
    description: market.description,
    category: market.category,
    endTime: market.endTime,
    status: market.status,
    outcome: market.outcome,
    token: market.token,
    totalVolume,
    totalYes,
    totalNo,
    yesPool: totalYes,
    noPool: totalNo,
    participants: market.participants,
    totalBettors: market.participants,
    yesProb: yesProbabilityPct,
    noProb: noProbabilityPct,
    simProbability: yesProbabilityPct,
    naoProbability: noProbabilityPct,
    yesProbability,
    noProbability,
    yesMultiplier,
    noMultiplier,
    simOdds: yesMultiplier,
    naoOdds: noMultiplier,
    yesOdds: yesMultiplier,
    noOdds: noMultiplier,
    createdAt: market.createdAt,
    resolvedAt: market.resolvedAt,
  };
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    const includeAll = req.query.includeAll === 'true';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'volume';

    const where: Prisma.MarketWhereInput = {};

    if (category && category !== 'all') where.category = category;
    if (status && status !== 'ALL') {
      where.status = status as never;
    } else if (!includeAll) {
      where.status = 'ACTIVE';
    }
    if (search) {
      where.question = { contains: search, mode: 'insensitive' };
    }

    const orderBy: Prisma.MarketOrderByWithRelationInput =
      sortBy === 'newest'
        ? { createdAt: 'desc' }
        : sortBy === 'resolvedAt'
          ? { resolvedAt: 'desc' }
        : sortBy === 'ending'
          ? { endTime: 'asc' }
          : { totalVolume: 'desc' };

    const [items, total] = await Promise.all([
      prisma.market.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.market.count({ where }),
    ]);

    const mapped = items.map(mapMarket);

    return res.status(200).json({
      success: true,
      data: mapped,
      markets: mapped,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error('Error listing markets:', error);
    return res.status(500).json({ success: false, error: 'Failed to list markets' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const marketId = parseMarketId(String(req.params.id));
    if (!marketId) {
      return res.status(400).json({ success: false, error: 'Invalid market id' });
    }

    const market = await prisma.market.findUnique({
      where: { id: marketId },
      include: {
        probabilityHistory: {
          orderBy: { timestamp: 'asc' },
          take: 180,
        },
      },
    });

    if (!market) {
      return res.status(404).json({ success: false, error: 'Market not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...mapMarket(market),
        probabilityHistory: market.probabilityHistory.map((point) => ({
          timestamp: point.timestamp,
          yesProb: point.yesProb,
          noProb: point.noProb,
          volume: toNumber(point.volume),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching market:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch market' });
  }
});

router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const marketId = parseMarketId(String(req.params.id));
    if (!marketId) {
      return res.status(400).json({ success: false, error: 'Invalid market id' });
    }

    const period = typeof req.query.period === 'string' ? req.query.period : '30d';

    const since = new Date();
    if (period === '24h') since.setHours(since.getHours() - 24);
    else if (period === '7d') since.setDate(since.getDate() - 7);
    else if (period === '30d') since.setDate(since.getDate() - 30);
    else since.setFullYear(2020);

    const takeByPeriod: Record<string, number> = {
      '24h': 24,
      '7d': 84,
      '30d': 180,
      all: 400,
    };

    const history = await prisma.probabilitySnapshot.findMany({
      where: {
        marketId,
        ...(period === 'all' ? {} : { timestamp: { gte: since } }),
      },
      orderBy: { timestamp: 'asc' },
      take: takeByPeriod[period] || takeByPeriod['30d'],
    });

    const mapped = history.map((point) => ({
      timestamp: point.timestamp,
      yesProb: point.yesProb,
      noProb: point.noProb,
      volume: toNumber(point.volume),
    }));

    return res.status(200).json({
      success: true,
      period,
      data: mapped,
      snapshots: mapped,
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

router.post('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = createMarketSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const latest = await prisma.market.aggregate({ _max: { id: true } });
    const nextId = (latest._max.id || 0) + 1;
    const data = parsed.data;

    const market = await prisma.market.create({
      data: {
        id: nextId,
        contractAddress: data.contractAddress || `offchain-${nextId}`,
        question: data.question,
        description: data.description,
        category: data.category,
        endTime: new Date(data.endTime),
        status: 'ACTIVE',
        totalVolume: 0,
        totalYes: 0,
        totalNo: 0,
        participants: 0,
        token: (data.token || 'USDT').toUpperCase(),
      },
    });

    return res.status(201).json({ success: true, data: mapMarket(market), market: mapMarket(market) });
  } catch (error) {
    console.error('Error creating market:', error);
    return res.status(500).json({ success: false, error: 'Failed to create market' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const marketId = parseMarketId(String(req.params.id));
    if (!marketId) {
      return res.status(400).json({ success: false, error: 'Invalid market id' });
    }

    const parsed = updateMarketSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const data = parsed.data;
    const updated = await prisma.market.update({
      where: { id: marketId },
      data: {
        ...(data.question ? { question: data.question } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.category ? { category: data.category } : {}),
        ...(data.endTime ? { endTime: new Date(data.endTime) } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.outcome !== undefined ? { outcome: data.outcome } : {}),
      },
    });

    return res.status(200).json({ success: true, data: mapMarket(updated) });
  } catch (error) {
    console.error('Error updating market:', error);
    return res.status(500).json({ success: false, error: 'Failed to update market' });
  }
});

router.post('/:id/resolve', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const marketId = parseMarketId(String(req.params.id));
    if (!marketId) {
      return res.status(400).json({ success: false, error: 'Invalid market id' });
    }

    const outcome = (req.body?.outcome || '').toString().toUpperCase();
    if (!['YES', 'NO'].includes(outcome)) {
      return res.status(400).json({ success: false, error: 'Invalid outcome' });
    }

    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market) {
      return res.status(404).json({ success: false, error: 'Market not found' });
    }
    if (market.status === 'RESOLVED') {
      return res.status(400).json({ success: false, error: 'Already resolved' });
    }

    const updated = await prisma.market.update({
      where: { id: marketId },
      data: {
        outcome,
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });

    const participants = await prisma.position.findMany({
      where: { marketId },
      select: { userId: true, side: true },
    });

    if (participants.length > 0) {
      await prisma.notification.createMany({
        data: participants.map((position) => {
          const won = position.side === outcome;
          return {
            userId: position.userId,
            type: won ? 'WIN' : 'LOSS',
            title: won ? '🎉 Você acertou!' : '😔 Você errou',
            message: won
              ? `O mercado "${market.question}" foi resolvido como ${outcome}. Seus ganhos estão disponíveis.`
              : `O mercado "${market.question}" foi resolvido como ${outcome}.`,
          };
        }),
      });
    }

    return res.status(200).json({ success: true, data: mapMarket(updated) });
  } catch (error) {
    console.error('Error resolving market:', error);
    return res.status(500).json({ success: false, error: 'Failed to resolve market' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const marketId = parseMarketId(String(req.params.id));
    if (!marketId) {
      return res.status(400).json({ success: false, error: 'Invalid market id' });
    }

    const updated = await prisma.market.update({
      where: { id: marketId },
      data: {
        status: 'CANCELLED',
        outcome: 'CANCELLED',
        resolvedAt: new Date(),
      },
    });

    return res.status(200).json({ success: true, data: mapMarket(updated) });
  } catch (error) {
    console.error('Error cancelling market:', error);
    return res.status(500).json({ success: false, error: 'Failed to cancel market' });
  }
});

export default router;
