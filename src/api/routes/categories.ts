import express, { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) => Number((value || 0).toString());

const categoryPayload = z.object({
  key: z.string().min(2).max(80).optional(),
  label: z.string().min(2).max(80),
  description: z.string().max(240).optional().nullable(),
  icon: z.string().min(1).max(8).optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6})$/).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const reorderPayload = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

const buildMetricsMap = async () => {
  const markets = await prisma.market.findMany({
    select: {
      category: true,
      totalVolume: true,
    },
  });

  const map = new Map<string, { count: number; totalVolume: number }>();

  for (const market of markets) {
    const key = normalizeKey(market.category);
    const current = map.get(key) || { count: 0, totalVolume: 0 };
    map.set(key, {
      count: current.count + 1,
      totalVolume: current.totalVolume + toNumber(market.totalVolume),
    });
  }

  return map;
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const [categories, metricsMap] = await Promise.all([
      prisma.category.findMany({
        where: includeInactive ? {} : { active: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      buildMetricsMap(),
    ]);

    const mapped = categories.map((category) => {
      const metrics = metricsMap.get(category.key) || { count: 0, totalVolume: 0 };
      return {
        ...category,
        marketCount: metrics.count,
        totalVolume: Number(metrics.totalVolume.toFixed(2)),
      };
    });

    return res.status(200).json({
      success: true,
      data: mapped,
      categories: mapped,
    });
  } catch (error) {
    console.error('Error listing categories:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao carregar categorias',
      data: [],
      categories: [],
    });
  }
});

router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = categoryPayload.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const payload = parsed.data;
    const key = normalizeKey(payload.key || payload.label);
    if (!key) {
      return res.status(400).json({ success: false, error: 'Invalid category key' });
    }

    const last = await prisma.category.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const created = await prisma.category.create({
      data: {
        key,
        label: payload.label.trim(),
        description: payload.description?.trim() || null,
        icon: payload.icon || '🎯',
        color: payload.color || '#7C3AED',
        active: payload.active ?? true,
        sortOrder: payload.sortOrder ?? (last?.sortOrder || 0) + 1,
      },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Category already exists' });
    }
    console.error('Error creating category:', error);
    return res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = categoryPayload.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const payload = parsed.data;
    const data: Record<string, unknown> = {};

    if (payload.label !== undefined) {
      data.label = payload.label.trim();
      data.key = normalizeKey(payload.key || payload.label);
    } else if (payload.key !== undefined) {
      data.key = normalizeKey(payload.key);
    }
    if (payload.description !== undefined) data.description = payload.description?.trim() || null;
    if (payload.icon !== undefined) data.icon = payload.icon;
    if (payload.color !== undefined) data.color = payload.color;
    if (payload.active !== undefined) data.active = payload.active;
    if (payload.sortOrder !== undefined) data.sortOrder = payload.sortOrder;

    const updated = await prisma.category.update({
      where: { id: String(req.params.id) },
      data,
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    if (error?.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Category key already exists' });
    }
    console.error('Error updating category:', error);
    return res.status(500).json({ success: false, error: 'Failed to update category' });
  }
});

router.put('/reorder/list', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = reorderPayload.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() });
    }

    await prisma.$transaction(
      parsed.data.orderedIds.map((id, index) =>
        prisma.category.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error reordering categories:', error);
    return res.status(500).json({ success: false, error: 'Failed to reorder categories' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.category.update({
      where: { id: String(req.params.id) },
      data: { active: false },
    });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    console.error('Error deleting category:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

export default router;
