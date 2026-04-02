import express, { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
import { updateUserRankings } from '../jobs/update-rankings';

const router = express.Router();

router.use(authenticate, requireAdmin);

const resolveSchema = z.object({
  outcome: z.enum(['YES', 'NO']),
  note: z.string().max(500).optional(),
});

// GET /oracle/pending — mercados fechados aguardando resolução
router.get('/pending', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const markets = await prisma.market.findMany({
      where: { status: 'CLOSED' },
      orderBy: { endTime: 'asc' },
      include: {
        _count: { select: { positions: true } },
      },
    });

    const data = markets.map((m) => ({
      id: m.id,
      question: m.question,
      description: m.description,
      category: m.category,
      endTime: m.endTime,
      totalVolume: Number(m.totalVolume),
      totalYes: Number(m.totalYes),
      totalNo: Number(m.totalNo),
      participants: m.participants,
      positionCount: m._count.positions,
      contractAddress: m.contractAddress,
      token: m.token,
    }));

    return res.status(200).json({ success: true, data, total: data.length });
  } catch (error) {
    console.error('Oracle pending error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch pending markets' });
  }
});

// GET /oracle/history — mercados já resolvidos
router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const page = Math.max(1, Number(req.query.page || 1));
    const skip = (page - 1) * limit;

    const [markets, total] = await Promise.all([
      prisma.market.findMany({
        where: { status: 'RESOLVED' },
        orderBy: { resolvedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          question: true,
          category: true,
          outcome: true,
          totalVolume: true,
          totalYes: true,
          totalNo: true,
          participants: true,
          resolvedAt: true,
          endTime: true,
        },
      }),
      prisma.market.count({ where: { status: 'RESOLVED' } }),
    ]);

    return res.status(200).json({
      success: true,
      data: markets,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error('Oracle history error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch resolution history' });
  }
});

// GET /oracle/stats — resumo para o dashboard
router.get('/stats', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [pending, resolved, totalMarkets] = await Promise.all([
      prisma.market.count({ where: { status: 'CLOSED' } }),
      prisma.market.count({ where: { status: 'RESOLVED' } }),
      prisma.market.count(),
    ]);

    return res.status(200).json({
      success: true,
      data: { pending, resolved, totalMarkets, active: totalMarkets - pending - resolved },
    });
  } catch (error) {
    console.error('Oracle stats error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// POST /oracle/resolve/:id — resolver mercado com resultado YES ou NO
router.post('/resolve/:id', async (req: AuthenticatedRequest, res: Response) => {
  const marketId = Number(req.params.id);
  if (!Number.isInteger(marketId) || marketId <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid market ID' });
  }

  const parsed = resolveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Payload inválido',
      details: parsed.error.flatten(),
    });
  }

  const { outcome } = parsed.data;

  try {
    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market) {
      return res.status(404).json({ success: false, error: 'Market not found' });
    }

    if (market.status === 'RESOLVED') {
      return res.status(409).json({ success: false, error: 'Market already resolved' });
    }

    if (market.status === 'CANCELLED') {
      return res.status(409).json({ success: false, error: 'Market is cancelled' });
    }

    // Resolve market
    const resolved = await prisma.market.update({
      where: { id: marketId },
      data: {
        status: 'RESOLVED',
        outcome,
        resolvedAt: new Date(),
      },
    });

    // Count winning positions
    const winningPositions = await prisma.position.count({
      where: { marketId, side: outcome },
    });

    // Notify users with positions in this market
    const positions = await prisma.position.findMany({
      where: { marketId },
      select: { userId: true, side: true, amount: true },
    });

    const notifPromises = positions.map((position) => {
      const won = position.side === outcome;
      return prisma.notification.create({
        data: {
          userId: position.userId,
          type: won ? 'WIN' : 'LOSS',
          title: won ? '🎉 Você acertou!' : '😔 Não foi dessa vez',
          message: `${market.question} — Resultado: ${outcome}. ${
            won ? 'Você ganhou!' : 'Sua aposta não acertou o resultado.'
          }`,
        },
      });
    });

    await Promise.allSettled(notifPromises);

    // Recalculate rankings in background
    updateUserRankings().catch((err: unknown) =>
      console.error('Ranking update after resolution failed:', err),
    );

    return res.status(200).json({
      success: true,
      data: {
        id: resolved.id,
        outcome: resolved.outcome,
        resolvedAt: resolved.resolvedAt,
        winningPositions,
        totalPositions: positions.length,
      },
    });
  } catch (error) {
    console.error('Oracle resolve error:', error);
    return res.status(500).json({ success: false, error: 'Failed to resolve market' });
  }
});

// POST /oracle/cancel/:id — cancelar mercado (CANCELLED, reembolso)
router.post('/cancel/:id', async (req: AuthenticatedRequest, res: Response) => {
  const marketId = Number(req.params.id);
  if (!Number.isInteger(marketId) || marketId <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid market ID' });
  }

  try {
    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market) return res.status(404).json({ success: false, error: 'Market not found' });
    if (market.status === 'RESOLVED') {
      return res.status(409).json({ success: false, error: 'Cannot cancel a resolved market' });
    }

    await prisma.market.update({
      where: { id: marketId },
      data: { status: 'CANCELLED', outcome: 'CANCELLED', resolvedAt: new Date() },
    });

    // Notify users
    const positions = await prisma.position.findMany({
      where: { marketId },
      select: { userId: true },
    });

    await Promise.allSettled(
      positions.map((p) =>
        prisma.notification.create({
          data: {
            userId: p.userId,
            type: 'CANCEL',
            title: '⚠️ Mercado cancelado',
            message: `O mercado "${market.question}" foi cancelado. Sua aposta será reembolsada.`,
          },
        }),
      ),
    );

    return res.status(200).json({ success: true, message: 'Market cancelled' });
  } catch (error) {
    console.error('Oracle cancel error:', error);
    return res.status(500).json({ success: false, error: 'Failed to cancel market' });
  }
});

export default router;
