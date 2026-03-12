import { useMemo } from 'react';
import { useChainId } from 'wagmi';
import contractAddresses from '../contracts/addresses.json';

// Addresses by network
const CONTRACT_ADDRESSES = {
  // Polygon Mainnet
  137: {
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT real
    VoxPredictTreasury: contractAddresses.VoxPredictTreasury,
    VoxPredictVault: contractAddresses.VoxPredictVault,
    MarketFactory: contractAddresses.VoxPredictMarketFactory,
  },
  // Polygon Amoy (Testnet)
  80002: {
    USDT: contractAddresses.USDT, // Mock USDT
    VoxPredictTreasury: contractAddresses.VoxPredictTreasury,
    VoxPredictVault: contractAddresses.VoxPredictVault,
    MarketFactory: contractAddresses.VoxPredictMarketFactory,
  },
  // Base Mainnet
  8453: {
    USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', // USDT on Base
    VoxPredictTreasury: contractAddresses.VoxPredictTreasury,
    VoxPredictVault: contractAddresses.VoxPredictVault,
    MarketFactory: contractAddresses.VoxPredictMarketFactory,
  },
  // Sepolia (Testnet)
  11155111: {
    USDT: contractAddresses.USDT, // Mock USDT
    VoxPredictTreasury: contractAddresses.VoxPredictTreasury,
    VoxPredictVault: contractAddresses.VoxPredictVault,
    MarketFactory: contractAddresses.VoxPredictMarketFactory,
  },
};

export const useContractAddresses = () => {
  const chainId = useChainId();
  
  const addresses = useMemo(() => {
    const activeChainId = chainId || 137;
    return CONTRACT_ADDRESSES[activeChainId as keyof typeof CONTRACT_ADDRESSES] || CONTRACT_ADDRESSES[137];
  }, [chainId]);

  const chainName = useMemo(() => {
    const names: Record<number, string> = {
      137: 'Polygon',
      80002: 'Amoy',
      8453: 'Base',
      11155111: 'Sepolia',
    };
    return names[chainId] || 'Polygon';
  }, [chainId]);

  return {
    USDT: addresses.USDT,
    VoxPredictTreasury: addresses.VoxPredictTreasury,
    VoxPredictVault: addresses.VoxPredictVault,
    MarketFactory: addresses.MarketFactory,
    chainId: chainId || 137,
    chainName,
  };
};
