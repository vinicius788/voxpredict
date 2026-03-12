import { useAccount, useChainId, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { ERC20_ABI } from '../lib/abis/ERC20.abi';
import { CHAIN_ID, TOKEN_ADDRESSES, TOKEN_DECIMALS } from '../lib/constants';

export function useTokenBalance(tokenSymbol: string) {
  const { address } = useAccount();
  const connectedChainId = useChainId();
  const activeChainId = connectedChainId || CHAIN_ID;
  const tokenAddress = TOKEN_ADDRESSES[activeChainId]?.[tokenSymbol];

  const { data, refetch, isFetching } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && tokenAddress),
    },
  });

  const decimals = TOKEN_DECIMALS[tokenSymbol] ?? 6;
  const normalized = typeof data === 'bigint' ? Number(formatUnits(data, decimals)) : 0;

  return {
    balance: normalized.toFixed(2),
    balanceNumber: normalized,
    rawBalance: typeof data === 'bigint' ? data : 0n,
    isFetching,
    refetch,
  };
}
