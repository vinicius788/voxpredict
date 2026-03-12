import express, { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) => {
  if (value === null || value === undefined) return 0;
  return Number(value.toString());
};

const createPositionSchema = z.object({
  marketId: z.number().int().positive(),
  side: z.enum(['YES', 'NO']),
  amount: z.union([
    z.string().regex(/^\d+(\.\d+)?$/),
    z.number().positive(),
  ]),
  token: z.string().min(2).max(10).default('USDT'),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

const claimSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

router.get('/my', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const positions = await prisma.position.findMany({
      where: { userId },
      include: {
        market: {
          select: {
            id: true,
            question: true,
            category: true,
            endTime: true,
            status: true,
            outcome: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: positions.map((position) => ({
        id: position.id,
        marketId: position.marketId,
        side: position.side,
        amount: toNumber(position.amount),
        token: position.token,
        txHash: position.txHash,
        claimed: position.claimed,
        createdAt: position.createdAt,
        market: position.market,
      })),
    });
  } catch (error) {
    console.error('Error fetching user positions:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch positions' });
  }
});

router.get('/market/:marketId', async (req: Request, res: Response) => {
  try {
    const marketId = Number(req.params.marketId);
    if (!Number.isInteger(marketId) || marketId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid market id' });
    }

    const [positions, totals] = await Promise.all([
      prisma.position.findMany({
        where: { marketId },
        select: {
          id: true,
          userId: true,
          side: true,
          amount: true,
          token: true,
          claimed: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.position.groupBy({
        by: ['side'],
        where: { marketId },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: positions.map((position) => ({
        ...position,
        amount: toNumber(position.amount),
      })),
      totals: totals.map((entry) => ({
        side: entry.side,
        count: entry._count._all,
        amount: toNumber(entry._sum.amount || 0),
      })),
    });
  } catch (error) {
    console.error('Error fetching market positions:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch market positions' });
  }
});

router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const parsed = createPositionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload',
        details: parsed.error.flatten(),
      });
    }

    const payload = parsed.data;
    const amountAsString = typeof payload.amount === 'number' ? payload.amount.toString() : payload.amount;
    const amount = new Prisma.Decimal(amountAsString);

    const txAlreadyRegistered = await prisma.position.findUnique({
      where: { txHash: payload.txHash },
      select: { id: true },
    });

    if (txAlreadyRegistered) {
      return res.status(409).json({ success: false, error: 'Transaction already registered' });
    }

    const market = await prisma.market.findUnique({
      where: { id: payload.marketId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!market) {
      return res.status(404).json({ success: false, error: 'Market not found' });
    }

    if (market.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Market is not active' });
    }

    const userAlreadyInMarket = await prisma.position.findFirst({
      where: {
        userId,
        marketId: payload.marketId,
      },
      select: { id: true },
    });

    const [position] = await prisma.$transaction([
      prisma.position.create({
        data: {
          userId,
          marketId: payload.marketId,
          side: payload.side,
          amount,
          token: payload.token.toUpperCase(),
          txHash: payload.txHash,
        },
      }),
      prisma.market.update({
        where: { id: payload.marketId },
        data: {
          totalVolume: { increment: amount },
          ...(payload.side === 'YES' ? { totalYes: { increment: amount } } : { totalNo: { increment: amount } }),
          ...(userAlreadyInMarket ? {} : { participants: { increment: 1 } }),
        },
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: 'BET',
          amount,
          token: payload.token.toUpperCase(),
          txHash: payload.txHash,
        },
      }),
    ]);

    const updatedMarket = await prisma.market.findUnique({
      where: { id: payload.marketId },
      select: { totalYes: true, totalNo: true, totalVolume: true },
    });

    if (updatedMarket) {
      const totalVolume = toNumber(updatedMarket.totalVolume);
      const totalYes = toNumber(updatedMarket.totalYes);
      const totalNo = toNumber(updatedMarket.totalNo);
      const yesProb = totalVolume > 0 ? (totalYes / totalVolume) * 100 : 50;
      const noProb = totalVolume > 0 ? (totalNo / totalVolume) * 100 : 50;

      await prisma.probabilitySnapshot.create({
        data: {
          marketId: payload.marketId,
          yesProb,
          noProb,
          volume: updatedMarket.totalVolume,
        },
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        ...position,
        amount: toNumber(position.amount),
      },
    });
  } catch (error) {
    console.error('Error creating position:', error);
    return res.status(500).json({ success: false, error: 'Failed to create position' });
  }
});

router.put('/:marketId/claim', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const marketId = Number(req.params.marketId);
    if (!Number.isInteger(marketId) || marketId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid market id' });
    }

    const parsed = claimSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload',
        details: parsed.error.flatten(),
      });
    }

    await prisma.position.updateMany({
      where: {
        userId,
        marketId,
        claimed: false,
      },
      data: { claimed: true },
    });

    const existingTx = await prisma.transaction.findUnique({
      where: { txHash: parsed.data.txHash },
      select: { id: true },
    });

    if (!existingTx) {
      await prisma.transaction.create({
        data: {
          userId,
          type: 'CLAIM',
          amount: new Prisma.Decimal(0),
          token: 'USDT',
          txHash: parsed.data.txHash,
        },
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error claiming position:', error);
    return res.status(500).json({ success: false, error: 'Failed to claim position' });
  }
});

export default router;
