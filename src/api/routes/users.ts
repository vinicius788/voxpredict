import express, { Response } from 'express';
import { Prisma, TxType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const PLATFORM_FEE_RATE = 0.03;

const updateUserSchema = z.object({
  username: z.string().min(2).max(32).optional(),
  avatarUrl: z.string().url().optional(),
});

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) => Number((value || 0).toString());

const calculateMultiplier = (totalYes: number, totalNo: number, side: 'YES' | 'NO') => {
  const sidePool = side === 'YES' ? totalYes : totalNo;
  const otherPool = side === 'YES' ? totalNo : totalYes;
  const total = totalYes + totalNo;

  if (total <= 0 || sidePool <= 0) return 2;

  return (sidePool + otherPool * (1 - PLATFORM_FEE_RATE)) / sidePool;
};

const getPeriodStart = (periodRaw: string | undefined, fallbackDate: Date) => {
  const period = (periodRaw || '30d').toLowerCase();
  const now = new Date();

  if (period === '7d') {
    const date = new Date(now);
    date.setDate(date.getDate() - 6);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  if (period === '30d') {
    const date = new Date(now);
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  if (period === '90d') {
    const date = new Date(now);
    date.setDate(date.getDate() - 89);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const date = new Date(fallbackDate);
  date.setHours(0, 0, 0, 0);
  return date;
};

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        walletAddress: true,
        username: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

router.put('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        walletAddress: true,
        username: true,
        avatarUrl: true,
        role: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

router.get('/me/stats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const [positions, transactions] = await Promise.all([
      prisma.position.findMany({
        where: { userId },
        include: {
          market: {
            select: {
              status: true,
              outcome: true,
              endTime: true,
              resolvedAt: true,
              totalYes: true,
              totalNo: true,
            },
          },
        },
      }),
      prisma.transaction.findMany({
        where: { userId },
        select: {
          type: true,
          amount: true,
          createdAt: true,
        },
      }),
    ]);

    const totalPredictions = positions.length;
    const active = positions.filter((position) => position.market.status === 'ACTIVE');
    const resolvedPositions = positions.filter((position) =>
      ['RESOLVED', 'CANCELLED'].includes(position.market.status),
    );

    const wins = resolvedPositions.filter((position) =>
      (position.side === 'YES' && position.market.outcome === 'YES') ||
      (position.side === 'NO' && position.market.outcome === 'NO'),
    );

    const losses = resolvedPositions.filter((position) =>
      (position.side === 'YES' && position.market.outcome === 'NO') ||
      (position.side === 'NO' && position.market.outcome === 'YES'),
    );

    const successRate = resolvedPositions.length > 0 ? (wins.length / resolvedPositions.length) * 100 : 0;
    const totalVolume = positions.reduce((sum, position) => sum + toNumber(position.amount), 0);

    const totalResolvedStake = resolvedPositions.reduce((sum, position) => sum + toNumber(position.amount), 0);

    const realizedReturns = transactions
      .filter((tx) => tx.type === TxType.CLAIM)
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);

    const totalActiveStake = active.reduce((sum, position) => sum + toNumber(position.amount), 0);

    const totalActiveEstimatedValue = active.reduce((sum, position) => {
      const amount = toNumber(position.amount);
      const marketYes = toNumber(position.market.totalYes);
      const marketNo = toNumber(position.market.totalNo);
      const side = position.side === 'YES' ? 'YES' : 'NO';
      const multiplier = calculateMultiplier(marketYes, marketNo, side);
      return sum + amount * multiplier;
    }, 0);

    const totalFeePaid = losses.reduce((sum, position) => {
      const amount = toNumber(position.amount);
      return sum + amount * PLATFORM_FEE_RATE;
    }, 0);

    const depositValue = transactions
      .filter((tx) => tx.type === TxType.DEPOSIT)
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);

    const withdrawValue = transactions
      .filter((tx) => tx.type === TxType.WITHDRAWAL)
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);

    const availableVaultBalance = Math.max(0, depositValue - withdrawValue - totalActiveStake);
    const portfolioValue = availableVaultBalance + totalActiveEstimatedValue;

    const leaderboard = await prisma.user.findMany({
      select: {
        id: true,
        positions: { select: { amount: true } },
      },
    });

    const ranking = leaderboard
      .map((user) => ({
        id: user.id,
        volume: user.positions.reduce((sum, position) => sum + toNumber(position.amount), 0),
      }))
      .sort((a, b) => b.volume - a.volume)
      .findIndex((entry) => entry.id === userId);

    return res.status(200).json({
      success: true,
      data: {
        totalPredictions,
        totalPositions: totalPredictions,
        activePositions: active.length,
        closedPositions: resolvedPositions.length,
        resolvedPredictions: resolvedPositions.length,
        wins: wins.length,
        winRate: Number(successRate.toFixed(2)),
        successRate: Number(successRate.toFixed(2)),
        totalVolume: Number(totalVolume.toFixed(2)),
        totalWinnings: Number(realizedReturns.toFixed(2)),
        totalBet: Number(totalVolume.toFixed(2)),
        totalWon: Number(realizedReturns.toFixed(2)),
        realizedStake: Number(totalResolvedStake.toFixed(2)),
        realizedReturns: Number(realizedReturns.toFixed(2)),
        realizedPnl: Number((realizedReturns - totalResolvedStake).toFixed(2)),
        unrealizedStake: Number(totalActiveStake.toFixed(2)),
        unrealizedValue: Number(totalActiveEstimatedValue.toFixed(2)),
        unrealizedPnl: Number((totalActiveEstimatedValue - totalActiveStake).toFixed(2)),
        totalFeePaid: Number(totalFeePaid.toFixed(2)),
        portfolioValue: Number(portfolioValue.toFixed(2)),
        vaultBalance: Number(availableVaultBalance.toFixed(2)),
        totalDeposited: Number(depositValue.toFixed(2)),
        totalWithdrawn: Number(withdrawValue.toFixed(2)),
        ranking: ranking >= 0 ? ranking + 1 : null,
      },
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

router.get('/me/activity', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const limitRaw = Number(req.query.limit || 20);
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 20;

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.max(limit * 3, 40),
      select: {
        id: true,
        type: true,
        amount: true,
        token: true,
        txHash: true,
        createdAt: true,
      },
    });

    const betHashes = transactions.filter((tx) => tx.type === TxType.BET).map((tx) => tx.txHash);

    const [betPositions, claimedPositions] = await Promise.all([
      betHashes.length
        ? prisma.position.findMany({
            where: {
              userId,
              txHash: { in: betHashes },
            },
            include: {
              market: {
                select: {
                  id: true,
                  question: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      prisma.position.findMany({
        where: {
          userId,
          claimed: true,
          market: {
            status: { in: ['RESOLVED', 'CANCELLED'] },
          },
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          market: {
            select: {
              id: true,
              question: true,
              status: true,
              outcome: true,
              totalYes: true,
              totalNo: true,
            },
          },
        },
      }),
    ]);

    const betByHash = new Map(
      betPositions.map((position) => [position.txHash, position]),
    );

    const claimQueue = [...claimedPositions];

    const data = transactions
      .map((tx) => {
        if (tx.type === TxType.BET) {
          const bet = betByHash.get(tx.txHash);
          return {
            id: tx.id,
            type: tx.type,
            amount: toNumber(tx.amount),
            token: tx.token,
            createdAt: tx.createdAt,
            side: bet?.side || null,
            market: bet?.market
              ? {
                  id: bet.market.id,
                  title: bet.market.question,
                }
              : null,
            label: bet?.market?.question || 'Aposta registrada',
          };
        }

        if (tx.type === TxType.CLAIM) {
          const claimedPosition = claimQueue.shift();
          const market = claimedPosition?.market;

          return {
            id: tx.id,
            type: tx.type,
            amount: toNumber(tx.amount),
            token: tx.token,
            createdAt: tx.createdAt,
            side: claimedPosition?.side || null,
            market: market
              ? {
                  id: market.id,
                  title: market.question,
                }
              : null,
            label: market?.question || 'Ganho resgatado',
          };
        }

        return {
          id: tx.id,
          type: tx.type,
          amount: toNumber(tx.amount),
          token: tx.token,
          createdAt: tx.createdAt,
          side: null,
          market: null,
          label: 'Movimentação no cofre',
        };
      })
      .slice(0, limit);

    return res.status(200).json({ success: true, data, transactions: data });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch activity' });
  }
});

router.get('/me/portfolio-history', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const positions = await prisma.position.findMany({
      where: { userId },
      include: {
        market: {
          select: {
            status: true,
            outcome: true,
            endTime: true,
            resolvedAt: true,
            totalYes: true,
            totalNo: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (positions.length === 0) {
      return res.status(200).json({ success: true, data: [], history: [] });
    }

    const firstPositionDate = positions[0].createdAt;
    const period = typeof req.query.period === 'string' ? req.query.period : '30d';
    const startDate = getPeriodStart(period, firstPositionDate);

    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    const vaultTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: { in: [TxType.DEPOSIT, TxType.WITHDRAWAL] },
        createdAt: { lte: endDate },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        type: true,
        amount: true,
        createdAt: true,
      },
    });

    const history: Array<{ date: string; label: string; value: number }> = [];

    let txCursor = 0;
    let totalDeposited = 0;
    let totalWithdrawn = 0;

    for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      while (txCursor < vaultTransactions.length && vaultTransactions[txCursor].createdAt <= dayEnd) {
        const tx = vaultTransactions[txCursor];
        if (tx.type === TxType.DEPOSIT) totalDeposited += toNumber(tx.amount);
        if (tx.type === TxType.WITHDRAWAL) totalWithdrawn += toNumber(tx.amount);
        txCursor += 1;
      }

      let activeStake = 0;
      let activeEstimatedValue = 0;

      for (const position of positions) {
        if (position.createdAt > dayEnd) continue;

        const resolvedAt = position.market.resolvedAt || null;
        const endTime = position.market.endTime;
        const hasResolvedByDay =
          (resolvedAt && resolvedAt <= dayEnd) ||
          (['RESOLVED', 'CANCELLED'].includes(position.market.status) && endTime <= dayEnd);

        if (hasResolvedByDay) continue;

        const amount = toNumber(position.amount);
        const totalYes = toNumber(position.market.totalYes);
        const totalNo = toNumber(position.market.totalNo);
        const side = position.side === 'YES' ? 'YES' : 'NO';
        const odds = calculateMultiplier(totalYes, totalNo, side);

        activeStake += amount;
        activeEstimatedValue += amount * odds;
      }

      const available = Math.max(0, totalDeposited - totalWithdrawn - activeStake);
      const portfolioValue = available + activeEstimatedValue;

      history.push({
        date: new Date(day).toISOString(),
        label: new Date(day).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
        value: Number(portfolioValue.toFixed(2)),
      });
    }

    return res.status(200).json({ success: true, data: history, history });
  } catch (error) {
    console.error('Error fetching portfolio history:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch portfolio history' });
  }
});

router.get('/leaderboard', async (_req, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        positions: { select: { amount: true } },
      },
    });

    const ranking = users
      .map((user) => ({
        id: user.id,
        username: user.username || `user_${user.id.slice(0, 6)}`,
        avatarUrl: user.avatarUrl,
        totalVolume: user.positions.reduce((sum, position) => sum + toNumber(position.amount), 0),
      }))
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 100);

    return res.status(200).json({ success: true, data: ranking });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

export default router;
