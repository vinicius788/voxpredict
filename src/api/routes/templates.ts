import express, { Request, Response } from 'express';
import { TemplateFrequency } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  computeInitialNextRunAt,
  createMarketFromTemplate,
  runAutoMarketCreator,
} from '../services/auto-market-creator';

const router = express.Router();

const templateSchema = z.object({
  name: z.string().min(3).max(100),
  titleTemplate: z.string().min(10).max(220),
  descTemplate: z.string().min(20).max(1200),
  category: z.string().min(2).max(50),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY']),
  variables: z.record(z.string(), z.string()).optional(),
  minBet: z.number().min(1).max(100000).optional(),
  maxBet: z.number().min(1).max(100000).optional(),
  active: z.boolean().optional(),
});

const updateTemplateSchema = templateSchema.partial();

const parseTemplateId = (rawId: string) => {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
};

const mapTemplate = (template: {
  id: number;
  name: string;
  titleTemplate: string;
  descTemplate: string;
  category: string;
  frequency: TemplateFrequency;
  variables: unknown;
  minBet: number;
  maxBet: number;
  active: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: template.id,
  name: template.name,
  titleTemplate: template.titleTemplate,
  descTemplate: template.descTemplate,
  category: template.category,
  frequency: template.frequency,
  variables: template.variables,
  minBet: template.minBet,
  maxBet: template.maxBet,
  active: template.active,
  lastRunAt: template.lastRunAt,
  nextRunAt: template.nextRunAt,
  createdAt: template.createdAt,
  updatedAt: template.updatedAt,
});

router.get('/', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const templates = await prisma.marketTemplate.findMany({
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    });
    return res.status(200).json({ success: true, data: templates.map(mapTemplate) });
  } catch (error) {
    console.error('Error listing templates:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = templateSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const created = await prisma.marketTemplate.create({
      data: {
        name: parsed.data.name.trim(),
        titleTemplate: parsed.data.titleTemplate.trim(),
        descTemplate: parsed.data.descTemplate.trim(),
        category: parsed.data.category.trim(),
        frequency: parsed.data.frequency,
        variables: parsed.data.variables || {},
        minBet: parsed.data.minBet ?? 5,
        maxBet: parsed.data.maxBet ?? 1000,
        active: parsed.data.active ?? true,
        nextRunAt: computeInitialNextRunAt(parsed.data.frequency),
      },
    });

    return res.status(201).json({ success: true, data: mapTemplate(created) });
  } catch (error) {
    console.error('Error creating template:', error);
    return res.status(500).json({ success: false, error: 'Failed to create template' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const templateId = parseTemplateId(String(req.params.id));
    if (!templateId) {
      return res.status(400).json({ success: false, error: 'Invalid template id' });
    }

    const parsed = updateTemplateSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const updateData = parsed.data;
    const updated = await prisma.marketTemplate.update({
      where: { id: templateId },
      data: {
        ...(updateData.name !== undefined ? { name: updateData.name.trim() } : {}),
        ...(updateData.titleTemplate !== undefined ? { titleTemplate: updateData.titleTemplate.trim() } : {}),
        ...(updateData.descTemplate !== undefined ? { descTemplate: updateData.descTemplate.trim() } : {}),
        ...(updateData.category !== undefined ? { category: updateData.category.trim() } : {}),
        ...(updateData.frequency !== undefined
          ? { frequency: updateData.frequency, nextRunAt: computeInitialNextRunAt(updateData.frequency) }
          : {}),
        ...(updateData.variables !== undefined ? { variables: updateData.variables } : {}),
        ...(updateData.minBet !== undefined ? { minBet: updateData.minBet } : {}),
        ...(updateData.maxBet !== undefined ? { maxBet: updateData.maxBet } : {}),
        ...(updateData.active !== undefined ? { active: updateData.active } : {}),
      },
    });

    return res.status(200).json({ success: true, data: mapTemplate(updated) });
  } catch (error) {
    console.error('Error updating template:', error);
    return res.status(500).json({ success: false, error: 'Failed to update template' });
  }
});

router.post('/:id/run', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const templateId = parseTemplateId(String(req.params.id));
    if (!templateId) {
      return res.status(400).json({ success: false, error: 'Invalid template id' });
    }

    const template = await prisma.marketTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const market = await createMarketFromTemplate(template);
    return res.status(200).json({ success: true, data: market });
  } catch (error) {
    console.error('Error running template:', error);
    return res.status(500).json({ success: false, error: 'Failed to run template' });
  }
});

router.post('/run-due', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await runAutoMarketCreator();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error running due templates:', error);
    return res.status(500).json({ success: false, error: 'Failed to run due templates' });
  }
});

export default router;
