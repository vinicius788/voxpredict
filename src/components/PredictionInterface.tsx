import React, { useMemo, useState } from 'react';
import { Check, CheckCircle2, Clock3, Loader2, Trophy, Wallet, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Market } from '../types';
import { useWeb3 } from '../hooks/useWeb3';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { usePlaceBet } from '../hooks/usePlaceBet';
import { useClaimWinnings } from '../hooks/useClaimWinnings';
import { useUserPosition } from '../hooks/useUserPosition';
import { SUPPORTED_TOKENS, type SupportedToken } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';

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
  const platformFee = amount * PLATFORM_FEE;

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
        className: 'bg-purple-600 text-white hover:bg-purple-500',
      };
    }

    if (isOnChainMarket && !isWalletConnected) {
      return {
        text: 'Conectar carteira para apostar',
        action: handleConnectWallet,
        className: 'bg-blue-600 text-white hover:bg-blue-500',
      };
    }

    if (isOnChainMarket && isWrongNetwork) {
      return {
        text: `Trocar para ${chainName}`,
        action: () => switchChain(expectedChainId),
        className: 'bg-amber-600 text-white hover:bg-amber-500',
      };
    }

    if (selectedSide === null) {
      return {
        text: 'Selecione SIM ou NÃO para apostar',
        action: null,
        className: 'cursor-not-allowed bg-white/10 text-gray-500',
      };
    }

    if (!hasPositiveAmount) {
      return {
        text: 'Digite o valor da aposta',
        action: null,
        className: 'cursor-not-allowed bg-white/10 text-gray-500',
      };
    }

    if (!hasMinimumAmount) {
      return {
        text: `Mínimo $${toCurrency(minBet)}`,
        action: null,
        className: 'cursor-not-allowed bg-white/10 text-gray-500',
      };
    }

    if (exceedsMaxAmount) {
      return {
        text: `Máximo $${toCurrency(maxBet)}`,
        action: null,
        className: 'cursor-not-allowed bg-white/10 text-gray-500',
      };
    }

    if (!hasSufficientBalance) {
      return {
        text: 'Saldo insuficiente na carteira',
        action: null,
        className: 'cursor-not-allowed bg-white/10 text-gray-500',
      };
    }

    const sideLabel = selectedSide ? 'SIM' : 'NÃO';
    const sideClass = selectedSide
      ? 'bg-green-600 text-white shadow-lg shadow-green-500/20 hover:bg-green-500'
      : 'bg-red-600 text-white shadow-lg shadow-red-500/20 hover:bg-red-500';

    return {
      text: `Apostar $${toCurrency(amount)} em ${sideLabel} →`,
      action: handlePlaceBet,
      className: sideClass,
    };
  };

  const buttonState = getButtonState();
  const isPrimaryDisabled = isLoading || !buttonState.action;

  if (isAwaitingResolution) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
        <p className="font-medium text-amber-400">Mercado encerrado para apostas</p>
        <p className="mt-1 text-sm text-gray-400">Aguardando resolução pelo administrador</p>
      </div>
    );
  }

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
    <div className="vp-card p-6">
      {!isOnChainMarket && (
        <div className="mb-4 rounded-[10px] border border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.12)] p-3">
          <p className="text-xs font-semibold text-[#93c5fd]">Mercado de demonstração</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Apostas registradas off-chain para testes. Não exige transação na carteira.
          </p>
        </div>
      )}

      {isOnChainMarket && !isWalletConnected && (
        <div className="mb-4 rounded-[10px] border border-[rgba(59,130,246,0.45)] bg-[rgba(59,130,246,0.16)] p-4">
          <p className="text-sm font-semibold text-[#93c5fd]">Carteira desconectada</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Você já pode montar sua aposta. Para confirmar na blockchain, conecte a carteira.
          </p>
          <button
            onClick={() => void handleConnectWallet()}
            className="mt-3 inline-flex items-center gap-2 rounded-[8px] border border-[rgba(59,130,246,0.45)] bg-[rgba(59,130,246,0.25)] px-4 py-2 text-sm font-semibold text-[#bfdbfe]"
          >
            <Wallet className="h-4 w-4" />
            Conectar carteira
          </button>
        </div>
      )}

      {isOnChainMarket && isWrongNetwork && (
        <div className="mb-4 rounded-[10px] border border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.16)] p-4">
          <p className="text-sm font-semibold text-[#fcd34d]">Rede incorreta</p>
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
          {isOnChainMarket ? (
            <>
              Saldo: <span className="mono-value text-[var(--text-primary)]">{balance}</span> {effectiveToken}
            </>
          ) : (
            <>Modo off-chain ativo</>
          )}
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
          onClick={() => setSelectedSide((prev) => (prev === true ? null : true))}
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            selectedSide === true
              ? 'border-green-500 bg-green-500/15 shadow-lg shadow-green-500/10'
              : 'border-white/10 bg-white/5 hover:border-green-500/40 hover:bg-green-500/5'
          }`}
        >
          <div className="mb-1 flex items-center gap-2">
            <Check className={`h-4 w-4 ${selectedSide === true ? 'text-green-400' : 'text-gray-400'}`} />
            <span className="text-white font-bold">SIM</span>
          </div>
          <div className={`mono-value text-2xl font-bold ${selectedSide === true ? 'text-green-400' : 'text-gray-300'}`}>
            {yesOdds.toFixed(2)}x
          </div>
          <div className="mt-1 text-xs text-gray-500">{yesProbabilityPercent.toFixed(1)}% prob.</div>
          <div className="mt-2 h-1 rounded-full bg-white/10">
            <div className="h-1 rounded-full bg-green-400 transition-all" style={{ width: `${yesProbabilityPercent}%` }} />
          </div>
        </button>

        <button
          onClick={() => setSelectedSide((prev) => (prev === false ? null : false))}
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            selectedSide === false
              ? 'border-red-500 bg-red-500/15 shadow-lg shadow-red-500/10'
              : 'border-white/10 bg-white/5 hover:border-red-500/40 hover:bg-red-500/5'
          }`}
        >
          <div className="mb-1 flex items-center gap-2">
            <X className={`h-4 w-4 ${selectedSide === false ? 'text-red-400' : 'text-gray-400'}`} />
            <span className="text-white font-bold">NÃO</span>
          </div>
          <div className={`mono-value text-2xl font-bold ${selectedSide === false ? 'text-red-400' : 'text-gray-300'}`}>
            {noOdds.toFixed(2)}x
          </div>
          <div className="mt-1 text-xs text-gray-500">{noProbabilityPercent.toFixed(1)}% prob.</div>
          <div className="mt-2 h-1 rounded-full bg-white/10">
            <div className="h-1 rounded-full bg-red-400 transition-all" style={{ width: `${noProbabilityPercent}%` }} />
          </div>
        </button>
      </div>

      <div className="mt-5 rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--text-secondary)]">Valor da aposta</p>
          <div className="mono-value text-2xl font-bold text-[var(--text-primary)]">${toCurrency(amount)}</div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((quickAmount) => (
            <button
              key={quickAmount}
              onClick={() => handleQuickAmount(quickAmount)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                isSameAmount(amount, quickAmount)
                  ? 'bg-amber-500 text-black'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              ${quickAmount}
            </button>
          ))}
          <button
            onClick={() => handleQuickAmount(maxBet)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              isSameAmount(amount, maxBet) ? 'bg-amber-500 text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            MAX
          </button>
        </div>

        <input
          type="number"
          min={minBet}
          max={maxBet}
          value={inputValue}
          onChange={(event) => handleInputChange(event.target.value)}
          onBlur={handleInputBlur}
          placeholder={`Mín. $${toCurrency(minBet)}`}
          className="w-full rounded-lg border border-white/10 bg-[#0f0f1a] px-4 py-3 text-lg font-medium text-white [appearance:textfield] focus:border-amber-500/50 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        <div className="mt-1 flex justify-between text-xs text-gray-600">
          <span>Mín: ${toCurrency(minBet)}</span>
          <span>Máx: ${toCurrency(maxBet)}</span>
        </div>

        {amount > 0 && amount < minBet && <p className="mt-1 text-xs text-red-400">Valor mínimo é ${toCurrency(minBet)}</p>}
        {amount > maxBet && <p className="mt-1 text-xs text-red-400">Valor máximo é ${toCurrency(maxBet)}</p>}
      </div>

      {amount > 0 && (
        <div className="mt-3 rounded-xl border border-white/10 p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-gray-500">
              Apostando em {activeSideLabel} • {activeOdds.toFixed(2)}x
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Ganho potencial</span>
              <span className="mono-value text-lg font-bold text-white">${toCurrency(estimatedReturn)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Lucro estimado</span>
              <span className={`mono-value text-sm font-semibold ${estimatedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {estimatedProfit >= 0 ? '+' : ''}${toCurrency(estimatedProfit)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Sua aposta</span>
              <span className="mono-value text-sm text-gray-300">${toCurrency(amount)}</span>
            </div>

            <div className="flex justify-between border-t border-white/5 pt-2">
              <span className="text-xs text-gray-600">Taxa plataforma (se perder)</span>
              <span className="mono-value text-xs text-gray-600">-${toCurrency(platformFee)}</span>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-3 text-xs">
          <div
            className={`rounded px-2 py-1 ${
              ['approving', 'waiting_approval'].includes(step)
                ? 'bg-[rgba(124,58,237,0.25)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            1. Aprovando
          </div>
          <span className="text-[var(--text-muted)]">→</span>
          <div
            className={`rounded px-2 py-1 ${
              ['betting', 'waiting_bet'].includes(step)
                ? 'bg-[rgba(124,58,237,0.25)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            2. Confirmando
          </div>
          <span className="text-[var(--text-muted)]">→</span>
          <div
            className={`rounded px-2 py-1 ${
              step === 'success' ? 'bg-[rgba(16,185,129,0.2)] text-[#6ee7b7]' : 'text-[var(--text-secondary)]'
            }`}
          >
            3. Registrado
          </div>
        </div>
      )}

      <button
        onClick={() => {
          if (!isPrimaryDisabled && buttonState.action) {
            void buttonState.action();
          }
        }}
        disabled={isPrimaryDisabled}
        className={`mt-5 w-full rounded-xl py-4 text-base font-bold transition-all ${buttonState.className}`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Confirmando...
          </span>
        ) : (
          buttonState.text
        )}
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
