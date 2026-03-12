import { useMemo } from 'react';
import { formatUnits } from 'viem';
import { useAccount, useBalance } from 'wagmi';
import { useTokenBalance } from './useTokenBalance';

interface WalletBalance {
  eth: number;
  usdt: number;
  usdc: number;
  totalUsd: number;
}

export const useWalletBalance = () => {
  const { address } = useAccount();
  const { data: nativeBalance, refetch: refetchNative, isFetching: nativeFetching } = useBalance({
    address,
    query: { enabled: Boolean(address) },
  });

  const usdt = useTokenBalance('USDT');
  const usdc = useTokenBalance('USDC');

  const balance = useMemo<WalletBalance>(() => {
    const eth = nativeBalance ? Number(formatUnits(nativeBalance.value, nativeBalance.decimals)) : 0;
    const usdtValue = usdt.balanceNumber || 0;
    const usdcValue = usdc.balanceNumber || 0;
    const totalUsd = usdtValue + usdcValue;

    return {
      eth: Number(eth.toFixed(6)),
      usdt: Number(usdtValue.toFixed(2)),
      usdc: Number(usdcValue.toFixed(2)),
      totalUsd: Number(totalUsd.toFixed(2)),
    };
  }, [nativeBalance, usdt.balanceNumber, usdc.balanceNumber]);

  const refreshBalance = async () => {
    await Promise.all([refetchNative(), usdt.refetch(), usdc.refetch()]);
  };

  return {
    balance,
    isLoading: nativeFetching || usdt.isFetching || usdc.isFetching,
    refreshBalance,
  };
};
