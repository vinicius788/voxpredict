import { z } from 'zod';

// ─── Market ───────────────────────────────────────────────────────────────────

export const CreateMarketSchema = z.object({
  question: z.string().min(10, 'Mínimo 10 caracteres').max(200, 'Máximo 200 caracteres'),
  description: z.string().min(20, 'Descreva o mercado com mais detalhes').max(1000),
  category: z.string().min(2).max(50),
  endTime: z.string().datetime(),
  minBet: z.number().min(1).default(5),
  maxBet: z.number().max(100_000).default(1000),
  tags: z.array(z.string().max(30)).max(6).optional().default([]),
  contractAddress: z.string().optional(),
  token: z.string().min(2).max(10).optional(),
});

export const UpdateMarketSchema = z.object({
  question: z.string().min(10).max(200).optional(),
  description: z.string().min(20).max(1000).optional(),
  category: z.string().min(2).max(50).optional(),
  endTime: z.string().datetime().optional(),
  status: z.enum(['ACTIVE', 'CLOSED', 'RESOLVED', 'CANCELLED']).optional(),
  outcome: z.enum(['YES', 'NO', 'CANCELLED']).nullable().optional(),
});

export const MarketQuerySchema = z.object({
  search: z.string().max(100).optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.enum(['volume', 'newest', 'ending', 'resolvedAt']).optional(),
  includeAll: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
});

export const MarketQuoteQuerySchema = z.object({
  outcome: z.enum(['YES', 'NO']),
  direction: z.enum(['BUY', 'SELL']),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
});

// ─── Position / Trade ─────────────────────────────────────────────────────────

export const CreatePositionSchema = z.object({
  marketId: z.number().int().positive(),
  side: z.enum(['YES', 'NO']),
  amount: z.union([
    z.string().regex(/^\d+(\.\d+)?$/, 'Formato de valor inválido'),
    z.number().positive(),
  ]),
  token: z.string().min(2).max(10).default('USDT'),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
});

export const ClaimPositionSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  offChain: z.boolean().optional(),
});

// ─── Oracle ───────────────────────────────────────────────────────────────────

export const ResolveMarketSchema = z.object({
  outcome: z.enum(['YES', 'NO']),
  note: z.string().max(500).optional(),
});

// ─── Proposal ─────────────────────────────────────────────────────────────────

export const CreateProposalSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(20),
  category: z.string().min(2).max(50),
  resolveBy: z.string().datetime(),
  tags: z.array(z.string()).max(6).optional().default([]),
});

// ─── Comment ──────────────────────────────────────────────────────────────────

export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(500).trim(),
});

// ─── Notification ─────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
});

// ─── AI generation ────────────────────────────────────────────────────────────

export const GenerateMarketSchema = z.object({
  newsText: z.string().min(20).optional(),
  noticia: z.string().min(20).optional(),
  endDate: z.string().optional(),
  dataEncerramento: z.string().optional(),
});

// ─── Vault ────────────────────────────────────────────────────────────────────

export const VaultMutationSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'txHash inválido'),
  amount: z.union([z.string().regex(/^\d+(\.\d+)?$/), z.number().positive()]),
  token: z.string().min(2).max(10),
});
