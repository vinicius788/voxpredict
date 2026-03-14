import cron from 'node-cron';
import { runAutoMarketCreator } from '../services/auto-market-creator';

export const startAutoMarketCreatorJob = () => {
  cron.schedule('0 9 * * *', async () => {
    if (process.env.ENABLE_AUTO_MARKETS !== 'true') return;
    try {
      await runAutoMarketCreator();
    } catch (error) {
      console.error('Auto market creator job failed:', error);
    }
  });
};
