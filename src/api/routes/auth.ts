import express, { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { SiweMessage } from 'siwe';
import { z } from 'zod';
import { ethers } from 'ethers';
import { prisma } from '../db/prisma';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();
const walletLinkNonceStore = new Map<string, { nonce: string; message: string; expiresAt: number }>();

const nonceQuerySchema = z.object({
  address: z.string().min(10),
});

const verifyBodySchema = z.object({
  message: z.string().min(10),
  signature: z.string().min(10),
});

const linkWalletSchema = z.object({
  walletAddress: z.string().min(10),
  signature: z.string().min(10),
  message: z.string().min(10),
});

router.get('/nonce', (req: Request, res: Response) => {
  const parsed = nonceQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid address' });
  }

  const address = parsed.data.address.toLowerCase();
  const nonce = crypto.randomBytes(16).toString('hex');
  nonceStore.set(address, { nonce, expiresAt: Date.now() + 10 * 60 * 1000 });

  return res.status(200).json({ success: true, nonce });
});

router.post('/verify-wallet', async (req: Request, res: Response) => {
  const parsed = verifyBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid payload' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ success: false, error: 'JWT secret not configured' });
  }

  try {
    const message = new SiweMessage(parsed.data.message);
    const address = message.address.toLowerCase();
    const nonceEntry = nonceStore.get(address);

    if (!nonceEntry || nonceEntry.expiresAt < Date.now()) {
      return res.status(401).json({ success: false, error: 'Nonce expired' });
    }

    const verifyResult = await message.verify({
      signature: parsed.data.signature,
      nonce: nonceEntry.nonce,
      domain: message.domain,
    });

    if (!verifyResult.success) {
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    let user = await prisma.user.findFirst({
      where: { walletAddress: { equals: address, mode: 'insensitive' } },
    });

    if (!user) {
      const pseudoEmail = `${address.slice(2, 10)}@wallet.voxpredict`;
      user = await prisma.user.create({
        data: {
          email: pseudoEmail,
          walletAddress: address,
          username: `wallet_${address.slice(2, 8)}`,
        },
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: '12h' },
    );

    nonceStore.delete(address);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Wallet verification error:', error);
    return res.status(500).json({ success: false, error: 'Failed to verify wallet' });
  }
});

router.get('/wallet-nonce', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const message = `VoxPredict: vincule sua carteira.\nNonce: ${nonce}\nUsuario: ${userId}`;
  const expiresAt = Date.now() + 5 * 60 * 1000;

  walletLinkNonceStore.set(userId, { nonce, message, expiresAt });
  setTimeout(() => {
    const current = walletLinkNonceStore.get(userId);
    if (current?.nonce === nonce) {
      walletLinkNonceStore.delete(userId);
    }
  }, 5 * 60 * 1000);

  return res.status(200).json({ success: true, nonce, message });
});

router.post('/link-wallet', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = linkWalletSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid payload' });
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const walletAddress = parsed.data.walletAddress.toLowerCase();
    const nonceEntry = walletLinkNonceStore.get(userId);
    if (!nonceEntry || nonceEntry.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, error: 'Nonce invalido ou expirado' });
    }

    if (parsed.data.message !== nonceEntry.message || !parsed.data.message.includes(nonceEntry.nonce)) {
      return res.status(400).json({ success: false, error: 'Mensagem de assinatura invalida' });
    }

    if (!ethers.utils.isAddress(walletAddress)) {
      return res.status(400).json({ success: false, error: 'Endereco de carteira invalido' });
    }

    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.utils.verifyMessage(parsed.data.message, parsed.data.signature).toLowerCase();
    } catch {
      return res.status(400).json({ success: false, error: 'Falha ao verificar assinatura' });
    }

    if (recoveredAddress !== walletAddress) {
      return res.status(400).json({ success: false, error: 'Assinatura invalida para esta carteira' });
    }

    const existing = await prisma.user.findFirst({
      where: {
        walletAddress: { equals: walletAddress, mode: 'insensitive' },
        NOT: { id: userId },
      },
      select: { id: true },
    });

    if (existing) {
      return res.status(409).json({ success: false, error: 'Carteira ja vinculada a outra conta' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { walletAddress },
      select: { id: true, email: true, walletAddress: true, role: true },
    });

    walletLinkNonceStore.delete(userId);
    return res.status(200).json({ success: true, user: updated });
  } catch (error) {
    console.error('Link wallet error:', error);
    return res.status(500).json({ success: false, error: 'Failed to link wallet' });
  }
});

export default router;
