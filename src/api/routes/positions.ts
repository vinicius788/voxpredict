import express, { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ethers } from 'ethers';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { validateBetTx, validateClaimTx } from '../services/tx-validator';

const router = express.Router();

const TOKEN_DECIMALS: Record<string, number> = {
  USDT: 6,
  USDC: 6,
  DAI: 18,
};

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) => {
  if (value === null || value === undefined) return 0;
  return Number(value.toString());
};

const getTokenDecimals = (token: string) => TOKEN_DECIMALS[token.toUpperCase()] ?? 6;

const CATEGORY_EMOJI: Record<string, string> = {
  politica: 'POL',
  cripto: 'CRP',
  esportes: 'ESP',
  economia: 'ECO',
  tecnologia: 'TEC',
  geopolitica: 'GEO',
};

const getCategoryEmoji = (category: string) => {
  const normalized = category.toLowerCase();
  return CATEGORY_EMOJI[normalized] || 'MKT';
};

const calculateCurrentOdds = (totalYes: number, totalNo: number, side: 'YES' | 'NO') => {
  const total = totalYes + totalNo;
  const sidePool = side === 'YES' ? totalYes : totalNo;

  if (total <= 0 || sidePool <= 0) return 2;

  return (total * 0.97) / sidePool;
};

const isHexAddress = (value?: string | null) => Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));

const calculateResolvedPayout = (
  stake: number,
  side: 'YES' | 'NO',
  outcome: string | null,
  yesPool: number,
  noPool: number,
) => {
  if (outcome === 'CANCELLED') return stake;
  if (outcome !== 'YES' && outcome !== 'NO') return 0;

  const isWinner = (side === 'YES' && outcome === 'YES') || (side === 'NO' && outcome === 'NO');
  if (!isWinner) return 0;

  const winningPool = side === 'YES' ? yesPool : noPool;
  const losingPool = side === 'YES' ? noPool : yesPool;
  if (winningPool <= 0) return stake;

  const distributableLosingPool = losingPool * 0.97;
  return stake + distributableLosingPool * (stake / winningPool);
};

const resolveUserWalletAddress = async (req: AuthenticatedRequest): Promise<string | null> => {
  const walletFromToken = req.user?.walletAddress?.toLowerCase();
  if (walletFromToken && ethers.utils.isAddress(walletFromToken)) {
    return walletFromToken;
  }

  if (req.user?.id) {
    const persisted = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { walletAddress: true },
    });
    if (persisted?.walletAddress && ethers.utils.isAddress(persisted.walletAddress)) {
      return persisted.walletAddress.toLowerCase();
    }
  }

  if (req.user?.email) {
    const persisted = await prisma.user.findFirst({
      where: { email: { equals: req.user.email, mode: 'insensitive' } },
      select: { walletAddress: true },
    });
    if (persisted?.walletAddress && ethers.utils.isAddress(persisted.walletAddress)) {
      return persisted.walletAddress.toLowerCase();
    }
  }

  return null;
};

const createPositionSchema = z.object({
  marketId: z.number().int().positive(),
  side: z.enum(['YES', 'NO']),
  amount: z.union([
    z.string().regex(/^\d+(\.\d+)?$/),
    z.number().positive(),
  ]),
  token: z.string().min(2).max(10).default('USDT'),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
});

const claimSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  offChain: z.boolean().optional(),
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
            totalYes: true,
            totalNo: true,
            contractAddress: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: positions.map((position) => {
        const amount = toNumber(position.amount);
        const totalYes = toNumber(position.market.totalYes);
        const totalNo = toNumber(position.market.totalNo);
        const currentOdds = calculateCurrentOdds(totalYes, totalNo, position.side as 'YES' | 'NO');
        const estimatedValue = amount * currentOdds;

        return {
          id: position.id,
          marketId: position.marketId,
          side: position.side,
          amount,
          token: position.token,
          txHash: position.txHash,
          claimed: position.claimed,
          createdAt: position.createdAt,
          currentOdds: Number(currentOdds.toFixed(4)),
          estimatedValue: Number(estimatedValue.toFixed(4)),
          estimatedProfit: Number((estimatedValue - amount).toFixed(4)),
          market: {
            ...position.market,
            title: position.market.question,
            closeTime: position.market.endTime,
            yesPool: totalYes,
            noPool: totalNo,
            totalYes,
            totalNo,
            contractAddress: position.market.contractAddress,
            category: {
              name: position.market.category,
              emoji: getCategoryEmoji(position.market.category),
            },
          },
        };
      }),
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
    const tokenSymbol = payload.token.toUpperCase();
    const tokenDecimals = getTokenDecimals(tokenSymbol);

    const market = await prisma.market.findUnique({
      where: { id: payload.marketId },
      select: {
        id: true,
        status: true,
        endTime: true,
        token: true,
        contractAddress: true,
      },
    });

    if (!market) {
      return res.status(404).json({ success: false, error: 'Market not found' });
    }

    if (market.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Mercado encerrado para novas apostas' });
    }

    if (new Date(market.endTime).getTime() <= Date.now()) {
      return res.status(400).json({ success: false, error: 'Mercado encerrado para novas apostas' });
    }

    if (market.token.toUpperCase() !== tokenSymbol) {
      return res.status(400).json({ success: false, error: 'Token da aposta nao confere com o mercado' });
    }

    const isOffChainMarket = !isHexAddress(market.contractAddress);
    const providedTxHash = payload.txHash;

    if (providedTxHash) {
      const txAlreadyRegistered = await prisma.position.findUnique({
        where: { txHash: providedTxHash },
        select: { id: true },
      });

      if (txAlreadyRegistered) {
        return res.status(409).json({ success: false, error: 'Transaction already registered' });
      }
    }

    let effectiveTxHash = providedTxHash;

    if (isOffChainMarket) {
      effectiveTxHash = `offchain_bet_${payload.marketId}_${userId}_${Date.now()}`;
    } else {
      if (!providedTxHash) {
        return res.status(400).json({ success: false, error: 'txHash é obrigatório para mercados on-chain' });
      }

      const walletAddress = await resolveUserWalletAddress(req);
      if (!walletAddress) {
        return res.status(400).json({ success: false, error: 'Carteira nao vinculada a conta' });
      }

      let expectedAmountOnChain;
      try {
        expectedAmountOnChain = ethers.utils.parseUnits(amountAsString, tokenDecimals);
      } catch {
        return res.status(400).json({ success: false, error: 'Valor invalido para o token selecionado' });
      }

      const validation = await validateBetTx(
        providedTxHash,
        walletAddress,
        payload.marketId,
        expectedAmountOnChain,
        payload.side === 'YES',
      );

      if (!validation.valid) {
        return res.status(400).json({ success: false, error: `Transacao invalida: ${validation.error}` });
      }
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
          token: tokenSymbol,
          txHash: effectiveTxHash as string,
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
          token: tokenSymbol,
          txHash: effectiveTxHash as string,
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
      offChain: isOffChainMarket,
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

    const position = await prisma.position.findFirst({
      where: { userId, marketId },
      select: {
        id: true,
        claimed: true,
        token: true,
        side: true,
        amount: true,
        market: {
          select: {
            status: true,
            outcome: true,
            endTime: true,
            totalYes: true,
            totalNo: true,
            contractAddress: true,
          },
        },
      },
    });

    if (!position) {
      return res.status(404).json({ success: false, error: 'Position not found' });
    }

    if (position.claimed) {
      return res.status(409).json({ success: false, error: 'Position already claimed' });
    }

    const tokenSymbol = position.token.toUpperCase();
    const isOffChainMarket = !isHexAddress(position.market.contractAddress);
    const shouldUseOffChainClaim = isOffChainMarket;

    let claimAmount: Prisma.Decimal = new Prisma.Decimal(0);
    let txHashToStore = parsed.data.txHash || '';

    if (shouldUseOffChainClaim) {
      const marketStatus = String(position.market.status || '').toUpperCase();
      const outcome = position.market.outcome ? String(position.market.outcome).toUpperCase() : null;

      if (!['RESOLVED', 'CANCELLED'].includes(marketStatus)) {
        return res.status(400).json({ success: false, error: 'Mercado ainda não foi resolvido' });
      }

      const amount = toNumber(position.amount);
      const yesPool = toNumber(position.market.totalYes);
      const noPool = toNumber(position.market.totalNo);
      const payout = calculateResolvedPayout(amount, position.side as 'YES' | 'NO', outcome, yesPool, noPool);

      if (payout <= 0) {
        return res.status(400).json({ success: false, error: 'Sem ganhos disponíveis para saque' });
      }

      claimAmount = new Prisma.Decimal(payout.toFixed(6));
      txHashToStore = `offchain_claim_${marketId}_${userId}_${Date.now()}`;
    } else {
      const walletAddress = await resolveUserWalletAddress(req);
      if (!walletAddress) {
        return res.status(400).json({ success: false, error: 'Carteira nao vinculada a conta' });
      }

      if (!parsed.data.txHash) {
        return res.status(400).json({ success: false, error: 'txHash é obrigatório para saque on-chain' });
      }

      const validation = await validateClaimTx(parsed.data.txHash, walletAddress, marketId);
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: `Claim invalido: ${validation.error}` });
      }

      claimAmount = validation.amount
        ? new Prisma.Decimal(ethers.utils.formatUnits(validation.amount, getTokenDecimals(tokenSymbol)))
        : new Prisma.Decimal(0);
      txHashToStore = parsed.data.txHash;
    }

    const updated = await prisma.position.updateMany({
      where: {
        userId,
        marketId,
        claimed: false,
      },
      data: { claimed: true },
    });

    if (updated.count === 0) {
      return res.status(409).json({ success: false, error: 'Position already claimed' });
    }

    if (txHashToStore) {
      const existingTx = await prisma.transaction.findUnique({
        where: { txHash: txHashToStore },
        select: { id: true },
      });

      if (!existingTx) {
        await prisma.transaction.create({
          data: {
            userId,
            type: 'CLAIM',
            amount: claimAmount,
            token: tokenSymbol,
            txHash: txHashToStore,
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      offChain: shouldUseOffChainClaim,
      amount: claimAmount.toString(),
    });
  } catch (error) {
    console.error('Error claiming position:', error);
    return res.status(500).json({ success: false, error: 'Failed to claim position' });
  }
});

export default router;
