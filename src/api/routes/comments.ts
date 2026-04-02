import express, { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

const PAGE_SIZE = 20;

const createCommentSchema = z.object({
  content: z.string().min(1).max(500).trim(),
});

// GET /comments/:marketId?cursor=xxx — lista paginada por cursor
router.get('/:marketId', async (req: Request, res: Response) => {
  try {
    const marketId = Number(req.params.marketId);
    if (!Number.isInteger(marketId) || marketId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid market id' });
    }

    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

    const comments = await prisma.comment.findMany({
      where: { marketId },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, walletAddress: true },
        },
      },
    });

    const hasMore = comments.length > PAGE_SIZE;
    const items = hasMore ? comments.slice(0, PAGE_SIZE) : comments;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const data = items.map((c) => ({
      id: c.id,
      content: c.content,
      upvotes: c.upvotes,
      createdAt: c.createdAt,
      user: {
        id: c.user.id,
        username:
          c.user.username ||
          (c.user.walletAddress
            ? `${c.user.walletAddress.slice(0, 6)}...${c.user.walletAddress.slice(-4)}`
            : 'Anônimo'),
        avatarUrl: c.user.avatarUrl,
      },
    }));

    return res.status(200).json({ success: true, data, nextCursor, hasMore });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch comments' });
  }
});

// POST /comments/:marketId — criar comentário (requer auth)
router.post('/:marketId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const marketId = Number(req.params.marketId);
  if (!Number.isInteger(marketId) || marketId <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid market id' });
  }

  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Conteúdo inválido', details: parsed.error.flatten() });
  }

  try {
    const market = await prisma.market.findUnique({ where: { id: marketId }, select: { id: true } });
    if (!market) return res.status(404).json({ success: false, error: 'Market not found' });

    const comment = await prisma.comment.create({
      data: {
        marketId,
        userId,
        content: parsed.data.content,
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, walletAddress: true } },
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: comment.id,
        content: comment.content,
        upvotes: comment.upvotes,
        createdAt: comment.createdAt,
        user: {
          id: comment.user.id,
          username:
            comment.user.username ||
            (comment.user.walletAddress
              ? `${comment.user.walletAddress.slice(0, 6)}...${comment.user.walletAddress.slice(-4)}`
              : 'Anônimo'),
          avatarUrl: comment.user.avatarUrl,
        },
      },
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return res.status(500).json({ success: false, error: 'Failed to create comment' });
  }
});

// POST /comments/upvote/:commentId — upvote (requer auth)
router.post('/upvote/:commentId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const commentId = String(req.params.commentId);

  try {
    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { upvotes: { increment: 1 } },
      select: { id: true, upvotes: true },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error upvoting comment:', error);
    return res.status(500).json({ success: false, error: 'Failed to upvote comment' });
  }
});

export default router;
