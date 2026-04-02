/**
 * VoxPredict Event Bus — arquitetura reativa baseada em Node.js EventEmitter.
 *
 * Permite que qualquer parte do backend emita eventos tipados e reaja a eles
 * de forma desacoplada, sem polling e sem acoplamento direto entre módulos.
 *
 * Em produção com múltiplas instâncias, substituir por Redis pub/sub.
 */

import { EventEmitter } from 'events';
import { prisma } from '../db/prisma';

// ─── Tipos de eventos ─────────────────────────────────────────────────────────

type EventPayloadMap = {
  'trade.executed': {
    userId: string;
    marketId: number;
    outcome: 'YES' | 'NO';
    direction: 'BUY' | 'SELL';
    amount: number;
    txHash: string;
  };
  'market.resolved': {
    marketId: number;
    outcome: 'YES' | 'NO' | 'CANCELLED';
    question: string;
  };
  'market.created': {
    marketId: number;
    category: string;
    question: string;
  };
  'market.closing_soon': {
    marketId: number;
    question: string;
    hoursLeft: number;
  };
  'user.first_trade': {
    userId: string;
  };
};

type EventName = keyof EventPayloadMap;
type EventHandler<T extends EventName> = (payload: EventPayloadMap[T]) => Promise<void>;

// ─── Bus ──────────────────────────────────────────────────────────────────────

class VoxEventBus {
  private emitter = new EventEmitter();

  constructor() {
    // Aumentar limite para evitar warning de memory leak com muitos handlers
    this.emitter.setMaxListeners(50);
  }

  on<T extends EventName>(event: T, handler: EventHandler<T>): void {
    this.emitter.on(event, async (payload: EventPayloadMap[T]) => {
      try {
        await handler(payload);
      } catch (err) {
        console.error(`[EventBus] Erro no handler de "${event}":`, err);
        // Nunca propagar — handlers não devem quebrar o fluxo principal
      }
    });
  }

  emit<T extends EventName>(event: T, payload: EventPayloadMap[T]): void {
    // Emitir de forma assíncrona para não bloquear o caller
    setImmediate(() => this.emitter.emit(event, payload));
  }
}

export const eventBus = new VoxEventBus();

// ─── Handlers registrados ─────────────────────────────────────────────────────

// Detectar primeiro trade do usuário
eventBus.on('trade.executed', async ({ userId }) => {
  const count = await prisma.position.count({ where: { userId } });
  if (count === 1) {
    eventBus.emit('user.first_trade', { userId });
  }
});

// Badge + notificação no primeiro trade
eventBus.on('user.first_trade', async ({ userId }) => {
  await prisma.notification.create({
    data: {
      userId,
      type: 'ACHIEVEMENT',
      title: '🎉 Primeira aposta realizada!',
      message: 'Bem-vindo ao VoxPredict! Você fez sua primeira aposta. Continue apostando e suba no ranking.',
    },
  });
});

// Atualizar lastTradeAt e registrar atividade ao executar trade
eventBus.on('trade.executed', async ({ userId, marketId, outcome, direction, amount }) => {
  await prisma.market.update({
    where: { id: marketId },
    data: { lastTradeAt: new Date() },
  }).catch(() => {});

  // Registrar no feed de atividade (Activity model)
  await prisma.activity.create({
    data: {
      userId,
      marketId,
      type: direction,
      side: outcome,
      amount: amount,
    },
  }).catch(() => {});
});

// Notificar usuários quando mercado é resolvido
eventBus.on('market.resolved', async ({ marketId, outcome, question }) => {
  const positions = await prisma.position.findMany({
    where: { marketId },
    select: { userId: true, side: true, amount: true },
  });

  if (!positions.length) return;

  const notifData = positions.map((pos) => {
    const won = outcome !== 'CANCELLED' && pos.side === outcome;
    const cancelled = outcome === 'CANCELLED';

    return {
      userId: pos.userId,
      type: cancelled ? 'CANCEL' : won ? 'WIN' : 'LOSS',
      title: cancelled
        ? '⚠️ Mercado cancelado'
        : won
          ? '🎉 Você acertou!'
          : '😔 Não foi dessa vez',
      message: cancelled
        ? `O mercado "${question}" foi cancelado. Sua aposta será reembolsada.`
        : won
          ? `Resultado: ${outcome}. Você ganhou! Confira seu portfólio.`
          : `Resultado: ${outcome}. Sua aposta em ${pos.side} não acertou.`,
    };
  });

  // Criar notificações em lotes para não sobrecarregar
  const BATCH = 50;
  for (let i = 0; i < notifData.length; i += BATCH) {
    await prisma.notification.createMany({ data: notifData.slice(i, i + BATCH) }).catch(() => {});
  }
});

// Recalcular rankings após resolução
eventBus.on('market.resolved', async () => {
  const { updateUserRankings } = await import('../jobs/update-rankings');
  await updateUserRankings().catch((err: unknown) =>
    console.error('[EventBus] Ranking update failed:', err),
  );
});
