import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Trophy, Wallet, XCircle } from 'lucide-react';
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
  const potentialReturn = side ? calculateReturn(normalizedAmount, side, totalYes, totalNo) : 0;
  const selectedMultiplier = side === 'YES' ? yesMultiplier : side === 'NO' ? noMultiplier : 0;
  const impliedProbability = selectedMultiplier > 0 ? (1 / selectedMultiplier) * 100 : 0;
  const potentialProfit = Math.max(0, potentialReturn - normalizedAmount);
  const isWrongNetwork = isWalletConnected && Boolean(chainId && chainId !== expectedChainId);
  const chainName = expectedChainId === 137 ? 'Polygon Mainnet' : 'Polygon Amoy (Testnet)';

  const handleQuickAmount = (value: number) => {
    const nextAmount = clampAmount(value, balanceNumber);
    setAmount(nextAmount > 0 ? String(Math.floor(nextAmount)) : '0');
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

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => setSide('YES')}
          className={`rounded-[10px] border px-4 py-4 text-left transition-all ${
            side === 'YES'
              ? 'border-[rgba(16,185,129,0.5)] bg-[rgba(16,185,129,0.14)]'
              : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(16,185,129,0.35)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#6ee7b7]">
              <CheckCircle2 className="h-4 w-4" /> SIM
            </span>
            <span className="mono-value text-sm font-bold text-[#fbbf24]">{yesMultiplier.toFixed(2)}x</span>
          </div>
          <p className="mono-value mt-1 text-xs text-[var(--text-secondary)]">{yesProbability.toFixed(1)}% prob.</p>
        </button>

        <button
          onClick={() => setSide('NO')}
          className={`rounded-[10px] border px-4 py-4 text-left transition-all ${
            side === 'NO'
              ? 'border-[rgba(239,68,68,0.5)] bg-[rgba(239,68,68,0.14)]'
              : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(239,68,68,0.35)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#fda4af]">
              <XCircle className="h-4 w-4" /> NÃO
            </span>
            <span className="mono-value text-sm font-bold text-[#fbbf24]">{noMultiplier.toFixed(2)}x</span>
          </div>
          <p className="mono-value mt-1 text-xs text-[var(--text-secondary)]">{noProbability.toFixed(1)}% prob.</p>
        </button>
      </div>

      {side && (
        <>
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

          {normalizedAmount > 0 && (
            <div className="mt-4 rounded-[10px] border border-[var(--border)] bg-[rgba(124,58,237,0.12)] p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Projeção da aposta</p>
              <p className="mono-value mt-1 text-sm text-[var(--text-secondary)]">
                Multiplicador atual: <span className="font-semibold text-[#fbbf24]">{selectedMultiplier.toFixed(2)}x</span>{' '}
                · {impliedProbability.toFixed(1)}% prob. implícita
              </p>
              <p className="mono-value mt-2 text-lg font-semibold text-[var(--text-primary)]">
                Ganho potencial: ${toCurrency(potentialReturn)}
              </p>
              <p className="mono-value mt-1 text-sm text-[#6ee7b7]">
                Lucro potencial: +${toCurrency(potentialProfit)}
              </p>
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
            onClick={handlePlaceBet}
            disabled={isLoading || !amount || Number(amount) <= 0 || Number(amount) > balanceNumber || !isWalletConnected}
            className={`mt-5 w-full rounded-[8px] px-4 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
              side === 'NO' ? 'bg-[rgba(239,68,68,0.85)] text-white' : 'vp-btn-primary'
            }`}
          >
            {!isWalletConnected
              ? 'Conecte a carteira para confirmar'
              : isLoading
                ? 'Processando...'
                : `Apostar $${amount || '0'} em ${side === 'YES' ? 'SIM' : 'NÃO'}`}
          </button>

          <p className="mt-2 text-center text-xs text-[var(--text-muted)]">Taxa da plataforma: 3% sobre apostas perdedoras</p>
        </>
      )}

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
