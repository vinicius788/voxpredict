import express, { Request, Response } from 'express';
import { Prisma, TxType } from '@prisma/client';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';

// Load environment variables
dotenv.config();

// Initialize router
const router = express.Router();

// Import contract ABIs and addresses
import VoxPredictVaultABI from '../../contracts/abis/VoxPredictVault.json';
import addresses from '../../contracts/addresses.json';

const vaultMutationSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  amount: z.union([z.string().regex(/^\d+(\.\d+)?$/), z.number().positive()]),
  token: z.string().min(2).max(10).default('USDT'),
});

// Initialize provider
const getProvider = () => {
  const alchemyUrl = process.env.ALCHEMY_API_URL;
  if (!alchemyUrl) {
    throw new Error('ALCHEMY_API_URL not set in environment variables');
  }
  return new ethers.providers.JsonRpcProvider(alchemyUrl);
};

const toDecimal = (value: string | number) => new Prisma.Decimal(typeof value === 'number' ? value.toString() : value);

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

  return null;
};

const registerVaultTransaction = async (
  req: AuthenticatedRequest,
  res: Response,
  type: 'DEPOSIT' | 'WITHDRAWAL',
) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const parsed = vaultMutationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const payload = parsed.data;
  const token = payload.token.toUpperCase();

  const existing = await prisma.transaction.findUnique({
    where: { txHash: payload.txHash },
    select: { id: true, userId: true, type: true },
  });

  if (existing) {
    if (existing.userId === userId && existing.type === type) {
      return res.status(200).json({ success: true, duplicated: true });
    }

    return res.status(409).json({ success: false, error: 'Transaction already registered' });
  }

  const walletAddress = await resolveUserWalletAddress(req);

  try {
    const provider = getProvider();
    const [receipt, transaction] = await Promise.all([
      provider.getTransactionReceipt(payload.txHash),
      provider.getTransaction(payload.txHash),
    ]);

    if (!receipt || receipt.status !== 1) {
      return res.status(400).json({ success: false, error: 'Transação não confirmada na blockchain' });
    }

    if (walletAddress && transaction?.from?.toLowerCase() !== walletAddress) {
      return res.status(400).json({ success: false, error: 'Transação não pertence à carteira autenticada' });
    }
  } catch (error) {
    console.warn('Vault transaction on-chain validation skipped:', error);
  }

  const created = await prisma.transaction.create({
    data: {
      userId,
      type,
      amount: toDecimal(payload.amount),
      token,
      txHash: payload.txHash,
    },
  });

  return res.status(201).json({
    success: true,
    data: {
      id: created.id,
      type: created.type,
      amount: created.amount.toString(),
      token: created.token,
      txHash: created.txHash,
      createdAt: created.createdAt,
    },
  });
};

router.post('/deposit', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    return await registerVaultTransaction(req, res, TxType.DEPOSIT);
  } catch (error) {
    console.error('Error registering vault deposit:', error);
    return res.status(500).json({ success: false, error: 'Failed to register deposit' });
  }
});

router.post('/withdraw', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    return await registerVaultTransaction(req, res, TxType.WITHDRAWAL);
  } catch (error) {
    console.error('Error registering vault withdrawal:', error);
    return res.status(500).json({ success: false, error: 'Failed to register withdrawal' });
  }
});

// Get user vault stats
router.get('/user/:address', async (req: Request, res: Response) => {
  try {
    const address = String(req.params.address);

    if (!ethers.utils.isAddress(address)) {
      return res.status(400).json({ success: false, error: 'Invalid address' });
    }

    const provider = getProvider();
    const vaultContract = new ethers.Contract(
      addresses.VoxPredictVault,
      VoxPredictVaultABI,
      provider,
    );

    const userStats = await vaultContract.getUserStats(address);
    const canDeposit = await vaultContract.canDeposit(address);

    const formattedStats = {
      lockedBalance: ethers.utils.formatUnits(userStats.locked, 6), // USDT has 6 decimals
      isInPrediction: userStats.inPrediction,
      canDeposit,
      totalDeposited: ethers.utils.formatUnits(userStats.totalDep, 6),
      totalWithdrawn: ethers.utils.formatUnits(userStats.totalWith, 6),
      lastPredictionTime: userStats.lastPred.toNumber() > 0
        ? new Date(userStats.lastPred.toNumber() * 1000).toISOString()
        : null,
      predictionCount: userStats.predCount.toNumber(),
    };

    res.status(200).json({ success: true, stats: formattedStats });
  } catch (error) {
    console.error('Error fetching user vault stats:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get user predictions
router.get('/user/:address/predictions', async (req: Request, res: Response) => {
  try {
    const address = String(req.params.address);

    if (!ethers.utils.isAddress(address)) {
      return res.status(400).json({ success: false, error: 'Invalid address' });
    }

    const provider = getProvider();
    const vaultContract = new ethers.Contract(
      addresses.VoxPredictVault,
      VoxPredictVaultABI,
      provider,
    );

    const predictionIds = await vaultContract.getUserPredictions(address);

    // Get details for each prediction
    const predictions = await Promise.all(
      predictionIds.map(async (id: any) => {
        const prediction = await vaultContract.predictions(id);

        return {
          id,
          user: prediction.user,
          amount: ethers.utils.formatUnits(prediction.amount, 6), // USDT has 6 decimals
          marketId: prediction.marketId,
          isActive: prediction.isActive,
          timestamp: new Date(prediction.timestamp.toNumber() * 1000).toISOString(),
          outcome: prediction.outcome,
        };
      }),
    );

    res.status(200).json({ success: true, predictions });
  } catch (error) {
    console.error('Error fetching user predictions:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
