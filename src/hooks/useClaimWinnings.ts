import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { createPublicClient, formatUnits, http } from 'viem';
import { polygon, polygonAmoy } from 'wagmi/chains';
import { useAccount, useChainId, useWriteContract } from 'wagmi';
import { PREDICTION_MARKET_ABI } from '../lib/abis/PredictionMarket.abi';
import { CHAIN_ID, CONTRACT_ADDRESS } from '../lib/constants';
import { api } from '../lib/api-client';

const getRpcUrlByChain = (chainId: number) => {
  if (chainId === 137) {
    return (
      import.meta.env.VITE_POLYGON_RPC_URL ||
      import.meta.env.VITE_POLYGON_MAINNET_RPC_URL ||
      'https://polygon-rpc.com'
    );
  }

  return (
    import.meta.env.VITE_POLYGON_AMOY_RPC_URL ||
    import.meta.env.VITE_MUMBAI_RPC_URL ||
    'https://rpc-amoy.polygon.technology'
  );
};

const waitForTransaction = async (txHash: `0x${string}`, chainId: number, confirmations = 1) => {
  const chain = chainId === 137 ? polygon : polygonAmoy;
  const client = createPublicClient({
    chain,
    transport: http(getRpcUrlByChain(chainId)),
  });

  return client.waitForTransactionReceipt({
    hash: txHash,
    confirmations,
  });
};

export function useClaimWinnings() {
  const { address } = useAccount();
  const connectedChainId = useChainId();
  const activeChainId = connectedChainId || CHAIN_ID;
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const contractAddress = CONTRACT_ADDRESS && CONTRACT_ADDRESS.startsWith('0x') ? CONTRACT_ADDRESS : undefined;

  const getExpectedWinnings = async (marketId: number) => {
    if (!contractAddress || !address) return null;

    const chain = activeChainId === 137 ? polygon : polygonAmoy;
    const client = createPublicClient({
      chain,
      transport: http(getRpcUrlByChain(activeChainId)),
    });

    const winnings = await client.readContract({
      address: contractAddress,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'calculateWinnings',
      args: [BigInt(marketId), address],
    });

    return Number(formatUnits(winnings as bigint, 6)).toFixed(2);
  };

  const claim = async (marketId: number, options?: { offChain?: boolean }) => {
    const isOffChain = options?.offChain === true;

    if (!isOffChain && !contractAddress) {
      const error = 'Contrato não configurado. Defina VITE_CONTRACT_ADDRESS.';
      toast.error(error);
      throw new Error(error);
    }

    try {
      if (isOffChain) {
        toast.loading('Registrando saque de demonstração...', { id: 'claim' });
        const response = await api.markPositionClaimed(marketId, undefined, true);
        const amount = Number(response?.amount || 0);

        toast.success(
          amount > 0
            ? `$${amount.toFixed(2)} USDT registrados como saque (off-chain)!`
            : 'Saque registrado com sucesso (off-chain)!',
          { id: 'claim' },
        );

        queryClient.invalidateQueries({ queryKey: ['my-positions'] });
        queryClient.invalidateQueries({ queryKey: ['user-stats'] });
        queryClient.invalidateQueries({ queryKey: ['market', marketId] });
        return `offchain_claim_${marketId}_${Date.now()}`;
      }

      let expectedWinnings: string | null = null;
      try {
        expectedWinnings = await getExpectedWinnings(marketId);
      } catch {
        expectedWinnings = null;
      }
      toast.loading('Confirmando saque... (confirme na carteira)', { id: 'claim' });
      const predictionContract = contractAddress as `0x${string}`;

      const txHash = await writeContractAsync({
        address: predictionContract,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'claimWinnings',
        args: [BigInt(marketId)],
      });

      toast.loading('Aguardando confirmação da transação...', { id: 'claim' });
      await waitForTransaction(txHash, activeChainId);

      await api.markPositionClaimed(marketId, txHash);

      if (expectedWinnings) {
        toast.success(`$${expectedWinnings} USDT sacados com sucesso!`, { id: 'claim' });
      } else {
        toast.success('Ganhos sacados com sucesso!', { id: 'claim' });
      }
      queryClient.invalidateQueries({ queryKey: ['my-positions'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['market', marketId] });

      return txHash;
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || 'Erro ao sacar ganhos', { id: 'claim' });
      throw error;
    }
  };

  return { claim };
}
