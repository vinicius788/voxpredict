import express, { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const PLATFORM_FEE_BPS = 300;

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) => Number((value || 0).toString());

const toCsv = (headers: string[], rows: Array<Array<string | number>>) =>
  [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell);
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(','),
    )
    .join('\n');

router.get('/overview', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const markets = await prisma.market.findMany({
      select: {
        id: true,
        question: true,
        category: true,
        endTime: true,
        status: true,
        totalVolume: true,
      },
    });

    const withRevenue = markets.map((market) => {
      const volume = toNumber(market.totalVolume);
      const revenue = (volume * PLATFORM_FEE_BPS) / 10000;
      return { ...market, volume, revenue };
    });

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    const stats = {
      day: withRevenue.filter((market) => new Date(market.endTime).getTime() <= now + oneDay),
      week: withRevenue.filter((market) => new Date(market.endTime).getTime() <= now + oneWeek),
      month: withRevenue.filter((market) => new Date(market.endTime).getTime() <= now + oneMonth),
      longTerm: withRevenue.filter((market) => new Date(market.endTime).getTime() > now + oneMonth),
    };

    const byCategory = withRevenue.reduce<Record<string, number>>((acc, market) => {
      acc[market.category] = (acc[market.category] || 0) + market.revenue;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        totalMarkets: markets.length,
        totalProjectedRevenue: withRevenue.reduce((sum, market) => sum + market.revenue, 0),
        totalVolume: withRevenue.reduce((sum, market) => sum + market.volume, 0),
        sections: Object.fromEntries(
          Object.entries(stats).map(([key, entries]) => [
            key,
            {
              count: entries.length,
              revenue: entries.reduce((sum, entry) => sum + entry.revenue, 0),
            },
          ]),
        ),
        today: {
          count: stats.day.length,
          revenue: stats.day.reduce((sum, entry) => sum + entry.revenue, 0),
        },
        byCategory,
      },
    });
  } catch (error) {
    console.error('Error fetching finance overview:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch finance overview' });
  }
});

router.get('/revenue', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const period = typeof req.query.period === 'string' ? req.query.period : '30d';
    const daysByPeriod: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysByPeriod[period] || 30;

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const markets = await prisma.market.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, createdAt: true, totalVolume: true },
    });

    const grouped = new Map<string, { revenue: number; volume: number }>();
    markets.forEach((market) => {
      const key = market.createdAt.toISOString().slice(0, 10);
      const volume = toNumber(market.totalVolume);
      const revenue = (volume * PLATFORM_FEE_BPS) / 10000;
      const current = grouped.get(key) || { revenue: 0, volume: 0 };
      grouped.set(key, { revenue: current.revenue + revenue, volume: current.volume + volume });
    });

    return res.status(200).json({
      success: true,
      period,
      data: Array.from(grouped.entries()).map(([date, values]) => ({
        date,
        revenue: Number(values.revenue.toFixed(2)),
        volume: Number(values.volume.toFixed(2)),
      })),
    });
  } catch (error) {
    console.error('Error fetching revenue:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch revenue' });
  }
});

router.get('/export', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const markets = await prisma.market.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        question: true,
        category: true,
        status: true,
        totalVolume: true,
        participants: true,
        endTime: true,
      },
    });

    const totalRevenue = markets.reduce((sum, market) => sum + (toNumber(market.totalVolume) * PLATFORM_FEE_BPS) / 10000, 0);
    const csv = toCsv(
      ['market_id', 'question', 'category', 'status', 'volume', 'participants', 'end_time', 'projected_revenue', 'revenue_share_percent'],
      markets.map((market) => {
        const volume = toNumber(market.totalVolume);
        const projectedRevenue = (volume * PLATFORM_FEE_BPS) / 10000;
        const share = totalRevenue > 0 ? (projectedRevenue / totalRevenue) * 100 : 0;

        return [
          market.id,
          market.question,
          market.category,
          market.status,
          volume.toFixed(2),
          market.participants,
          market.endTime.toISOString(),
          projectedRevenue.toFixed(2),
          share.toFixed(2),
        ];
      }),
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="voxpredict-finance-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Error exporting finance CSV:', error);
    return res.status(500).json({ success: false, error: 'Failed to export finance data' });
  }
});

export default router;
