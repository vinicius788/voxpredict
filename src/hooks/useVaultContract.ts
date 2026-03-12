import { useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useMyPositions, useUserStats } from './useUserDashboard';

interface VaultData {
  lockedBalance: number;
  isInPrediction: boolean;
  canDeposit: boolean;
  totalDeposited: number;
  totalWithdrawn: number;
  lastPredictionTime: Date | null;
  predictionCount: number;
}

export const useVaultContract = () => {
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: positions = [], isLoading: positionsLoading } = useMyPositions();

  const vaultData = useMemo<VaultData>(() => {
    const activePositions = positions.filter((position) => position.market.status === 'ACTIVE');
    const lockedBalance = activePositions.reduce((sum, position) => sum + Number(position.amount), 0);
    const lastPredictionDate = positions.length
      ? new Date(
          positions
            .map((position) => new Date(position.createdAt).getTime())
            .sort((a, b) => b - a)[0],
        )
      : null;

    const totalDeposited = Number((stats as any)?.totalDeposited ?? stats?.portfolioValue ?? lockedBalance);
    const totalWithdrawn = Number((stats as any)?.totalWithdrawn ?? 0);

    return {
      lockedBalance: Number(lockedBalance.toFixed(2)),
      isInPrediction: activePositions.length > 0,
      canDeposit: true,
      totalDeposited: Number(totalDeposited.toFixed(2)),
      totalWithdrawn: Number(totalWithdrawn.toFixed(2)),
      lastPredictionTime: lastPredictionDate,
      predictionCount: positions.length,
    };
  }, [positions, stats]);

  const deposit = async (_amount: number) => {
    toast('Depósito via contrato será habilitado no fluxo on-chain.', { icon: 'ℹ️' });
    return false;
  };

  const withdraw = async () => {
    toast('Saque via contrato será habilitado no fluxo on-chain.', { icon: 'ℹ️' });
    return false;
  };

  return {
    vaultData,
    isLoading: statsLoading || positionsLoading,
    deposit,
    withdraw,
  };
};
