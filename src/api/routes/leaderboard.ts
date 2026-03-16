import express, { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const PLATFORM_FEE_RATE = 0.03;

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) => Number((value || 0).toString());

const parseLimit = (rawLimit: unknown) => {
  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(1, Math.floor(parsed)));
};

const parsePeriodStart = (periodRaw: unknown) => {
  const period = typeof periodRaw === 'string' ? periodRaw.toLowerCase() : 'all';
  if (period === 'all') return null;

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 0;
  if (days <= 0) return null;

  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  date.setHours(0, 0, 0, 0);
  return date;
};

const isWinningPosition = (side: string, outcome: string | null) => Boolean(outcome && side === outcome);

const calculateResolvedPayout = (stake: number, side: 'YES' | 'NO', outcome: string, totalYes: number, totalNo: number) => {
  if (!isWinningPosition(side, outcome)) return 0;
  const winningPool = side === 'YES' ? totalYes : totalNo;
  const losingPool = side === 'YES' ? totalNo : totalYes;
  if (winningPool <= 0) return stake;
  const netLosingPool = losingPool * (1 - PLATFORM_FEE_RATE);
  return stake + netLosingPool * (stake / winningPool);
};

const sortByRanking = (a: { winRate: number; totalProfit: number; totalPredictions: number }, b: typeof a) => {
  if (b.winRate !== a.winRate) return b.winRate - a.winRate;
  if (b.totalProfit !== a.totalProfit) return b.totalProfit - a.totalProfit;
  return b.totalPredictions - a.totalPredictions;
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const period = typeof req.query.period === 'string' ? req.query.period.toLowerCase() : 'all';
    const category = typeof req.query.category === 'string' ? req.query.category.toLowerCase() : 'all';
    const limit = parseLimit(req.query.limit);
    const periodStart = parsePeriodStart(period);
    const categoryFilter = category === 'all' ? null : category;

    const shouldUseStoredRanking = !periodStart && !categoryFilter;
    let summary = {
      totalPredictors: 0,
      totalVolume: 0,
      averageWinRate: 0,
    };

    let entries: Array<{
      id: string;
      username: string | null;
      avatarUrl: string | null;
      winRate: number;
      totalProfit: number;
      totalVolume: number;
      totalPredictions: number;
      correctPredictions: number;
      rank: number | null;
      rankChange: number;
      streak: number;
      badges: string[];
      createdAt: Date;
    }> = [];

    if (shouldUseStoredRanking) {
      const where = {
        isPublicProfile: true,
        totalPredictions: { gt: 0 },
      } as const;

      const [users, aggregate] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: [{ winRate: 'desc' }, { totalProfit: 'desc' }, { totalPredictions: 'desc' }],
          take: limit,
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            winRate: true,
            totalProfit: true,
            totalVolume: true,
            totalPredictions: true,
            correctPredictions: true,
            rank: true,
            rankChange: true,
            streak: true,
            badges: true,
            createdAt: true,
          },
        }),
        prisma.user.aggregate({
          where,
          _count: { id: true },
          _sum: { totalVolume: true },
          _avg: { winRate: true },
        }),
      ]);

      entries = users.map((user) => ({
        ...user,
        winRate: Number(user.winRate || 0),
        totalProfit: Number(user.totalProfit || 0),
        totalVolume: Number(user.totalVolume || 0),
      }));

      summary = {
        totalPredictors: aggregate._count.id || 0,
        totalVolume: Number(aggregate._sum.totalVolume || 0),
        averageWinRate: Number(aggregate._avg.winRate || 0),
      };
    } else {
      const users = await prisma.user.findMany({
        where: {
          isPublicProfile: true,
        },
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          rank: true,
          rankChange: true,
          badges: true,
          createdAt: true,
          positions: {
            where: {
              market: {
                status: 'RESOLVED',
                outcome: { in: ['YES', 'NO'] },
                ...(periodStart ? { resolvedAt: { gte: periodStart } } : {}),
                ...(categoryFilter ? { category: categoryFilter } : {}),
              },
            },
            select: {
              side: true,
              amount: true,
              market: {
                select: {
                  outcome: true,
                  totalYes: true,
                  totalNo: true,
                  resolvedAt: true,
                },
              },
            },
          },
        },
      });

      const allEntries = users
        .map((user) => {
          const resolved = user.positions;
          const totalPredictions = resolved.length;
          const correctPredictions = resolved.filter((position) => isWinningPosition(position.side, position.market.outcome)).length;
          const winRate = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
          const totalVolume = resolved.reduce((sum, position) => sum + toNumber(position.amount), 0);
          const totalProfit = resolved.reduce((sum, position) => {
            const stake = toNumber(position.amount);
            const side = position.side === 'YES' ? 'YES' : 'NO';
            const outcome = position.market.outcome || 'NO';
            const payout = calculateResolvedPayout(
              stake,
              side,
              outcome,
              toNumber(position.market.totalYes),
              toNumber(position.market.totalNo),
            );
            return sum + (payout - stake);
          }, 0);

          const sortedByRecent = [...resolved].sort((a, b) => {
            const aTime = a.market.resolvedAt ? new Date(a.market.resolvedAt).getTime() : 0;
            const bTime = b.market.resolvedAt ? new Date(b.market.resolvedAt).getTime() : 0;
            return bTime - aTime;
          });

          let streak = 0;
          for (const position of sortedByRecent) {
            if (isWinningPosition(position.side, position.market.outcome)) {
              streak += 1;
            } else {
              break;
            }
          }

          return {
            id: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl,
            winRate,
            totalProfit,
            totalVolume,
            totalPredictions,
            correctPredictions,
            rank: user.rank,
            rankChange: user.rankChange,
            streak,
            badges: user.badges,
            createdAt: user.createdAt,
          };
        })
        .filter((entry) => entry.totalPredictions > 0)
        .sort(sortByRanking);

      summary = {
        totalPredictors: allEntries.length,
        totalVolume: allEntries.reduce((sum, entry) => sum + entry.totalVolume, 0),
        averageWinRate:
          allEntries.length > 0 ? allEntries.reduce((sum, entry) => sum + entry.winRate, 0) / allEntries.length : 0,
      };

      entries = allEntries.slice(0, limit);
    }

    const ranked = entries.map((entry, index) => ({
      ...entry,
      position: index + 1,
      winRateFormatted: `${(entry.winRate * 100).toFixed(1)}%`,
      profitFormatted:
        entry.totalProfit >= 0
          ? `+$${entry.totalProfit.toFixed(0)}`
          : `-$${Math.abs(entry.totalProfit).toFixed(0)}`,
    }));

    return res.json({
      success: true,
      period,
      category,
      leaderboard: ranked,
      summary,
    });
  } catch (error) {
    console.error('Erro ao carregar leaderboard:', error);
    return res.status(500).json({ success: false, error: 'Erro ao carregar leaderboard' });
  }
});

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        rank: true,
        rankChange: true,
        winRate: true,
        totalProfit: true,
        totalPredictions: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    const rankedUsers = await prisma.user.findMany({
      where: { isPublicProfile: true, totalPredictions: { gt: 0 } },
      orderBy: [{ winRate: 'desc' }, { totalProfit: 'desc' }, { totalPredictions: 'desc' }],
      select: { id: true },
    });

    const totalUsers = rankedUsers.length;
    const positionIndex = rankedUsers.findIndex((entry) => entry.id === userId);
    const rank = positionIndex >= 0 ? positionIndex + 1 : user.rank;

    return res.json({
      success: true,
      data: {
        rank,
        rankChange: user.rankChange,
        winRate: user.winRate,
        totalProfit: user.totalProfit,
        totalPredictions: user.totalPredictions,
        totalUsers,
      },
      rank,
      rankChange: user.rankChange,
      winRate: user.winRate,
      totalProfit: user.totalProfit,
      totalPredictions: user.totalPredictions,
      totalUsers,
    });
  } catch (error) {
    console.error('Erro ao carregar posição no leaderboard:', error);
    return res.status(500).json({ success: false, error: 'Erro ao carregar posição no leaderboard' });
  }
});

export default router;
