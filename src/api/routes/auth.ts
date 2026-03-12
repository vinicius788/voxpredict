import express, { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { SiweMessage } from 'siwe';
import { z } from 'zod';
import { prisma } from '../db/prisma';

const router = express.Router();

const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

const nonceQuerySchema = z.object({
  address: z.string().min(10),
});

const verifyBodySchema = z.object({
  message: z.string().min(10),
  signature: z.string().min(10),
});

const linkBodySchema = z.object({
  userId: z.string().min(1),
  walletAddress: z.string().min(10),
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

router.post('/link-wallet', async (req: Request, res: Response) => {
  const parsed = linkBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid payload' });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { walletAddress: parsed.data.walletAddress.toLowerCase() },
      select: { id: true, email: true, walletAddress: true, role: true },
    });

    return res.status(200).json({ success: true, user: updated });
  } catch (error) {
    console.error('Link wallet error:', error);
    return res.status(500).json({ success: false, error: 'Failed to link wallet' });
  }
});

export default router;
