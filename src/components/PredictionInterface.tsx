import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  Info,
  Loader2,
  Wallet,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Market } from '../types';
import { useWeb3 } from '../hooks/useWeb3';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { usePlaceBet } from '../hooks/usePlaceBet';
import { useClaimWinnings } from '../hooks/useClaimWinnings';
import { useUserPosition } from '../hooks/useUserPosition';
import { SUPPORTED_TOKENS, type SupportedToken } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { ProgressBar } from './ui/VoxPrimitives';

interface PredictionInterfaceProps {
  market: Market;
}

type PrimaryAction = (() => void | Promise<void>) | null;

const PLATFORM_FEE = 0.03;
const QUICK_AMOUNTS = [10, 25, 50, 100];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

const parseBetLimit = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const calculateMultiplier = (totalYes: number, totalNo: number, side: 'YES' | 'NO') => {
  const winningPool = side === 'YES' ? totalYes : totalNo;
  const losingPool = side === 'YES' ? totalNo : totalYes;

  if (winningPool <= 0 && losingPool <= 0) return 2;
  if (winningPool <= 0) return 2;

  return (winningPool + losingPool * (1 - PLATFORM_FEE)) / winningPool;
};

const sanitizeOdds = (value: number | undefined | null, fallback: number) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
};

const normalizeProbability = (value: number | undefined, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed >= 0 && parsed <= 1) return parsed * 100;
  return parsed;
};

const formatAmountInput = (value: number) => {
  const normalized = Number(value.toFixed(2));
  return normalized === 0 ? '' : String(normalized);
};

const isSameAmount = (left: number, right: number) => Math.abs(left - right) < 0.0001;

export const PredictionInterface: React.FC<PredictionInterfaceProps> = ({ market }) => {
  const { isWalletConnected, connectWallet, chainId, switchChain } = useWeb3();
  const { isSignedIn, isLoaded } = useAuth();
  const expectedChainId = Number(import.meta.env.VITE_CHAIN_ID || 80002);

  const forcedToken = (market.token || '').toUpperCase();
  const hasForcedToken = SUPPORTED_TOKENS.includes(forcedToken as SupportedToken);

  const [selectedSide, setSelectedSide] = useState<boolean | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [inputValue, setInputValue] = useState<string>('');
  const [token, setToken] = useState<SupportedToken>((hasForcedToken ? forcedToken : 'USDT') as SupportedToken);
  const [isClaiming, setIsClaiming] = useState(false);

  const marketId = Number(market.id);
  const isValidMarketId = Number.isInteger(marketId) && marketId > 0;
  const effectiveToken = (hasForcedToken ? forcedToken : token) as SupportedToken;

  const { balance, balanceNumber, refetch: refetchTokenBalance } = useTokenBalance(effectiveToken);
  const { placeBet, isLoading, step, isSuccess, reset } = usePlaceBet();
  const { claim } = useClaimWinnings();
  const position = useUserPosition(isValidMarketId ? marketId : 0, effectiveToken);

  const minBet = parseBetLimit((market as { minBet?: number }).minBet, 5);
  const configuredMaxBet = parseBetLimit((market as { maxBet?: number }).maxBet, 1000);
  const maxBet = Math.max(configuredMaxBet, minBet);

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

  const hasEndedByTime = new Date(market.endDate).getTime() <= Date.now();
  const isClosed = market.status !== 'active' || hasEndedByTime;
  const outcome = (market.outcome || '').toUpperCase();
  const isResolvedByOutcome = ['YES', 'NO', 'CANCELLED'].includes(outcome);
  const isAwaitingResolution = (market.status === 'closed' || (market.status === 'active' && hasEndedByTime)) && !isResolvedByOutcome;
  const userWon =
    (outcome === 'YES' && position.yesAmountNumber > 0) || (outcome === 'NO' && position.noAmountNumber > 0);

  const yesMultiplier = calculateMultiplier(totalYes, totalNo, 'YES');
  const noMultiplier = calculateMultiplier(totalYes, totalNo, 'NO');
  const yesOdds = sanitizeOdds(market.yesOdds, sanitizeOdds(market.simOdds, yesMultiplier));
  const noOdds = sanitizeOdds(market.noOdds, sanitizeOdds(market.naoOdds, noMultiplier));

  const totalPool = totalYes + totalNo;
  const yesProbability = totalPool > 0 ? (totalYes / totalPool) * 100 : normalizeProbability(market.yesProbability, market.simProbability);
  const noProbability = totalPool > 0 ? (totalNo / totalPool) * 100 : normalizeProbability(market.noProbability, market.naoProbability);
  const yesProbabilityPercent = clamp(yesProbability, 0, 100);
  const noProbabilityPercent = clamp(noProbability, 0, 100);
  const isOnChainMarket = Boolean(market.contractAddress && /^0x[a-fA-F0-9]{40}$/.test(market.contractAddress));

  const activeOdds = selectedSide === false ? noOdds : yesOdds;
  const activeSideLabel = selectedSide === false ? 'NÃO' : 'SIM';
  const estimatedReturn = amount > 0 ? amount * activeOdds : 0;
  const estimatedProfit = estimatedReturn - amount;
  const feePreview = amount * PLATFORM_FEE;

  const hasPositiveAmount = amount > 0;
  const hasMinimumAmount = amount >= minBet;
  const exceedsMaxAmount = amount > maxBet;
  const hasSufficientBalance = !isOnChainMarket || amount <= balanceNumber;
  const isWrongNetwork = isWalletConnected && Boolean(chainId && chainId !== expectedChainId);
  const chainName = expectedChainId === 137 ? 'Polygon Mainnet' : 'Polygon Amoy (Testnet)';

  const handleAmountChange = (value: number) => {
    const normalized = Number.isFinite(value) ? Math.max(0, Number(value.toFixed(2))) : 0;
    setAmount(normalized);
    setInputValue(formatAmountInput(normalized));
  };

  const handleQuickAmount = (value: number) => {
    handleAmountChange(clamp(value, 0, maxBet));
  };

  const handleInputChange = (raw: string) => {
    setInputValue(raw);

    if (raw === '' || raw === '0') {
      setAmount(0);
      return;
    }

    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      setAmount(parsed);
    }
  };

  const handleInputBlur = () => {
    if (amount > 0 && amount < minBet) {
      handleAmountChange(minBet);
      return;
    }

    if (amount > maxBet) {
      handleAmountChange(maxBet);
      return;
    }

    setInputValue(formatAmountInput(amount));
  };

  const handleConnectWallet = async () => {
    if (!isLoaded) {
      toast.error('Aguarde, validando sua sessão.');
      return;
    }

    if (!isSignedIn) {
      window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'signin' } }));
      toast.error('Faça login primeiro para conectar sua carteira');
      return;
    }

    await connectWallet();
  };

  const handlePlaceBet = async () => {
    if (!isValidMarketId) {
      toast.error('ID de mercado inválido.');
      return;
    }

    if (selectedSide === null) {
      toast.error('Selecione SIM ou NÃO.');
      return;
    }

    if (!hasPositiveAmount) {
      toast.error('Informe um valor válido.');
      return;
    }

    if (!hasMinimumAmount) {
      toast.error(`Valor mínimo para aposta: $${toCurrency(minBet)}.`);
      return;
    }

    if (exceedsMaxAmount) {
      toast.error(`Valor máximo para aposta: $${toCurrency(maxBet)}.`);
      return;
    }

    if (!hasSufficientBalance) {
      toast.error('Saldo insuficiente na carteira.');
      return;
    }

    try {
      await placeBet({
        marketId,
        isYes: selectedSide === true,
        amount: amount.toString(),
        tokenSymbol: effectiveToken,
        offChain: !isOnChainMarket,
      });

      if (isOnChainMarket) {
        await refetchTokenBalance();
      }
    } catch {
      // handled by hook
    }
  };

  const handleClaim = async () => {
    if (!isValidMarketId) return;
    try {
      setIsClaiming(true);
      await claim(marketId, { offChain: !isOnChainMarket });
      if (isOnChainMarket) {
        await refetchTokenBalance();
      }
    } finally {
      setIsClaiming(false);
    }
  };

  const getButtonState = (): { text: string; action: PrimaryAction; className: string } => {
    if (!isSignedIn) {
      return {
        text: 'Faça login para apostar',
        action: () => {
          window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'signin' } }));
        },
        className: 'bg-[rgba(109,68,255,0.14)] text-[var(--text-primary)] border border-[var(--border-purple)]',
      };
    }

    if (isOnChainMarket && !isWalletConnected) {
      return {
        text: 'Conectar carteira para confirmar',
        action: handleConnectWallet,
        className: 'bg-[rgba(109,68,255,0.14)] text-[var(--text-primary)] border border-[var(--border-purple)]',
      };
    }

    if (isOnChainMarket && isWrongNetwork) {
      return {
        text: `Trocar para ${chainName}`,
        action: () => switchChain(expectedChainId),
        className: 'bg-[var(--action-dim)] text-[var(--text-primary)] border border-[var(--border-purple)]',
      };
    }

    if (selectedSide === null) {
      return {
        text: 'Selecione SIM ou NÃO',
        action: null,
        className: 'bg-[var(--bg-surface)] text-[var(--text-tertiary)] border border-[var(--border-faint)]',
      };
    }

    if (!hasPositiveAmount) {
      return {
        text: 'Digite o valor da aposta',
        action: null,
        className: 'bg-[var(--bg-surface)] text-[var(--text-tertiary)] border border-[var(--border-faint)]',
      };
    }

    if (!hasMinimumAmount) {
      return {
        text: `Mínimo $${toCurrency(minBet)}`,
        action: null,
        className: 'bg-[var(--bg-surface)] text-[var(--text-tertiary)] border border-[var(--border-faint)]',
      };
    }

    if (exceedsMaxAmount) {
      return {
        text: `Máximo $${toCurrency(maxBet)}`,
        action: null,
        className: 'bg-[var(--bg-surface)] text-[var(--text-tertiary)] border border-[var(--border-faint)]',
      };
    }

    if (!hasSufficientBalance) {
      return {
        text: 'Saldo insuficiente na carteira',
        action: null,
        className: 'bg-[var(--bg-surface)] text-[var(--text-tertiary)] border border-[var(--border-faint)]',
      };
    }

    return {
      text: `Confirmar ${activeSideLabel} — $${toCurrency(amount)}`,
      action: handlePlaceBet,
      className:
        selectedSide === true
          ? 'bg-[var(--green-primary)] text-black font-extrabold shadow-[0_4px_16px_rgba(0,192,118,0.3)]'
          : 'bg-[var(--red-primary)] text-white font-extrabold shadow-[0_4px_16px_rgba(255,59,92,0.3)]',
    };
  };

  const buttonState = getButtonState();
  const isPrimaryDisabled = isLoading || !buttonState.action;

  if (isAwaitingResolution) {
    return (
      <div className="vp-card p-5">
        <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
          <Clock3 className="h-4 w-4" />
          Mercado encerrado para apostas
        </div>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Aguardando resolução pelo administrador.</p>
      </div>
    );
  }

  if (isClosed && market.status === 'resolved' && position.hasPosition && !position.claimed && userWon) {
    return (
      <div className="vp-card p-6">
        <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
          <CheckCircle2 className="h-4 w-4" />
          Mercado resolvido a seu favor
        </div>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Seus ganhos já estão disponíveis para saque.</p>
        <button
          onClick={handleClaim}
          disabled={isClaiming}
          className="mt-4 w-full rounded-[8px] bg-[var(--action)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {isClaiming ? 'Confirmando saque...' : 'Sacar ganhos'}
        </button>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="vp-card p-6 text-center">
        <Clock3 className="mx-auto h-8 w-8 text-[var(--text-secondary)]" />
        <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">Evento finalizado</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Este mercado foi encerrado e não aceita mais previsões.</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="vp-card p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-[var(--text-primary)]" />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          {isOnChainMarket ? 'Aposta confirmada na blockchain.' : 'Aposta registrada no modo demonstração.'} Você apostou{' '}
          <span className="mono-value text-[var(--text-primary)]">${toCurrency(amount)}</span> em{' '}
          <span className="font-semibold text-[var(--text-primary)]">{selectedSide ? 'SIM' : 'NÃO'}</span>.
        </p>
        <button onClick={reset} className="vp-btn-ghost mt-4 px-4 py-2 text-sm font-semibold">
          Fazer outra aposta
        </button>
      </div>
    );
  }

  return (
    <aside className="vp-betting-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border-faint)] bg-[var(--bg-surface)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-tertiary)]" />
          <span>{!isOnChainMarket ? 'Demonstração' : 'On-chain'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{!isOnChainMarket ? 'off-chain' : 'wallet'}</span>
          <div className="relative">
            <select
              value={effectiveToken}
              onChange={(event) => setToken(event.target.value as SupportedToken)}
              disabled={hasForcedToken}
              className="appearance-none bg-transparent pr-4 text-[11px] uppercase tracking-[0.06em] text-[var(--text-primary)] disabled:opacity-70"
            >
              {SUPPORTED_TOKENS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--text-tertiary)]" />
          </div>
        </div>
      </div>

      <div className="border-b border-[var(--border-faint)] px-4 py-4">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Mercado</div>
        <p className="text-[14px] font-semibold leading-[1.45] text-[var(--text-primary)]">{market.title}</p>
      </div>

      {(isOnChainMarket && !isWalletConnected) || (isOnChainMarket && isWrongNetwork) ? (
        <div className="border-b border-[var(--border-faint)] px-4 py-3 text-[12px] text-[var(--text-secondary)]">
          {isOnChainMarket && !isWalletConnected ? (
            <div className="flex items-start gap-2">
              <Wallet className="mt-0.5 h-3.5 w-3.5 text-[var(--text-secondary)]" />
              <span>Monte a ordem agora. A conexão da carteira só é necessária para confirmar na blockchain.</span>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-[var(--text-secondary)]" />
              <span>Rede incorreta. Este mercado usa <strong className="text-[var(--text-primary)]">{chainName}</strong>.</span>
            </div>
          )}
        </div>
      ) : null}

      <div className="px-4 pt-4">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Posição</div>
      </div>
      <div className="border-b border-[var(--border-faint)] px-4 pb-4">
        {(() => {
          const simSelected = selectedSide === true;
          const naoSelected = selectedSide === false;

          return (
            <>
        <button
          onClick={() => setSelectedSide((prev) => (prev === true ? null : true))}
          className={`mb-2 w-full rounded-[8px] px-3.5 py-3 text-left transition-all duration-150 ${
            simSelected
              ? 'border-2 border-[var(--green-primary)] bg-[rgba(0,192,118,0.14)] shadow-[0_0_0_3px_rgba(0,192,118,0.12)]'
              : 'border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--green-border)] hover:bg-[rgba(0,192,118,0.06)]'
          }`}
          type="button"
        >
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <div className={`flex items-center gap-2 mono-value text-[14px] font-bold ${simSelected ? 'text-[var(--green-primary)] opacity-100' : 'text-[var(--text-secondary)] opacity-100'}`}>
              {simSelected ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              <span>SIM</span>
            </div>
            <span className={`mono-value text-right font-semibold transition-all ${simSelected ? 'text-[17px] text-[var(--gold)]' : 'text-[14px] text-[var(--text-secondary)]'}`}>
              {yesOdds.toFixed(2)}x
            </span>
          </div>
          <div className="mb-2 flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
            <span className="mono-value">{yesProbabilityPercent.toFixed(1)}% prob</span>
            <span className="mono-value">Pool ${toCurrency(totalYes)}</span>
          </div>
          <ProgressBar value={yesProbabilityPercent} color="green" height={3} />
        </button>

        <button
          onClick={() => setSelectedSide((prev) => (prev === false ? null : false))}
          className={`w-full rounded-[8px] px-3.5 py-3 text-left transition-all duration-150 ${
            naoSelected
              ? 'border-2 border-[var(--red-primary)] bg-[rgba(255,59,92,0.14)] shadow-[0_0_0_3px_rgba(255,59,92,0.12)]'
              : 'border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--red-border)] hover:bg-[rgba(255,59,92,0.06)]'
          }`}
          type="button"
        >
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <div className={`flex items-center gap-2 mono-value text-[14px] font-bold ${naoSelected ? 'text-[var(--red-primary)] opacity-100' : 'text-[var(--text-secondary)] opacity-100'}`}>
              {naoSelected ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              <span>NÃO</span>
            </div>
            <span className={`mono-value text-right font-semibold transition-all ${naoSelected ? 'text-[17px] text-[var(--gold)]' : 'text-[14px] text-[var(--text-secondary)]'}`}>
              {noOdds.toFixed(2)}x
            </span>
          </div>
          <div className="mb-2 flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
            <span className="mono-value">{noProbabilityPercent.toFixed(1)}% prob</span>
            <span className="mono-value">Pool ${toCurrency(totalNo)}</span>
          </div>
          <ProgressBar value={noProbabilityPercent} color="red" height={3} />
        </button>
            </>
          );
        })()}
      </div>

      <div className="px-4 pt-4">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Valor da aposta</div>
      </div>
      <div className="border-b border-[var(--border-faint)] px-4 pb-4">
        <div className="flex items-center gap-2 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-input)] px-4">
          <span className="mono-value text-[16px] text-[var(--text-secondary)]">$</span>
          <input
            type="number"
            min={minBet}
            max={maxBet}
            step="0.01"
            value={inputValue}
            onChange={(event) => handleInputChange(event.target.value)}
            onBlur={handleInputBlur}
            placeholder="0,00"
            className="w-full bg-transparent py-3 text-right text-[22px] font-semibold text-[var(--text-primary)] outline-none [appearance:textfield] mono-value [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>

        <div className="mt-3 flex gap-1.5">
          {QUICK_AMOUNTS.map((quickAmount) => (
            <button
              key={quickAmount}
              onClick={() => handleQuickAmount(quickAmount)}
              className={`flex-1 rounded-[5px] border px-0 py-1.5 text-center text-[12px] font-semibold mono-value transition-all ${
                isSameAmount(amount, quickAmount)
                  ? 'border-[var(--border-strong)] bg-[rgba(255,255,255,0.05)] text-[var(--text-primary)]'
                  : 'border-[var(--border-faint)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]'
              }`}
            >
              ${quickAmount}
            </button>
          ))}
          <button
            onClick={() => handleQuickAmount(maxBet)}
            className={`flex-1 rounded-[5px] border px-0 py-1.5 text-center text-[12px] font-semibold mono-value transition-all ${
              isSameAmount(amount, maxBet)
                ? 'border-[var(--border-strong)] bg-[rgba(255,255,255,0.05)] text-[var(--text-primary)]'
                : 'border-[var(--border-faint)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]'
            }`}
          >
            MAX
          </button>
        </div>

        <input
          type="range"
          min={minBet}
          max={maxBet}
          step="1"
          value={amount > 0 ? Math.min(maxBet, Math.max(minBet, amount)) : minBet}
          onChange={(event) => handleAmountChange(Number(event.target.value))}
          className="slider mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-[rgba(255,255,255,0.08)]"
        />

        <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
          <span className="mono-value">Mín {toCurrency(minBet)}</span>
          <span className="mono-value">Máx {toCurrency(maxBet)}</span>
        </div>

        {amount > 0 && amount < minBet ? <p className="mt-2 text-[12px] text-[var(--text-secondary)]">Valor mínimo é ${toCurrency(minBet)}</p> : null}
        {amount > maxBet ? <p className="mt-2 text-[12px] text-[var(--text-secondary)]">Valor máximo é ${toCurrency(maxBet)}</p> : null}
      </div>

      {selectedSide !== null && amount >= minBet ? (
        <div className="animate-[fadeInUp_0.2s_ease] border-b border-[var(--border-faint)] bg-[var(--bg-surface)] py-2">
          <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Retorno estimado</div>
          <div className="flex items-center justify-between px-4 py-2 text-[13px]">
            <span className="text-[var(--text-secondary)]">Apostado</span>
            <span className="mono-value text-[var(--text-primary)]">${toCurrency(amount)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2 text-[13px]">
            <span className="text-[var(--text-secondary)]">Retorno bruto</span>
            <span className="mono-value text-[var(--text-primary)]">${toCurrency(estimatedReturn)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2 text-[13px]">
            <span className="text-[var(--text-secondary)]">Lucro líquido</span>
            <span className="mono-value font-semibold text-[var(--text-primary)]">+${toCurrency(estimatedProfit)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2 text-[13px]">
            <span className="text-[var(--text-secondary)]">Taxa plataforma (3%)</span>
            <span className="mono-value text-[var(--text-tertiary)]">-${toCurrency(feePreview)}</span>
          </div>
        </div>
      ) : null}

      {position.hasPosition ? (
        <div className="border-b border-[var(--border-faint)] px-4 py-3 text-[12px] text-[var(--text-secondary)]">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Sua posição</div>
          <div className="flex flex-wrap items-center gap-3">
            {position.yesAmountNumber > 0 ? <span className="mono-value text-[var(--text-primary)]">SIM: ${toCurrency(position.yesAmountNumber)}</span> : null}
            {position.noAmountNumber > 0 ? <span className="mono-value text-[var(--text-primary)]">NÃO: ${toCurrency(position.noAmountNumber)}</span> : null}
            {position.claimed ? <span className="text-[var(--text-tertiary)]">Sacado</span> : null}
          </div>
        </div>
      ) : null}

      {(isOnChainMarket ? (
        <div className="px-4 py-3 text-[12px] text-[var(--text-secondary)]">
          <div className="flex items-center justify-between">
            <span>Saldo disponível</span>
            <span className="mono-value text-[var(--text-primary)]">{balance}</span>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 text-[12px] text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            <span>Mercado de demonstração com registro off-chain.</span>
          </div>
        </div>
      ))}

      {isLoading ? (
        <div className="border-t border-[var(--border-faint)] px-4 py-3 text-[12px] text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{step === 'approving' || step === 'waiting_approval' ? 'Aprovando token...' : step === 'betting' || step === 'waiting_bet' ? 'Confirmando aposta...' : 'Registrando...'}</span>
          </div>
        </div>
      ) : null}

      <button
        onClick={() => {
          if (!isPrimaryDisabled && buttonState.action) {
            void buttonState.action();
          }
        }}
        disabled={isPrimaryDisabled}
        className={`m-4 block w-[calc(100%-2rem)] rounded-[8px] px-4 py-3 text-[14px] font-bold transition-all ${buttonState.className} ${isPrimaryDisabled ? 'cursor-not-allowed' : 'hover:brightness-110'}`}
      >
        {buttonState.text}
      </button>
    </aside>
  );
};
