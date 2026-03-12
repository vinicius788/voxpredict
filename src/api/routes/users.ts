import express, { Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

const updateUserSchema = z.object({
  username: z.string().min(2).max(32).optional(),
  avatarUrl: z.string().url().optional(),
});

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) => Number((value || 0).toString());

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

    const [positions, totalDeposited, totalWithdrawn] = await Promise.all([
      prisma.position.findMany({
        where: { userId },
        include: {
          market: {
            select: {
              status: true,
              outcome: true,
              endTime: true,
              totalYes: true,
              totalNo: true,
            },
          },
        },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: 'DEPOSIT' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: 'WITHDRAWAL' },
        _sum: { amount: true },
      }),
    ]);

    const totalPredictions = positions.length;
    const resolvedPositions = positions.filter((position) => position.market.status === 'RESOLVED');
    const wins = resolvedPositions.filter((position) =>
      (position.side === 'YES' && position.market.outcome === 'YES') ||
      (position.side === 'NO' && position.market.outcome === 'NO'),
    );
    const successRate = resolvedPositions.length > 0 ? (wins.length / resolvedPositions.length) * 100 : 0;
    const totalVolume = positions.reduce((sum, position) => sum + toNumber(position.amount), 0);
    const totalWinnings = wins.reduce((sum, position) => {
      const side = position.side === 'YES' ? 'YES' : 'NO';
      const marketTotalYes = toNumber(position.market.totalYes);
      const marketTotalNo = toNumber(position.market.totalNo);
      const losingPool = side === 'YES' ? marketTotalNo : marketTotalYes;
      const winningPool = side === 'YES' ? marketTotalYes : marketTotalNo;
      const amount = toNumber(position.amount);
      if (winningPool <= 0) return sum + amount;

      const feeDeducted = losingPool * 0.03;
      const userShare = amount / winningPool;
      const winnings = amount + (losingPool - feeDeducted) * userShare;
      return sum + winnings;
    }, 0);
    const depositValue = toNumber(totalDeposited._sum.amount || 0);
    const withdrawValue = toNumber(totalWithdrawn._sum.amount || 0);
    const portfolioValue = depositValue - withdrawValue;

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
        activePositions: positions.filter((position) => position.market.status === 'ACTIVE').length,
        resolvedPredictions: resolvedPositions.length,
        wins: wins.length,
        winRate: Number(successRate.toFixed(2)),
        successRate: Number(successRate.toFixed(2)),
        totalVolume,
        totalWinnings: Number(totalWinnings.toFixed(2)),
        portfolioValue: Number(portfolioValue.toFixed(2)),
        vaultBalance: Number(portfolioValue.toFixed(2)),
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
