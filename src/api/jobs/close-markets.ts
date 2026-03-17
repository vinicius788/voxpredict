import cron from 'node-cron';
import { prisma } from '../db/prisma';

export const closeExpiredMarkets = async () => {
  const expiredMarkets = await prisma.market.findMany({
    where: {
      status: 'ACTIVE',
      endTime: { lt: new Date() },
    },
    select: { id: true },
  });

  for (const market of expiredMarkets) {
    await prisma.market.update({
      where: { id: market.id },
      data: { status: 'CLOSED' },
    });
    console.log(`Market ${market.id} closed automatically`);
  }

  return expiredMarkets.length;
};

export const startCloseMarketsJob = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const closedCount = await closeExpiredMarkets();
      if (closedCount > 0) {
        console.log(`Close markets job: ${closedCount} market(s) moved to CLOSED`);
      }
    } catch (error) {
      console.error('Close markets job failed:', error);
    }
  });
};
