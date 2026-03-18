import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { createPublicClient, http, parseUnits } from 'viem';
import { polygon, polygonAmoy } from 'wagmi/chains';
import { useAccount, useChainId, useWriteContract } from 'wagmi';
import { ERC20_ABI } from '../lib/abis/ERC20.abi';
import { CHAIN_ID, TOKEN_ADDRESSES, TOKEN_DECIMALS } from '../lib/constants';
import { useContractAddresses } from './useContractAddresses';
import { useMyPositions, useUserStats } from './useUserDashboard';
import { api } from '../lib/api-client';
import VAULT_ABI from '../contracts/abis/VoxPredictVault.json';

export type VaultToken = 'USDT' | 'USDC' | 'DAI';

type VaultStep =
  | 'idle'
  | 'approving'
  | 'depositing'
  | 'withdrawing'
  | 'confirming'
  | 'success'
  | 'error';

interface VaultData {
  lockedBalance: number;
  availableBalance: number;
  inActivePositions: number;
  isInPrediction: boolean;
  canDeposit: boolean;
  totalDeposited: number;
  totalWithdrawn: number;
  lastPredictionTime: Date | null;
  predictionCount: number;
}

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

const normalizeUsd = (value: number) => Number(value.toFixed(2));

export const useVaultContract = (enabled = true) => {
  const { address } = useAccount();
  const connectedChainId = useChainId();
  const activeChainId = connectedChainId || CHAIN_ID;
  const { VoxPredictVault } = useContractAddresses();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<VaultStep>('idle');
  const [stepMessage, setStepMessage] = useState<string>('');

  const { data: stats, isLoading: statsLoading } = useUserStats(enabled);
  const { data: positions = [], isLoading: positionsLoading } = useMyPositions(enabled);
  const { writeContractAsync } = useWriteContract();

  const vaultAddress = VoxPredictVault && VoxPredictVault.startsWith('0x') ? (VoxPredictVault as `0x${string}`) : undefined;

  const vaultData = useMemo<VaultData>(() => {
    const activePositions = positions.filter((position) => position.market.status === 'ACTIVE');
    const inActivePositions = activePositions.reduce((sum, position) => sum + Number(position.amount), 0);

    const totalDeposited = Number(stats?.totalDeposited ?? 0);
    const totalWithdrawn = Number(stats?.totalWithdrawn ?? 0);
    const availableBalance = Math.max(0, Number(stats?.vaultBalance ?? totalDeposited - totalWithdrawn - inActivePositions));

    const lastPredictionDate = positions.length
      ? new Date(
          positions
            .map((position) => new Date(position.createdAt).getTime())
            .sort((a, b) => b - a)[0],
        )
      : null;

    return {
      lockedBalance: normalizeUsd(availableBalance),
      availableBalance: normalizeUsd(availableBalance),
      inActivePositions: normalizeUsd(inActivePositions),
      isInPrediction: activePositions.length > 0,
      canDeposit: true,
      totalDeposited: normalizeUsd(totalDeposited),
      totalWithdrawn: normalizeUsd(totalWithdrawn),
      lastPredictionTime: lastPredictionDate,
      predictionCount: positions.length,
    };
  }, [positions, stats]);

  const invalidateDashboardQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    queryClient.invalidateQueries({ queryKey: ['my-positions'] });
    queryClient.invalidateQueries({ queryKey: ['user-activity'] });
    queryClient.invalidateQueries({ queryKey: ['portfolio-history'] });
  };

  const deposit = async (amount: number, token: VaultToken = 'USDT') => {
    if (!address) {
      const error = 'Conecte sua carteira para depositar.';
      toast.error(error);
      throw new Error(error);
    }

    if (!vaultAddress) {
      const error = 'Contrato do cofre não configurado.';
      toast.error(error);
      throw new Error(error);
    }

    if (token !== 'USDT') {
      const error = 'No contrato atual, o cofre suporta depósito apenas em USDT.';
      toast.error(error);
      throw new Error(error);
    }

    const tokenAddress = TOKEN_ADDRESSES[activeChainId]?.[token];
    if (!tokenAddress) {
      const error = `Token ${token} não suportado na rede atual.`;
      toast.error(error);
      throw new Error(error);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      const error = 'Valor inválido para depósito.';
      toast.error(error);
      throw new Error(error);
    }

    try {
      const decimals = TOKEN_DECIMALS[token] ?? 6;
      const amountInUnits = parseUnits(amount.toString(), decimals);
      const chain = activeChainId === 137 ? polygon : polygonAmoy;
      const client = createPublicClient({
        chain,
        transport: http(getRpcUrlByChain(activeChainId)),
      });

      const allowance = (await client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, vaultAddress],
      })) as bigint;

      if (allowance < amountInUnits) {
        setStep('approving');
        setStepMessage('Aprovando token...');
        toast.loading('Aprovando token...', { id: 'vault-flow' });

        const approveTx = await writeContractAsync({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [vaultAddress, amountInUnits],
        });

        setStep('confirming');
        setStepMessage('Confirmando aprovação...');
        toast.loading('Confirmando aprovação...', { id: 'vault-flow' });
        await waitForTransaction(approveTx, activeChainId);
      }

      setStep('depositing');
      setStepMessage('Depositando...');
      toast.loading('Depositando no cofre...', { id: 'vault-flow' });

      const depositTx = await writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI as any,
        functionName: 'deposit',
        args: [amountInUnits],
      });

      setStep('confirming');
      setStepMessage('Confirmando transação...');
      toast.loading('Confirmando transação...', { id: 'vault-flow' });
      await waitForTransaction(depositTx, activeChainId);

      await api.registerVaultDeposit({
        txHash: depositTx,
        amount,
        token,
      });

      setStep('success');
      setStepMessage('Depósito concluído');
      toast.success('Depósito realizado com sucesso!', { id: 'vault-flow' });
      invalidateDashboardQueries();

      return depositTx;
    } catch (error: any) {
      const message = error?.shortMessage || error?.message || 'Falha ao depositar no cofre';
      setStep('error');
      setStepMessage(message);
      toast.error(message, { id: 'vault-flow' });
      throw error;
    }
  };

  const withdraw = async (amount: number) => {
    if (!address) {
      const error = 'Conecte sua carteira para sacar.';
      toast.error(error);
      throw new Error(error);
    }

    if (!vaultAddress) {
      const error = 'Contrato do cofre não configurado.';
      toast.error(error);
      throw new Error(error);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      const error = 'Informe um valor válido para saque.';
      toast.error(error);
      throw new Error(error);
    }

    if (amount > vaultData.availableBalance + 0.0001) {
      const error = 'Valor maior que o saldo disponível.';
      toast.error(error);
      throw new Error(error);
    }

    if (Math.abs(amount - vaultData.availableBalance) > 0.01) {
      const error = 'No contrato atual, o saque é sempre do saldo total disponível.';
      toast.error(error);
      throw new Error(error);
    }

    try {
      setStep('withdrawing');
      setStepMessage('Solicitando saque...');
      toast.loading('Solicitando saque...', { id: 'vault-flow' });

      const withdrawTx = await writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI as any,
        functionName: 'withdraw',
        args: [],
      });

      setStep('confirming');
      setStepMessage('Confirmando transação...');
      toast.loading('Confirmando transação...', { id: 'vault-flow' });
      await waitForTransaction(withdrawTx, activeChainId);

      await api.registerVaultWithdrawal({
        txHash: withdrawTx,
        amount: vaultData.availableBalance,
        token: 'USDT',
      });

      setStep('success');
      setStepMessage('Saque concluído');
      toast.success('Saque realizado com sucesso!', { id: 'vault-flow' });
      invalidateDashboardQueries();

      return withdrawTx;
    } catch (error: any) {
      const message = error?.shortMessage || error?.message || 'Falha ao sacar do cofre';
      setStep('error');
      setStepMessage(message);
      toast.error(message, { id: 'vault-flow' });
      throw error;
    }
  };

  const resetStep = () => {
    setStep('idle');
    setStepMessage('');
  };

  return {
    vaultData,
    isLoading: statsLoading || positionsLoading,
    isProcessing: ['approving', 'depositing', 'withdrawing', 'confirming'].includes(step),
    step,
    stepMessage,
    deposit,
    withdraw,
    resetStep,
  };
};
