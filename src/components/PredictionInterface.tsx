import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Trophy, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Market } from '../types';
import { useWeb3 } from '../hooks/useWeb3';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { usePlaceBet } from '../hooks/usePlaceBet';
import { useClaimWinnings } from '../hooks/useClaimWinnings';
import { useUserPosition } from '../hooks/useUserPosition';
import { SUPPORTED_TOKENS, type SupportedToken } from '../lib/constants';

interface PredictionInterfaceProps {
  market: Market;
}

const PLATFORM_FEE = 0.03;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const clampAmount = (value: number, max: number) => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > max) return max;
  return value;
};

const toCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parsePool = (value: number | undefined) => {
  if (value === undefined || value === null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

const calculateMultiplier = (totalYes: number, totalNo: number, side: 'YES' | 'NO') => {
  const winningPool = side === 'YES' ? totalYes : totalNo;
  const losingPool = side === 'YES' ? totalNo : totalYes;

  if (winningPool <= 0 && losingPool <= 0) return 2;
  if (winningPool <= 0) return 2;

  return (winningPool + losingPool * (1 - PLATFORM_FEE)) / winningPool;
};

const calculateReturn = (amount: number, side: 'YES' | 'NO', totalYes: number, totalNo: number) =>
  amount * calculateMultiplier(totalYes, totalNo, side);

export const PredictionInterface: React.FC<PredictionInterfaceProps> = ({ market }) => {
  const { isWalletConnected, connectWallet, chainId, switchChain } = useWeb3();
  const expectedChainId = Number(import.meta.env.VITE_CHAIN_ID || 80002);

  const forcedToken = (market.token || '').toUpperCase();
  const hasForcedToken = SUPPORTED_TOKENS.includes(forcedToken as SupportedToken);

  const [side, setSide] = useState<'YES' | 'NO' | null>(null);
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState<SupportedToken>((hasForcedToken ? forcedToken : 'USDT') as SupportedToken);
  const [isClaiming, setIsClaiming] = useState(false);

  const marketId = Number(market.id);
  const isValidMarketId = Number.isInteger(marketId) && marketId > 0;
  const effectiveToken = (hasForcedToken ? forcedToken : token) as SupportedToken;

  const { balance, balanceNumber, refetch: refetchTokenBalance } = useTokenBalance(effectiveToken);
  const { placeBet, isLoading, step, isSuccess, reset } = usePlaceBet();
  const { claim } = useClaimWinnings();
  const position = useUserPosition(isValidMarketId ? marketId : 0, effectiveToken);

  const totalYes = useMemo(() => {
    const direct = parsePool(market.totalYes) ?? parsePool(market.yesPool);
    if (direct !== null) return direct;
    if (market.totalVolume <= 0) return 0;
    return (market.totalVolume * market.simProbability) / 100;
  }, [market.simProbability, market.totalVolume, market.totalYes, market.yesPool]);

  const totalNo = useMemo(() => {
    const direct = parsePool(market.totalNo) ?? parsePool(market.noPool);
    if (direct !== null) return direct;
    if (market.totalVolume <= 0) return 0;
    return (market.totalVolume * market.naoProbability) / 100;
  }, [market.naoProbability, market.totalVolume, market.totalNo, market.noPool]);

  const isClosed = market.status !== 'active' || new Date(market.endDate).getTime() <= Date.now();
  const outcome = (market.outcome || '').toUpperCase();
  const userWon =
    (outcome === 'YES' && position.yesAmountNumber > 0) || (outcome === 'NO' && position.noAmountNumber > 0);

  const yesMultiplier = calculateMultiplier(totalYes, totalNo, 'YES');
  const noMultiplier = calculateMultiplier(totalYes, totalNo, 'NO');
  const totalPool = totalYes + totalNo;
  const yesProbability = totalPool > 0 ? (totalYes / totalPool) * 100 : market.simProbability;
  const noProbability = totalPool > 0 ? (totalNo / totalPool) * 100 : market.naoProbability;

  const normalizedAmount = clampAmount(Number(amount), balanceNumber);
  const selectedMultiplier = side === 'YES' ? yesMultiplier : side === 'NO' ? noMultiplier : 0;
  const potentialReturn = side ? calculateReturn(normalizedAmount, side, totalYes, totalNo) : 0;
  const potentialProfit = potentialReturn - normalizedAmount;
  const yesProbabilityPercent = clamp(Number.isFinite(yesProbability) ? yesProbability : 50, 0, 100);
  const noProbabilityPercent = clamp(Number.isFinite(noProbability) ? noProbability : 50, 0, 100);
  const hasPositiveAmount = normalizedAmount > 0;
  const hasMinimumAmount = normalizedAmount >= 5;
  const hasSufficientBalance = normalizedAmount <= balanceNumber;
  const isWrongNetwork = isWalletConnected && Boolean(chainId && chainId !== expectedChainId);
  const chainName = expectedChainId === 137 ? 'Polygon Mainnet' : 'Polygon Amoy (Testnet)';
  const shouldDisablePrimary =
    isLoading || (isWalletConnected && !isWrongNetwork && (!side || !hasPositiveAmount || !hasMinimumAmount || !hasSufficientBalance));
  const primaryAmountLabel = hasPositiveAmount
    ? toCurrency(normalizedAmount).replace(',00', '').replace(',0', '')
    : '0';

  const handleQuickAmount = (value: number) => {
    const nextAmount = clampAmount(value, balanceNumber);
    setAmount(nextAmount > 0 ? String(Number(nextAmount.toFixed(2))) : '0');
  };

  const handlePlaceBet = async () => {
    if (!isValidMarketId) {
      toast.error('ID de mercado inválido.');
      return;
    }

    if (!side) {
      toast.error('Selecione SIM ou NÃO.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }

    if (Number(amount) < 5) {
      toast.error('Valor mínimo para aposta: $5.');
      return;
    }

    if (Number(amount) > balanceNumber) {
      toast.error('Saldo insuficiente.');
      return;
    }

    try {
      await placeBet({
        marketId,
        isYes: side === 'YES',
        amount: Number(amount).toString(),
        tokenSymbol: effectiveToken,
      });

      await refetchTokenBalance();
    } catch {
      // handled by hook
    }
  };

  const handleClaim = async () => {
    if (!isValidMarketId) return;
    try {
      setIsClaiming(true);
      await claim(marketId);
      await refetchTokenBalance();
    } finally {
      setIsClaiming(false);
    }
  };

  const handlePrimaryAction = async () => {
    if (!isWalletConnected) {
      await connectWallet();
      return;
    }

    if (isWrongNetwork) {
      await switchChain(expectedChainId);
      return;
    }

    await handlePlaceBet();
  };

  if (isClosed && market.status === 'resolved' && position.hasPosition && !position.claimed && userWon) {
    return (
      <div className="vp-card p-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-[999px] border border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.16)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#6ee7b7]">
          <Trophy className="h-3.5 w-3.5" /> Você acertou
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          O mercado foi resolvido a seu favor. Seus ganhos já estão disponíveis para saque.
        </p>
        <button
          onClick={handleClaim}
          disabled={isClaiming}
          className="vp-btn-primary mt-4 w-full px-4 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {isClaiming ? 'Confirmando saque...' : 'Sacar ganhos'}
        </button>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="vp-card p-6 text-center">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(245,158,11,0.2)] text-[#fbbf24]">
          <Clock3 className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Evento finalizado</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Este mercado foi encerrado e não aceita mais previsões.
        </p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="vp-card p-6 text-center">
        <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(16,185,129,0.18)] text-[#6ee7b7]">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Aposta confirmada na blockchain. Você apostou <span className="mono-value text-[var(--text-primary)]">${amount}</span>{' '}
          em <span className="font-semibold text-[var(--text-primary)]">{side === 'YES' ? 'SIM' : 'NÃO'}</span>.
        </p>
        <button onClick={reset} className="vp-btn-ghost mt-4 px-4 py-2 text-sm font-semibold">
          Fazer outra aposta
        </button>
      </div>
    );
  }

  return (
    <div className="vp-card p-6">
      {!isWalletConnected && (
        <div className="mb-4 rounded-[10px] border border-[rgba(59,130,246,0.45)] bg-[rgba(59,130,246,0.16)] p-4">
          <p className="text-sm font-semibold text-[#93c5fd]">🔌 Carteira desconectada</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Você já pode montar sua aposta. Para confirmar na blockchain, conecte a carteira.
          </p>
          <button
            onClick={() => void connectWallet()}
            className="mt-3 inline-flex items-center gap-2 rounded-[8px] border border-[rgba(59,130,246,0.45)] bg-[rgba(59,130,246,0.25)] px-4 py-2 text-sm font-semibold text-[#bfdbfe]"
          >
            <Wallet className="h-4 w-4" />
            Conectar carteira
          </button>
        </div>
      )}

      {isWrongNetwork && (
        <div className="mb-4 rounded-[10px] border border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.16)] p-4">
          <p className="text-sm font-semibold text-[#fcd34d]">⚠️ Rede incorreta</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Sua carteira está na rede errada. O mercado usa <span className="font-semibold text-[var(--text-primary)]">{chainName}</span>.
          </p>
          <button
            onClick={() => void switchChain(expectedChainId)}
            className="mt-3 rounded-[8px] border border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.25)] px-4 py-2 text-sm font-semibold text-[#fcd34d]"
          >
            Trocar rede
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-secondary)]">
          Saldo: <span className="mono-value text-[var(--text-primary)]">{balance}</span> {effectiveToken}
        </p>
        <select
          value={effectiveToken}
          onChange={(event) => setToken(event.target.value as SupportedToken)}
          disabled={hasForcedToken}
          className="rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-70"
        >
          {SUPPORTED_TOKENS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="mb-1 text-xs uppercase tracking-wider text-gray-500">Faça sua previsão</p>
        <p className="text-sm leading-relaxed text-gray-300">{market.title}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setSide('YES')}
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            side === 'YES'
              ? 'border-green-500 bg-green-500/10'
              : 'border-white/10 bg-white/5 hover:border-green-500/50'
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg text-green-400">✓</span>
            <span className="text-lg font-bold text-white">SIM</span>
          </div>
          <div className="mono-value text-2xl font-bold text-green-400">{yesMultiplier.toFixed(2)}x</div>
          <div className="mt-1 text-xs text-gray-400">{yesProbabilityPercent.toFixed(1)}% prob.</div>
          <div className="mt-2 h-1.5 rounded-full bg-white/10">
            <div className="h-1.5 rounded-full bg-green-400 transition-all" style={{ width: `${yesProbabilityPercent}%` }} />
          </div>
        </button>

        <button
          onClick={() => setSide('NO')}
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            side === 'NO'
              ? 'border-red-500 bg-red-500/10'
              : 'border-white/10 bg-white/5 hover:border-red-500/50'
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg text-red-400">✗</span>
            <span className="text-lg font-bold text-white">NÃO</span>
          </div>
          <div className="mono-value text-2xl font-bold text-red-400">{noMultiplier.toFixed(2)}x</div>
          <div className="mt-1 text-xs text-gray-400">{noProbabilityPercent.toFixed(1)}% prob.</div>
          <div className="mt-2 h-1.5 rounded-full bg-white/10">
            <div className="h-1.5 rounded-full bg-red-400 transition-all" style={{ width: `${noProbabilityPercent}%` }} />
          </div>
        </button>
      </div>

      <div className="mt-5 rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--text-secondary)]">Valor da aposta</p>
          <div className="mono-value text-2xl font-bold text-[var(--text-primary)]">${amount || '0'}</div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {[10, 25, 50, 100].map((value) => (
            <button
              key={value}
              onClick={() => handleQuickAmount(value)}
              className="rounded-[8px] border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              ${value}
            </button>
          ))}
          <button
            onClick={() => handleQuickAmount(balanceNumber)}
            className="rounded-[8px] border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            MAX
          </button>
        </div>

        <input
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          min={5}
          max={balanceNumber}
          step="0.01"
          className="w-full rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[rgba(124,58,237,0.5)] focus:outline-none"
        />
      </div>

      {hasPositiveAmount && side && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Ganho potencial</span>
            <span className="mono-value text-lg font-bold text-white">${toCurrency(potentialReturn)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm text-gray-400">Lucro estimado</span>
            <span className={`mono-value text-sm font-medium ${potentialProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {potentialProfit >= 0 ? '+' : ''}${toCurrency(potentialProfit)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm text-gray-400">Multiplicador</span>
            <span className="mono-value text-sm font-medium text-amber-400">{selectedMultiplier.toFixed(2)}x</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-gray-500">Taxa plataforma (3%)</span>
            <span className="mono-value text-xs text-gray-500">-${toCurrency(normalizedAmount * PLATFORM_FEE)} (se perder)</span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-3 text-xs">
          <div className={`rounded px-2 py-1 ${['approving', 'waiting_approval'].includes(step) ? 'bg-[rgba(124,58,237,0.25)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
            1. Aprovando
          </div>
          <span className="text-[var(--text-muted)]">→</span>
          <div className={`rounded px-2 py-1 ${['betting', 'waiting_bet'].includes(step) ? 'bg-[rgba(124,58,237,0.25)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
            2. Confirmando
          </div>
          <span className="text-[var(--text-muted)]">→</span>
          <div className={`rounded px-2 py-1 ${step === 'success' ? 'bg-[rgba(16,185,129,0.2)] text-[#6ee7b7]' : 'text-[var(--text-secondary)]'}`}>
            3. Registrado
          </div>
        </div>
      )}

      <button
        onClick={() => void handlePrimaryAction()}
        disabled={shouldDisablePrimary}
        className={`mt-5 w-full rounded-xl py-4 text-lg font-bold transition-all ${
          shouldDisablePrimary
            ? 'cursor-not-allowed bg-white/5 text-gray-500'
            : !isWalletConnected
              ? 'bg-blue-500 text-white hover:bg-blue-400'
              : isWrongNetwork
                ? 'bg-amber-500 text-black hover:bg-amber-400'
                : side === 'YES'
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 hover:bg-green-400'
                  : side === 'NO'
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-400'
                    : 'cursor-not-allowed bg-white/5 text-gray-500'
        }`}
      >
        {!isWalletConnected
          ? '🔗 Conectar carteira para apostar'
          : isWrongNetwork
            ? `Trocar para ${chainName}`
            : isLoading
              ? 'Processando...'
              : !side
                ? 'Selecione SIM ou NÃO'
                : !hasPositiveAmount
                  ? 'Digite o valor da aposta'
                  : !hasMinimumAmount
                    ? 'Valor mínimo: $5.00'
                    : !hasSufficientBalance
                      ? 'Saldo insuficiente'
                      : side === 'YES'
                        ? `Apostar $${primaryAmountLabel} em SIM →`
                        : `Apostar $${primaryAmountLabel} em NÃO →`}
      </button>

      <p className="mt-2 text-center text-xs text-[var(--text-muted)]">Taxa da plataforma: 3% sobre apostas perdedoras</p>

      {position.hasPosition && (
        <div className="mt-4 rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3">
          <p className="mb-1 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Sua posição no mercado</p>
          <div className="flex items-center gap-5 text-sm">
            {position.yesAmountNumber > 0 && (
              <span className="mono-value text-[#6ee7b7]">SIM: ${toCurrency(position.yesAmountNumber)}</span>
            )}
            {position.noAmountNumber > 0 && (
              <span className="mono-value text-[#fda4af]">NÃO: ${toCurrency(position.noAmountNumber)}</span>
            )}
            {position.claimed && <span className="text-xs text-[var(--text-secondary)]">(já sacado)</span>}
          </div>
        </div>
      )}
    </div>
  );
};
