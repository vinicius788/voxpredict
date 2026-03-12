import { formatUnits } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { PREDICTION_MARKET_ABI } from '../lib/abis/PredictionMarket.abi';
import { CONTRACT_ADDRESS, TOKEN_DECIMALS } from '../lib/constants';

interface UserPositionResult {
  yesAmount: string;
  noAmount: string;
  yesAmountNumber: number;
  noAmountNumber: number;
  claimed: boolean;
  hasPosition: boolean;
}

const emptyPosition: UserPositionResult = {
  yesAmount: '0',
  noAmount: '0',
  yesAmountNumber: 0,
  noAmountNumber: 0,
  claimed: false,
  hasPosition: false,
};

export function useUserPosition(marketId: number, tokenSymbol: string = 'USDT'): UserPositionResult {
  const { address } = useAccount();
  const decimals = TOKEN_DECIMALS[tokenSymbol] ?? 6;
  const contractAddress = CONTRACT_ADDRESS && CONTRACT_ADDRESS.startsWith('0x') ? CONTRACT_ADDRESS : undefined;

  const { data } = useReadContract({
    address: contractAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'positions',
    args: address ? [BigInt(marketId), address] : undefined,
    query: {
      enabled: Boolean(contractAddress && address && Number.isInteger(marketId) && marketId > 0),
    },
  });

  if (!data || !Array.isArray(data) || data.length < 3) {
    return emptyPosition;
  }

  const [yesAmountRaw, noAmountRaw, claimedRaw] = data as [bigint, bigint, boolean];
  const yesAmountNumber = Number(formatUnits(yesAmountRaw, decimals));
  const noAmountNumber = Number(formatUnits(noAmountRaw, decimals));

  return {
    yesAmount: yesAmountNumber.toFixed(2),
    noAmount: noAmountNumber.toFixed(2),
    yesAmountNumber,
    noAmountNumber,
    claimed: Boolean(claimedRaw),
    hasPosition: yesAmountRaw > 0n || noAmountRaw > 0n,
  };
}
