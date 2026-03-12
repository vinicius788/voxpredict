import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createPublicClient, http, parseUnits } from 'viem';
import { polygon, polygonAmoy } from 'wagmi/chains';
import { useAccount, useChainId, useWriteContract } from 'wagmi';
import { ERC20_ABI } from '../lib/abis/ERC20.abi';
import { PREDICTION_MARKET_ABI } from '../lib/abis/PredictionMarket.abi';
import {
  CHAIN_ID,
  CONTRACT_ADDRESS,
  TOKEN_ADDRESSES,
  TOKEN_DECIMALS,
  type SupportedToken,
} from '../lib/constants';
import { api } from '../lib/api-client';

type BetStep = 'idle' | 'approving' | 'waiting_approval' | 'betting' | 'waiting_bet' | 'success' | 'error';

interface PlaceBetInput {
  marketId: number;
  isYes: boolean;
  amount: string;
  tokenSymbol?: SupportedToken;
}

const getRpcUrlByChain = (chainId: number) => {
  if (chainId === 137) {
    return import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon-rpc.com';
  }

  return import.meta.env.VITE_MUMBAI_RPC_URL || 'https://rpc-amoy.polygon.technology';
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

export function usePlaceBet() {
  const { address } = useAccount();
  const connectedChainId = useChainId();
  const activeChainId = connectedChainId || CHAIN_ID;
  const queryClient = useQueryClient();

  const [step, setStep] = useState<BetStep>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const contractAddress = CONTRACT_ADDRESS && CONTRACT_ADDRESS.startsWith('0x') ? CONTRACT_ADDRESS : undefined;

  const { writeContractAsync: writeApprove } = useWriteContract();
  const { writeContractAsync: writeBet } = useWriteContract();

  const placeBet = async ({ marketId, isYes, amount, tokenSymbol = 'USDT' }: PlaceBetInput) => {
    if (!address) {
      toast.error('Conecte sua carteira primeiro');
      return null;
    }

    if (!contractAddress) {
      const error = 'Contrato não configurado. Defina VITE_CONTRACT_ADDRESS.';
      toast.error(error);
      throw new Error(error);
    }

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      const error = 'Valor inválido para aposta.';
      toast.error(error);
      throw new Error(error);
    }

    const tokenAddress = TOKEN_ADDRESSES[activeChainId]?.[tokenSymbol];
    if (!tokenAddress) {
      const error = `Token ${tokenSymbol} não suportado na rede atual.`;
      toast.error(error);
      throw new Error(error);
    }

    const decimals = TOKEN_DECIMALS[tokenSymbol] ?? 6;
    const parsedAmount = parseUnits(amount, decimals);

    try {
      setStep('approving');
      setErrorMessage('');
      toast.loading('Aprovando token... (confirme na carteira)', { id: 'bet-flow' });

      const approveTx = await writeApprove({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddress, parsedAmount],
      });

      setStep('waiting_approval');
      toast.loading('Aguardando confirmação da aprovação...', { id: 'bet-flow' });
      await waitForTransaction(approveTx, activeChainId);

      setStep('betting');
      toast.loading('Enviando aposta... (confirme na carteira)', { id: 'bet-flow' });

      const betTx = await writeBet({
        address: contractAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'placeBet',
        args: [BigInt(marketId), isYes, parsedAmount],
      });

      setStep('waiting_bet');
      toast.loading('Confirmando aposta na blockchain...', { id: 'bet-flow' });
      await waitForTransaction(betTx, activeChainId);

      await api.registerPosition({
        marketId,
        side: isYes ? 'YES' : 'NO',
        amount,
        token: tokenSymbol,
        txHash: betTx,
      });

      setStep('success');
      toast.success(`Aposta de $${amount} em ${isYes ? 'SIM' : 'NÃO'} confirmada!`, { id: 'bet-flow' });

      queryClient.invalidateQueries({ queryKey: ['market', marketId] });
      queryClient.invalidateQueries({ queryKey: ['market-history', marketId] });
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      queryClient.invalidateQueries({ queryKey: ['my-positions'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });

      return betTx;
    } catch (error: any) {
      const message = error?.shortMessage || error?.message || 'Erro ao fazer aposta';
      setStep('error');
      setErrorMessage(message);
      toast.error(message, { id: 'bet-flow' });
      throw error;
    }
  };

  const reset = () => {
    setStep('idle');
    setErrorMessage('');
  };

  return {
    placeBet,
    step,
    errorMessage,
    reset,
    isLoading: ['approving', 'waiting_approval', 'betting', 'waiting_bet'].includes(step),
    isSuccess: step === 'success',
    isError: step === 'error',
  };
}
