import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';

const PLATFORM_FEE_RATE = 0.03;
const EARLY_ADOPTER_CUTOFF = new Date('2026-06-01T00:00:00.000Z');

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) => Number((value || 0).toString());

const isWinningPosition = (side: string, outcome: string | null) => {
  if (!outcome) return false;
  return side === outcome;
};

const calculateResolvedPayout = (stake: number, side: 'YES' | 'NO', outcome: string, totalYes: number, totalNo: number) => {
  const won = isWinningPosition(side, outcome);
  if (!won) return 0;

  const winningPool = side === 'YES' ? totalYes : totalNo;
  const losingPool = side === 'YES' ? totalNo : totalYes;
  if (winningPool <= 0) return stake;

  const netLosingPool = losingPool * (1 - PLATFORM_FEE_RATE);
  return stake + netLosingPool * (stake / winningPool);
};

export async function updateUserRankings() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      createdAt: true,
      rank: true,
      positions: {
        where: {
          market: {
            status: 'RESOLVED',
            outcome: { in: ['YES', 'NO'] },
          },
        },
        select: {
          side: true,
          amount: true,
          market: {
            select: {
              outcome: true,
              totalYes: true,
              totalNo: true,
              resolvedAt: true,
            },
          },
        },
      },
    },
  });

  if (!users.length) return;

  const updates = users.map((user) => {
    const resolvedPositions = user.positions.filter((position) => position.market.outcome === 'YES' || position.market.outcome === 'NO');
    const totalPredictions = resolvedPositions.length;
    const correctPredictions = resolvedPositions.filter((position) =>
      isWinningPosition(position.side, position.market.outcome),
    ).length;
    const winRate = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;

    const totalVolume = resolvedPositions.reduce((sum, position) => sum + toNumber(position.amount), 0);

    const totalProfit = resolvedPositions.reduce((sum, position) => {
      const stake = toNumber(position.amount);
      const side = position.side === 'YES' ? 'YES' : 'NO';
      const outcome = position.market.outcome || 'NO';
      const payout = calculateResolvedPayout(
        stake,
        side,
        outcome,
        toNumber(position.market.totalYes),
        toNumber(position.market.totalNo),
      );
      return sum + (payout - stake);
    }, 0);

    const positionsByRecentResolution = [...resolvedPositions].sort((a, b) => {
      const aTime = a.market.resolvedAt ? new Date(a.market.resolvedAt).getTime() : 0;
      const bTime = b.market.resolvedAt ? new Date(b.market.resolvedAt).getTime() : 0;
      return bTime - aTime;
    });

    let streak = 0;
    for (const position of positionsByRecentResolution) {
      if (isWinningPosition(position.side, position.market.outcome)) {
        streak += 1;
      } else {
        break;
      }
    }

    const badges: string[] = [];
    if (user.createdAt < EARLY_ADOPTER_CUTOFF) badges.push('early_adopter');
    if (totalVolume >= 10_000) badges.push('whale');
    if (winRate >= 0.7 && totalPredictions >= 10) badges.push('prophet');
    if (streak >= 5) badges.push('on_fire');
    if (correctPredictions >= 50) badges.push('veteran');

    return prisma.user.update({
      where: { id: user.id },
      data: {
        totalPredictions,
        correctPredictions,
        winRate,
        totalProfit: Number(totalProfit.toFixed(4)),
        totalVolume: Number(totalVolume.toFixed(4)),
        streak,
        badges,
      },
    });
  });

  if (updates.length) {
    await prisma.$transaction(updates);
  }

  const rankedUsers = await prisma.user.findMany({
    where: {
      isPublicProfile: true,
      totalPredictions: { gt: 0 },
    },
    orderBy: [{ winRate: 'desc' }, { totalProfit: 'desc' }, { totalPredictions: 'desc' }],
    select: {
      id: true,
      rank: true,
    },
  });

  if (rankedUsers.length) {
    const rankUpdates = rankedUsers.map((user, index) => {
      const newRank = index + 1;
      const previousRank = user.rank ?? newRank;
      return prisma.user.update({
        where: { id: user.id },
        data: {
          rank: newRank,
          rankChange: previousRank - newRank,
        },
      });
    });

    await prisma.$transaction(rankUpdates);
  }

  await prisma.user.updateMany({
    where: {
      OR: [{ isPublicProfile: false }, { totalPredictions: { lte: 0 } }],
    },
    data: {
      rank: null,
      rankChange: 0,
    },
  });
}
