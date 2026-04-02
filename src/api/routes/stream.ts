/**
 * SSE (Server-Sent Events) — streaming de preços em tempo real.
 *
 * GET /stream/markets/:id  — preços + probabilidades de um mercado específico
 * GET /stream/feed         — feed global de atividade recente (últimos trades)
 *
 * Usa polling interno no Prisma a cada 2s e empurra dados ao cliente via SSE.
 * Compatível com Express 5 e qualquer frontend via EventSource API.
 */

import express, { Request, Response } from 'express';
import { prisma } from '../db/prisma';

const router = express.Router();

// Intervalo de polling (ms)
const POLL_INTERVAL_MS = 2000;

// ─── SSE helpers ──────────────────────────────────────────────────────────────

function sseHeaders(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx: desabilita buffering
  res.flushHeaders();
}

function sendEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  // Express 5 / Node http: flush se disponível
  if (typeof (res as unknown as { flush?: () => void }).flush === 'function') {
    (res as unknown as { flush: () => void }).flush();
  }
}

// ─── GET /stream/markets/:id ──────────────────────────────────────────────────

router.get('/markets/:id', (req: Request, res: Response) => {
  const marketIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const marketId = parseInt(marketIdParam ?? '', 10);
  if (isNaN(marketId)) {
    res.status(400).json({ success: false, error: 'ID de mercado inválido' });
    return;
  }

  sseHeaders(res);

  // Enviar heartbeat imediato para confirmar conexão
  sendEvent(res, 'connected', { marketId, ts: Date.now() });

  let lastYes: string | null = null;
  let lastNo: string | null = null;

  const poll = async () => {
    try {
      const market = await prisma.market.findUnique({
        where: { id: marketId },
        select: {
          id: true,
          status: true,
          totalYes: true,
          totalNo: true,
          totalVolume: true,
          lastTradeAt: true,
        },
      });

      if (!market) {
        sendEvent(res, 'error', { code: 'MARKET_NOT_FOUND' });
        res.end();
        return;
      }

      const yesStr = market.totalYes.toString();
      const noStr = market.totalNo.toString();

      // Só enviar quando houver mudança nos pools
      if (yesStr !== lastYes || noStr !== lastNo) {
        lastYes = yesStr;
        lastNo = noStr;

        const poolYes = Number(market.totalYes);
        const poolNo = Number(market.totalNo);
        const total = poolYes + poolNo;
        const probYes = total > 0 ? poolNo / total : 0.5;

        sendEvent(res, 'price', {
          marketId: market.id,
          status: market.status,
          poolYes,
          poolNo,
          totalVolume: Number(market.totalVolume),
          probYes: Math.round(probYes * 10000) / 100, // 2 decimais em %
          probNo: Math.round((1 - probYes) * 10000) / 100,
          lastTradeAt: market.lastTradeAt?.toISOString() ?? null,
          ts: Date.now(),
        });
      }
    } catch {
      // Silenciar erros de DB — o cliente vai reconectar se o SSE cair
    }
  };

  // Poll imediato + intervalo
  void poll();
  const interval = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);

  // Heartbeat a cada 25s para manter conexão viva (proxies têm timeout ~30s)
  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(interval);
    clearInterval(heartbeat);
  });
});

// ─── GET /stream/feed ─────────────────────────────────────────────────────────

router.get('/feed', (req: Request, res: Response) => {
  sseHeaders(res);
  sendEvent(res, 'connected', { ts: Date.now() });

  let lastActivityId: string | null = null;

  const poll = async () => {
    try {
      const where = lastActivityId ? { id: { gt: lastActivityId } } : undefined;

      const activities = await prisma.activity.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: 20,
        include: {
          market: { select: { question: true } },
          user: { select: { username: true, walletAddress: true } },
        },
      });

      if (activities.length > 0) {
        lastActivityId = activities[activities.length - 1].id;
        sendEvent(res, 'activity', {
          items: activities.map((a) => ({
            id: a.id,
            type: a.type,
            side: a.side,
            amount: Number(a.amount),
            marketId: a.marketId,
            question: a.market?.question ?? null,
            username: a.user?.username ?? shortenAddress(a.user?.walletAddress ?? ''),
            createdAt: a.createdAt.toISOString(),
          })),
          ts: Date.now(),
        });
      }
    } catch {
      // Silenciar
    }
  };

  void poll();
  const interval = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);
  const heartbeat = setInterval(() => { res.write(': ping\n\n'); }, 25000);

  req.on('close', () => {
    clearInterval(interval);
    clearInterval(heartbeat);
  });
});

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default router;
