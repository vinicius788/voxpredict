import express, { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

const roleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) => Number((value || 0).toString());

router.get('/stats', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const platformFeeRate = 0.03;

    const [
      activeMarkets,
      totalUsers,
      totalMarkets,
      resolvedMarkets,
      totalPositions,
      totalMarketVolumeAgg,
      volume24hAgg,
      dailyRevenueAgg,
      weeklyRevenueAgg,
      monthlyRevenueAgg,
      newUsersToday,
      pendingBets,
      thisWeekUsers,
      lastWeekUsers,
      categoryVolumeRows,
    ] = await Promise.all([
      prisma.market.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count(),
      prisma.market.count(),
      prisma.market.count({ where: { status: 'RESOLVED' } }),
      prisma.position.count(),
      prisma.market.aggregate({ _sum: { totalVolume: true } }),
      prisma.position.aggregate({
        where: { createdAt: { gte: oneDayAgo } },
        _sum: { amount: true },
      }),
      prisma.position.aggregate({
        where: { createdAt: { gte: startOfToday } },
        _sum: { amount: true },
      }),
      prisma.position.aggregate({
        where: { createdAt: { gte: sevenDaysAgo } },
        _sum: { amount: true },
      }),
      prisma.position.aggregate({
        where: { createdAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
      prisma.user.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      prisma.position.count({
        where: {
          market: { status: 'RESOLVED' },
          claimed: false,
        },
      }),
      prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      }),
      prisma.market.groupBy({
        by: ['category'],
        _sum: { totalVolume: true },
      }),
    ]);

    const normalizeCategory = (value: string) =>
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const totalVolume = toNumber(totalMarketVolumeAgg._sum.totalVolume);
    const totalRevenue = totalVolume * platformFeeRate;
    const volume24h = toNumber(volume24hAgg._sum.amount);
    const revenueToday = toNumber(dailyRevenueAgg._sum.amount) * platformFeeRate;
    const revenueWeek = toNumber(weeklyRevenueAgg._sum.amount) * platformFeeRate;
    const revenueMonth = toNumber(monthlyRevenueAgg._sum.amount) * platformFeeRate;
    const userGrowthPercent =
      lastWeekUsers > 0 ? Number((((thisWeekUsers - lastWeekUsers) / lastWeekUsers) * 100).toFixed(1)) : 0;

    const categoryVolumeTotal = categoryVolumeRows.reduce(
      (sum, row) => sum + toNumber(row._sum.totalVolume),
      0,
    );

    const getCategoryShare = (...targets: string[]) => {
      if (!categoryVolumeTotal) return 0;
      const targetSet = new Set(targets.map((target) => normalizeCategory(target)));
      const categoryVolume = categoryVolumeRows.reduce((sum, row) => {
        const normalized = normalizeCategory(row.category);
        return targetSet.has(normalized) ? sum + toNumber(row._sum.totalVolume) : sum;
      }, 0);
      return Number(((categoryVolume / categoryVolumeTotal) * 100).toFixed(1));
    };

    const statsPayload = {
      activeMarkets: Number(activeMarkets ?? 0),
      totalUsers: Number(totalUsers ?? 0),
      totalMarkets: Number(totalMarkets ?? 0),
      totalPositions: Number(totalPositions ?? 0),
      totalVolume: Number(totalVolume.toFixed(2)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
      dailyRevenue: Number(revenueToday.toFixed(2)),
      resolvedMarkets: Number(resolvedMarkets ?? 0),
      volume24h: Number(volume24h.toFixed(2)),
      newUsersToday: Number(newUsersToday ?? 0),
      pendingBets: Number(pendingBets ?? 0),
      userGrowthPercent,
      revenueToday: Number(revenueToday.toFixed(2)),
      revenueWeek: Number(revenueWeek.toFixed(2)),
      revenueMonth: Number(revenueMonth.toFixed(2)),
      revenueTotal: Number(totalRevenue.toFixed(2)),
      projectedRevenue: Number(totalRevenue.toFixed(2)),
      cryptoShare: getCategoryShare('cripto'),
      politicsShare: getCategoryShare('politica', 'política'),
      economyShare: getCategoryShare('economia'),
    };

    return res.status(200).json({
      success: true,
      data: statsPayload,
      stats: statsPayload,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch admin stats' });
  }
});

router.get('/users', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          walletAddress: true,
          username: true,
          role: true,
          createdAt: true,
          _count: { select: { positions: true } },
        },
      }),
      prisma.user.count(),
    ]);

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('Error listing users:', error);
    return res.status(500).json({ success: false, error: 'Failed to list users' });
  }
});

router.put('/users/:id/role', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.id);
    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid role payload', details: parsed.error.flatten() });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: parsed.data.role },
      select: { id: true, email: true, role: true },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ success: false, error: 'Failed to update user role' });
  }
});

export default router;
