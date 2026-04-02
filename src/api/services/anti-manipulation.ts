/**
 * Anti-manipulation guards for the VoxPredict prediction market.
 *
 * Checks run synchronously before any trade is executed.
 * All violations are logged to ManipulationLog for audit purposes.
 */

import { prisma } from '../db/prisma';

export interface TradeAttempt {
  userId: string;
  marketId: number;
  outcome: 'YES' | 'NO';
  direction: 'BUY' | 'SELL';
  amount: number; // USD for BUY, shares for SELL
}

export type ManipulationCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; code: string };

// Maximum trade size as a fraction of total pool liquidity
const MAX_POOL_IMPACT = 0.15; // 15%

// Rate limit: max trades per user per window
const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Wash trading cooldown: must wait N ms before reversing on same outcome
const WASH_TRADE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// New account restrictions
const NEW_ACCOUNT_DAYS = 7;
const NEW_ACCOUNT_MAX_TRADE = 500;

/**
 * Run all anti-manipulation checks. Returns allowed:true or a rejection reason.
 */
export async function checkAntiManipulation(
  trade: TradeAttempt,
): Promise<ManipulationCheckResult> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const washStart = new Date(Date.now() - WASH_TRADE_COOLDOWN_MS);

  const [market, user, recentTrades] = await Promise.all([
    prisma.market.findUnique({
      where: { id: trade.marketId },
      select: { totalYes: true, totalNo: true },
    }),
    prisma.user.findUnique({
      where: { id: trade.userId },
      select: { createdAt: true },
    }),
    prisma.position.findMany({
      where: {
        userId: trade.userId,
        marketId: trade.marketId,
        createdAt: { gte: windowStart },
      },
      select: { side: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  if (!market) return { allowed: false, reason: 'Mercado não encontrado.', code: 'MARKET_NOT_FOUND' };
  if (!user) return { allowed: false, reason: 'Usuário não encontrado.', code: 'USER_NOT_FOUND' };

  const poolYes = Number(market.totalYes);
  const poolNo = Number(market.totalNo);
  const totalLiquidity = poolYes + poolNo;

  // ─── Whale protection ──────────────────────────────────────────────────────
  if (totalLiquidity > 0 && trade.direction === 'BUY') {
    const impact = trade.amount / totalLiquidity;
    if (impact > MAX_POOL_IMPACT) {
      return {
        allowed: false,
        reason: `Trade de $${trade.amount.toFixed(0)} representa ${(impact * 100).toFixed(1)}% da liquidez do mercado (máx 15%). Divida em trades menores.`,
        code: 'WHALE_PROTECTION',
      };
    }
  }

  // ─── Rate limiting ─────────────────────────────────────────────────────────
  if (recentTrades.length >= RATE_LIMIT_COUNT) {
    return {
      allowed: false,
      reason: `Limite de ${RATE_LIMIT_COUNT} apostas por 5 minutos atingido. Aguarde.`,
      code: 'RATE_LIMIT',
    };
  }

  // ─── Wash trading ──────────────────────────────────────────────────────────
  // Bloqueiar: apostar no mesmo lado que acabou de reverter nos últimos 5 min
  const recentOnSameSide = recentTrades.filter(
    (t) => t.side === trade.outcome && t.createdAt >= washStart,
  );
  const recentOnOppositeSide = recentTrades.filter(
    (t) => t.side !== trade.outcome && t.createdAt >= washStart,
  );

  if (recentOnOppositeSide.length > 0 && recentOnSameSide.length === 0) {
    const minutesLeft = Math.ceil(
      (WASH_TRADE_COOLDOWN_MS - (Date.now() - recentOnOppositeSide[0].createdAt.getTime())) / 60000,
    );
    if (minutesLeft > 0) {
      return {
        allowed: false,
        reason: `Aguarde ${minutesLeft} minuto(s) antes de reverter posição para evitar wash trading.`,
        code: 'WASH_TRADING',
      };
    }
  }

  // ─── New account limits ────────────────────────────────────────────────────
  const accountAgeDays =
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);

  if (accountAgeDays < NEW_ACCOUNT_DAYS && trade.direction === 'BUY' && trade.amount > NEW_ACCOUNT_MAX_TRADE) {
    return {
      allowed: false,
      reason: `Contas com menos de ${NEW_ACCOUNT_DAYS} dias têm limite de $${NEW_ACCOUNT_MAX_TRADE} por aposta.`,
      code: 'NEW_ACCOUNT_LIMIT',
    };
  }

  return { allowed: true };
}

/**
 * Log a blocked manipulation attempt for audit trail.
 * Never throws — logging failure must not block the caller.
 */
export async function logManipulationAttempt(
  trade: TradeAttempt,
  result: ManipulationCheckResult & { allowed: false },
): Promise<void> {
  try {
    await prisma.manipulationLog.create({
      data: {
        userId: trade.userId,
        marketId: trade.marketId,
        attemptedAmount: trade.amount,
        outcome: trade.outcome,
        direction: trade.direction,
        code: result.code,
        reason: result.reason,
      },
    });
  } catch {
    // Intentionally swallowed — audit log must not affect trade flow
  }
}
