import express, { Request, Response } from 'express';
import { ProposalStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

const createProposalSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(20).max(1200),
  category: z.string().min(2).max(50),
  resolveBy: z.string().min(10),
  tags: z.array(z.string().min(1).max(40)).max(10).optional(),
});

const approveProposalSchema = z.object({
  title: z.string().min(10).max(200).optional(),
  description: z.string().min(20).max(1200).optional(),
  category: z.string().min(2).max(50).optional(),
  resolveBy: z.string().min(10).optional(),
  tags: z.array(z.string().min(1).max(40)).max(10).optional(),
  minBet: z.number().min(1).optional(),
  maxBet: z.number().min(1).max(100000).optional(),
  adminNote: z.string().max(500).optional(),
});

const rejectProposalSchema = z.object({
  adminNote: z.string().min(3).max(500),
});

const parseProposalId = (rawId: string) => {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
};

const parseResolveDate = (raw: string) => {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return Number(value.toString());
};

const mapProposal = (proposal: {
  id: number;
  title: string;
  description: string;
  category: string;
  resolveBy: Date;
  tags: string[];
  status: ProposalStatus;
  userId: string;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email: string;
    username: string | null;
  };
}) => ({
  id: proposal.id,
  title: proposal.title,
  description: proposal.description,
  category: proposal.category,
  resolveBy: proposal.resolveBy,
  tags: proposal.tags || [],
  status: proposal.status,
  userId: proposal.userId,
  adminNote: proposal.adminNote,
  createdAt: proposal.createdAt,
  updatedAt: proposal.updatedAt,
  user: proposal.user
    ? {
        id: proposal.user.id,
        email: proposal.user.email,
        username: proposal.user.username,
      }
    : undefined,
});

router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const parsed = createProposalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const resolveBy = parseResolveDate(parsed.data.resolveBy);
    if (!resolveBy) {
      return res.status(400).json({ success: false, error: 'Data de resolução inválida' });
    }

    const proposal = await prisma.marketProposal.create({
      data: {
        title: parsed.data.title.trim(),
        description: parsed.data.description.trim(),
        category: parsed.data.category.trim(),
        resolveBy,
        tags: parsed.data.tags || [],
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return res.status(201).json({ success: true, data: mapProposal(proposal) });
  } catch (error) {
    console.error('Error creating proposal:', error);
    return res.status(500).json({ success: false, error: 'Failed to create proposal' });
  }
});

router.get('/my', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const proposals = await prisma.marketProposal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return res.status(200).json({ success: true, data: proposals.map(mapProposal) });
  } catch (error) {
    console.error('Error listing my proposals:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch proposals' });
  }
});

router.get('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const statusRaw = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : '';
    const status =
      statusRaw === 'PENDING' || statusRaw === 'APPROVED' || statusRaw === 'REJECTED'
        ? (statusRaw as ProposalStatus)
        : undefined;

    const proposals = await prisma.marketProposal.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    const pendingCount = proposals.filter((item) => item.status === 'PENDING').length;

    return res.status(200).json({
      success: true,
      data: proposals.map(mapProposal),
      pendingCount,
    });
  } catch (error) {
    console.error('Error listing proposals:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch proposals' });
  }
});

router.put('/:id/approve', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const proposalId = parseProposalId(String(req.params.id));
    if (!proposalId) {
      return res.status(400).json({ success: false, error: 'Invalid proposal id' });
    }

    const parsed = approveProposalSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const proposal = await prisma.marketProposal.findUnique({
      where: { id: proposalId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    if (proposal.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Proposal is not pending' });
    }

    const nextResolveBy = parsed.data.resolveBy ? parseResolveDate(parsed.data.resolveBy) : proposal.resolveBy;
    if (!nextResolveBy) {
      return res.status(400).json({ success: false, error: 'Invalid resolveBy date' });
    }

    const latest = await prisma.market.aggregate({ _max: { id: true } });
    const nextMarketId = (latest._max.id || 0) + 1;

    const market = await prisma.market.create({
      data: {
        id: nextMarketId,
        contractAddress: `offchain-${nextMarketId}`,
        question: (parsed.data.title || proposal.title).trim(),
        description: (parsed.data.description || proposal.description).trim(),
        category: (parsed.data.category || proposal.category).trim(),
        endTime: nextResolveBy,
        status: 'ACTIVE',
        totalVolume: 0,
        totalYes: 0,
        totalNo: 0,
        participants: 0,
        token: 'USDT',
      },
    });

    const updatedProposal = await prisma.marketProposal.update({
      where: { id: proposalId },
      data: {
        status: 'APPROVED',
        title: parsed.data.title || proposal.title,
        description: parsed.data.description || proposal.description,
        category: parsed.data.category || proposal.category,
        resolveBy: nextResolveBy,
        tags: parsed.data.tags || proposal.tags,
        adminNote: parsed.data.adminNote || null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        proposal: mapProposal(updatedProposal),
        market: {
          id: market.id,
          question: market.question,
          description: market.description,
          category: market.category,
          endTime: market.endTime,
          status: market.status,
          totalVolume: toNumber(market.totalVolume),
        },
      },
    });
  } catch (error) {
    console.error('Error approving proposal:', error);
    return res.status(500).json({ success: false, error: 'Failed to approve proposal' });
  }
});

router.put('/:id/reject', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const proposalId = parseProposalId(String(req.params.id));
    if (!proposalId) {
      return res.status(400).json({ success: false, error: 'Invalid proposal id' });
    }

    const parsed = rejectProposalSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const proposal = await prisma.marketProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    if (proposal.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Proposal is not pending' });
    }

    const updated = await prisma.marketProposal.update({
      where: { id: proposalId },
      data: {
        status: 'REJECTED',
        adminNote: parsed.data.adminNote.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return res.status(200).json({ success: true, data: mapProposal(updated) });
  } catch (error) {
    console.error('Error rejecting proposal:', error);
    return res.status(500).json({ success: false, error: 'Failed to reject proposal' });
  }
});

export default router;
