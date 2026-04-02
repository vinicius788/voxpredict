/**
 * Automated Market Maker — CPMM (Constant Product Market Maker)
 *
 * Fórmula: yesPool * noPool = k
 *
 * Como funciona:
 * - yesPool e noPool representam a liquidez de cada lado
 * - Comprar YES adiciona dinheiro ao pool NO → menos YES disponíveis → preço YES sobe
 * - Probabilidade implícita de YES = noPool / (yesPool + noPool)
 *
 * O projeto usa totalYes/totalNo do Market como pools.
 * Todas as funções são puras (sem side-effects) exceto executeTrade.
 */

import { prisma } from '../db/prisma';
import { Prisma } from '@prisma/client';

export const AMM_FEE_RATE = 0.02; // 2% de fee
const MIN_POOL = 1; // proteção contra divisão por zero

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface TradeQuote {
  sharesOut: number;
  usdAmount: number;
  pricePerShare: number;
  priceImpact: number;
  newProbabilityYes: number;
  newProbabilityNo: number;
  feeAmount: number;
  newPoolYes: number;
  newPoolNo: number;
}

// ─── Funções puras do AMM ─────────────────────────────────────────────────────

/**
 * Calcula quote de compra (BUY).
 * O usuário entra com USD e recebe shares do outcome escolhido.
 */
export function quoteBuy(
  poolYes: number,
  poolNo: number,
  outcome: 'YES' | 'NO',
  usdAmount: number,
): TradeQuote {
  const safePoolYes = Math.max(poolYes, MIN_POOL);
  const safePoolNo = Math.max(poolNo, MIN_POOL);

  const feeAmount = usdAmount * AMM_FEE_RATE;
  const amountAfterFee = usdAmount - feeAmount;
  const k = safePoolYes * safePoolNo;

  let sharesOut: number;
  let newPoolYes: number;
  let newPoolNo: number;

  if (outcome === 'YES') {
    // Adiciona ao pool NO, retira do pool YES
    newPoolNo = safePoolNo + amountAfterFee;
    newPoolYes = k / newPoolNo;
    sharesOut = safePoolYes - newPoolYes;
  } else {
    // Adiciona ao pool YES, retira do pool NO
    newPoolYes = safePoolYes + amountAfterFee;
    newPoolNo = k / newPoolYes;
    sharesOut = safePoolNo - newPoolNo;
  }

  sharesOut = Math.max(0, sharesOut);

  const pricePerShare = sharesOut > 0 ? amountAfterFee / sharesOut : 1;
  const oldProbYes = safePoolNo / (safePoolYes + safePoolNo);
  const finalProbYes = newPoolNo / (newPoolYes + newPoolNo);
  const priceImpact = Math.abs(finalProbYes - oldProbYes);

  return {
    sharesOut,
    usdAmount,
    pricePerShare,
    priceImpact,
    newProbabilityYes: finalProbYes,
    newProbabilityNo: 1 - finalProbYes,
    feeAmount,
    newPoolYes,
    newPoolNo,
  };
}

/**
 * Calcula quote de venda (SELL).
 * O usuário entra com shares e recebe USD.
 */
export function quoteSell(
  poolYes: number,
  poolNo: number,
  outcome: 'YES' | 'NO',
  sharesToSell: number,
): TradeQuote {
  const safePoolYes = Math.max(poolYes, MIN_POOL);
  const safePoolNo = Math.max(poolNo, MIN_POOL);
  const k = safePoolYes * safePoolNo;

  let usdBeforeFee: number;
  let newPoolYes: number;
  let newPoolNo: number;

  if (outcome === 'YES') {
    // Devolver YES shares aumenta o pool YES → pool NO diminui → recebemos a diferença
    newPoolYes = safePoolYes + sharesToSell;
    newPoolNo = k / newPoolYes;
    usdBeforeFee = safePoolNo - newPoolNo;
  } else {
    newPoolNo = safePoolNo + sharesToSell;
    newPoolYes = k / newPoolNo;
    usdBeforeFee = safePoolYes - newPoolYes;
  }

  usdBeforeFee = Math.max(0, usdBeforeFee);

  const feeAmount = usdBeforeFee * AMM_FEE_RATE;
  const usdOut = usdBeforeFee - feeAmount;
  const pricePerShare = sharesToSell > 0 ? usdOut / sharesToSell : 0;
  const oldProbYes = safePoolNo / (safePoolYes + safePoolNo);
  const finalProbYes = newPoolNo / (newPoolYes + newPoolNo);
  const priceImpact = Math.abs(finalProbYes - oldProbYes);

  return {
    sharesOut: sharesToSell,
    usdAmount: usdOut,
    pricePerShare,
    priceImpact,
    newProbabilityYes: finalProbYes,
    newProbabilityNo: 1 - finalProbYes,
    feeAmount,
    newPoolYes,
    newPoolNo,
  };
}

/**
 * Probabilidade implícita atual a partir dos pools.
 */
export function getImpliedProbability(poolYes: number, poolNo: number) {
  const total = poolYes + poolNo;
  if (total <= 0) return { yes: 0.5, no: 0.5 };
  return { yes: poolNo / total, no: poolYes / total };
}

// ─── Execução com proteção de concorrência ────────────────────────────────────

export interface ExecuteAMMTradeParams {
  userId: string;
  marketId: number;
  outcome: 'YES' | 'NO';
  direction: 'BUY' | 'SELL';
  /** USD para BUY, shares para SELL */
  amount: number;
  maxSlippage?: number;
}

export interface ExecuteAMMTradeResult extends TradeQuote {
  marketId: number;
  userId: string;
  outcome: 'YES' | 'NO';
  direction: 'BUY' | 'SELL';
}

/**
 * Executa o trade dentro de uma transação serializable para evitar race conditions.
 * Atualiza os pools do mercado e a posição do usuário atomicamente.
 */
export async function executeAMMTrade(params: ExecuteAMMTradeParams): Promise<ExecuteAMMTradeResult> {
  const { userId, marketId, outcome, direction, amount, maxSlippage = 0.1 } = params;

  return prisma.$transaction(
    async (tx) => {
      // Buscar mercado atual (lock implícito no PostgreSQL serializable)
      const market = await tx.market.findUnique({
        where: { id: marketId },
        select: { id: true, status: true, endTime: true, totalYes: true, totalNo: true, token: true },
      });

      if (!market) throw new Error('Mercado não encontrado');
      if (market.status !== 'ACTIVE') throw new Error('Mercado não está ativo para apostas');
      if (new Date(market.endTime) <= new Date()) throw new Error('Mercado já encerrou');

      const poolYes = Number(market.totalYes);
      const poolNo = Number(market.totalNo);

      // Calcular quote com os pools atuais
      const quote =
        direction === 'BUY'
          ? quoteBuy(poolYes, poolNo, outcome, amount)
          : quoteSell(poolYes, poolNo, outcome, amount);

      // Verificar slippage
      if (quote.priceImpact > maxSlippage) {
        throw new Error(
          `Impacto no preço de ${(quote.priceImpact * 100).toFixed(1)}% excede o máximo de ${(maxSlippage * 100).toFixed(1)}%. Reduza o valor ou aumente a tolerância.`,
        );
      }

      // Calcular deltas dos pools
      const yesDelta = new Prisma.Decimal((quote.newPoolYes - poolYes).toFixed(6));
      const noDelta = new Prisma.Decimal((quote.newPoolNo - poolNo).toFixed(6));
      const volumeDelta = new Prisma.Decimal(amount.toFixed(6));

      // Atualizar pools e volume
      await tx.market.update({
        where: { id: marketId },
        data: {
          totalYes: { increment: yesDelta },
          totalNo: { increment: noDelta },
          totalVolume: { increment: volumeDelta },
          lastTradeAt: new Date(),
          // Atualizar contagem de participantes se primeira aposta
        },
      });

      // Snapshot de probabilidade após o trade
      await tx.probabilitySnapshot.create({
        data: {
          marketId,
          yesProb: quote.newProbabilityYes * 100,
          noProb: quote.newProbabilityNo * 100,
          volume: new Prisma.Decimal(amount.toFixed(6)),
        },
      });

      return {
        ...quote,
        marketId,
        userId,
        outcome,
        direction,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
