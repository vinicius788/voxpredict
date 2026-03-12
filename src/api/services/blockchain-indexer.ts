import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import addresses from '../../contracts/addresses.json';
import VoxPredictMarketFactoryABI from '../../contracts/abis/VoxPredictMarketFactory.json';
import VoxPredictMarketABI from '../../contracts/abis/VoxPredictMarket.json';

dotenv.config();

const toDecimal = (value: ethers.BigNumber) => new Prisma.Decimal(ethers.utils.formatUnits(value, 6));
const isHexAddress = (value?: string) => Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));

const hasEvent = (abi: any, eventName: string) => {
  if (!Array.isArray(abi)) return false;
  return abi.some((item) => item?.type === 'event' && item?.name === eventName);
};

export const startBlockchainIndexer = async () => {
  const rpcUrl = process.env.POLYGON_RPC_URL || process.env.ALCHEMY_API_URL;
  if (!rpcUrl) {
    console.warn('Blockchain indexer disabled: POLYGON_RPC_URL/ALCHEMY_API_URL not configured');
    return;
  }

  if (!isHexAddress(addresses?.VoxPredictMarketFactory)) {
    console.warn('Blockchain indexer disabled: market factory address not configured');
    return;
  }

  if (!hasEvent(VoxPredictMarketFactoryABI, 'MarketCreated')) {
    console.warn('Blockchain indexer disabled: MarketCreated event not found in factory ABI');
    return;
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const factory = new ethers.Contract(addresses.VoxPredictMarketFactory, VoxPredictMarketFactoryABI, provider);

  factory.on('MarketCreated', async (...args: any[]) => {
    try {
      const event = args[args.length - 1] as ethers.Event;
      const marketAddress = args[0] as string;

      const marketContract = new ethers.Contract(marketAddress, VoxPredictMarketABI, provider);
      const marketInfo = await marketContract.getMarketInfo();

      const id = Number(marketInfo._id || marketInfo.id || 0) || Number(args[1] || 0);
      if (!id) return;

      await prisma.market.upsert({
        where: { id },
        create: {
          id,
          contractAddress: marketAddress,
          question: String(marketInfo._question || marketInfo.question || 'Mercado'),
          description: String(marketInfo._description || marketInfo.description || ''),
          category: String(marketInfo._category || marketInfo.category || 'geral'),
          endTime: new Date(Number(marketInfo._endTime || marketInfo.endTime || 0) * 1000),
          token: 'USDT',
          status: 'ACTIVE',
        },
        update: {
          contractAddress: marketAddress,
          question: String(marketInfo._question || marketInfo.question || 'Mercado'),
          description: String(marketInfo._description || marketInfo.description || ''),
          category: String(marketInfo._category || marketInfo.category || 'geral'),
          endTime: new Date(Number(marketInfo._endTime || marketInfo.endTime || 0) * 1000),
          status: 'ACTIVE',
        },
      });

      console.log(`Indexed MarketCreated #${id} tx=${event.transactionHash}`);
    } catch (error) {
      console.error('Indexer error on MarketCreated:', error);
    }
  });

  if (hasEvent(VoxPredictMarketFactoryABI, 'MarketResolved')) {
    factory.on('MarketResolved', async (...args: any[]) => {
      try {
        const marketId = Number(args[0]);
        const outcomeRaw = Number(args[1]);
        const outcome = outcomeRaw === 1 ? 'YES' : outcomeRaw === 2 ? 'NO' : 'CANCELLED';

        await prisma.market.update({
          where: { id: marketId },
          data: {
            status: outcome === 'CANCELLED' ? 'CANCELLED' : 'RESOLVED',
            outcome,
            resolvedAt: new Date(),
          },
        });

        const participants = await prisma.position.findMany({
          where: { marketId },
          select: { userId: true, side: true, amount: true },
        });

        if (participants.length > 0) {
          await prisma.notification.createMany({
            data: participants.map((position) => {
              const won =
                (outcome === 'YES' && position.side === 'YES') ||
                (outcome === 'NO' && position.side === 'NO');

              return {
                userId: position.userId,
                type: 'market_resolved',
                title: `Mercado #${marketId} resolvido`,
                message: won ? 'Sua posição foi vencedora.' : 'Sua posição não foi vencedora.',
              };
            }),
          });
        }
      } catch (error) {
        console.error('Indexer error on MarketResolved:', error);
      }
    });
  } else {
    console.warn('Indexer: MarketResolved event not found in factory ABI, skipping listener');
  }

  if (hasEvent(VoxPredictMarketFactoryABI, 'BetPlaced')) {
    factory.on('BetPlaced', async (...args: any[]) => {
      try {
        const marketId = Number(args[0]);
        const user = String(args[1]).toLowerCase();
        const isYes = Boolean(args[2]);
        const amount = args[3] as ethers.BigNumber;
        const txHash = (args[args.length - 1] as ethers.Event).transactionHash;

        const side = isYes ? 'YES' : 'NO';
        const decimalAmount = toDecimal(amount);

        const linkedUser = await prisma.user.findFirst({
          where: { walletAddress: { equals: user, mode: 'insensitive' } },
        });

        if (!linkedUser) return;

        await prisma.$transaction([
          prisma.position.create({
            data: {
              userId: linkedUser.id,
              marketId,
              side,
              amount: decimalAmount,
              token: 'USDT',
              txHash,
            },
          }),
          prisma.market.update({
            where: { id: marketId },
            data: {
              totalVolume: { increment: decimalAmount },
              participants: { increment: 1 },
              ...(side === 'YES' ? { totalYes: { increment: decimalAmount } } : { totalNo: { increment: decimalAmount } }),
            },
          }),
        ]);
      } catch (error) {
        console.error('Indexer error on BetPlaced:', error);
      }
    });
  } else {
    console.warn('Indexer: BetPlaced event not found in factory ABI, skipping listener');
  }

  console.log('Blockchain indexer started');
};
