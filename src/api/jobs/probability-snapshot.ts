import cron from 'node-cron';
import { ethers } from 'ethers';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import VoxPredictMarketABI from '../../contracts/abis/VoxPredictMarket.json';

const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(6));
const isHexAddress = (value?: string) => Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));

export const startProbabilitySnapshotJob = () => {
  const rpcUrl = process.env.POLYGON_RPC_URL || process.env.ALCHEMY_API_URL;
  if (!rpcUrl) {
    console.warn('Probability snapshot job disabled: POLYGON_RPC_URL/ALCHEMY_API_URL not configured');
    return;
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  cron.schedule('*/5 * * * *', async () => {
    try {
      const activeMarkets = await prisma.market.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, contractAddress: true, totalVolume: true },
      });

      for (const market of activeMarkets) {
        try {
          if (!isHexAddress(market.contractAddress)) {
            continue;
          }

          const marketContract = new ethers.Contract(market.contractAddress, VoxPredictMarketABI, provider);
          const probabilitiesRaw = await marketContract.getProbabilities();
          const yesProb = Number(probabilitiesRaw?.[0]?.toString() || 5000) / 100;
          const noProb = Number(probabilitiesRaw?.[1]?.toString() || 5000) / 100;

          await prisma.probabilitySnapshot.create({
            data: {
              marketId: market.id,
              yesProb,
              noProb,
              volume: toDecimal(Number(market.totalVolume.toString())),
            },
          });
        } catch (marketError) {
          console.error(`Snapshot error for market ${market.id}:`, marketError);
        }
      }
    } catch (error) {
      console.error('Probability snapshot cron error:', error);
    }
  });

  console.log('Probability snapshot job started (*/5 * * * *)');
};
