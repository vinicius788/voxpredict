import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Crown,
  DollarSign,
  Filter,
  Info,
  Landmark,
  LineChart,
  PiggyBank,
  Send,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { DepositModal } from '../components/DepositModal';
import { WithdrawModal } from '../components/WithdrawModal';
import { useAuth } from '../contexts/AuthContext';
import { useVaultContract, type VaultToken } from '../hooks/useVaultContract';
import { useNotifications } from '../hooks/useNotifications';
import { useMarkets } from '../hooks/useMarkets';
import { useClaimWinnings } from '../hooks/useClaimWinnings';
import {
  useMyPositions,
  useMyProposals,
  usePortfolioHistory,
  useRecentActivity,
  useUserStats,
} from '../hooks/useUserDashboard';
import { usePolymarketProfile } from '../hooks/usePolymarket';
import { useWeb3 } from '../hooks/useWeb3';
import { CategoryBadge, EmptyState, ProgressBar } from '../components/ui/VoxPrimitives';

const PLATFORM_FEE_RATE = 0.03;

type DashboardTab = 'overview' | 'proposals';
type PerformancePeriod = '7d' | '30d' | '90d' | 'all';
type PositionFilter = 'soon' | 'return' | 'category';

type PositionRow = {
  id: string;
  marketId: string;
  contractAddress?: string;
  title: string;
  categoryName: string;
  rawSide: 'YES' | 'NO';
  side: 'SIM' | 'NÃO';
  amount: number;
  currentOdds: number;
  estimatedValue: number;
  estimatedProfit: number;
  closeTime: string;
  status: string;
  outcome: string | null;
  claimed: boolean;
  yesPool: number;
  noPool: number;
  isResolved: boolean;
  isWinner: boolean;
  isCancelled: boolean;
  receivedValue: number;
  pnl: number;
};

const formatUsd = (value: number) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getGreetingByHour = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

const getRelativeDateLabel = (date: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hoje';
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
  return date.toLocaleDateString('pt-BR');
};

const calculateMultiplier = (totalYes: number, totalNo: number, side: 'YES' | 'NO') => {
  const sidePool = side === 'YES' ? totalYes : totalNo;
  const otherPool = side === 'YES' ? totalNo : totalYes;
  const total = totalYes + totalNo;

  if (total <= 0 || sidePool <= 0) return 2;

  return (sidePool + otherPool * (1 - PLATFORM_FEE_RATE)) / sidePool;
};

const calculateResolvedPayout = (
  stake: number,
  side: 'YES' | 'NO',
  outcome: string | null,
  yesPool: number,
  noPool: number,
) => {
  if (outcome === 'CANCELLED') return stake;
  if (!outcome || !['YES', 'NO'].includes(outcome)) return 0;

  const isWinner = (side === 'YES' && outcome === 'YES') || (side === 'NO' && outcome === 'NO');
  if (!isWinner) return 0;

  const winningPool = side === 'YES' ? yesPool : noPool;
  const losingPool = side === 'YES' ? noPool : yesPool;
  if (winningPool <= 0) return stake;

  const prizePool = losingPool * (1 - PLATFORM_FEE_RATE);
  return stake + prizePool * (stake / winningPool);
};

const normalizeCategory = (category: string | { name: string; emoji?: string }) => {
  if (typeof category === 'string') {
    return {
      name: category,
    };
  }

  return {
    name: category.name,
  };
};

export const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isSignedIn, user } = useAuth();
  const { claim } = useClaimWinnings();
  const { isWalletConnected, walletAddress, connectWallet, chainId, switchChain } = useWeb3();
  const hasAccess = Boolean(isSignedIn && user);
  const { unreadCount } = useNotifications(hasAccess);
  const expectedChainId = Number(import.meta.env.VITE_CHAIN_ID || 80002);

  const [positionFilter, setPositionFilter] = useState<PositionFilter>('soon');
  const [performancePeriod, setPerformancePeriod] = useState<PerformancePeriod>('30d');
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('overview');
  const [claimingPositionKey, setClaimingPositionKey] = useState<string | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const { data: marketResponse } = useMarkets({ limit: 120, includeAll: true });
  const { data: polymarketProfile } = usePolymarketProfile(isWalletConnected ? walletAddress : null);
  const { data: userStats } = useUserStats(hasAccess);
  const { data: myPositions = [] } = useMyPositions(hasAccess);
  const { data: activity = [], isLoading: activityLoading } = useRecentActivity(hasAccess, 20);
  const { data: portfolioHistory = [], isLoading: historyLoading } = usePortfolioHistory(performancePeriod, hasAccess);
  const { data: myProposals = [], isLoading: proposalsLoading } = useMyProposals(hasAccess);

  const {
    vaultData,
    deposit,
    withdraw,
    isProcessing: vaultProcessing,
    stepMessage: vaultStepMessage,
  } = useVaultContract(hasAccess);

  const markets = marketResponse?.markets || [];

  const marketByNormalizedTitle = useMemo(() => {
    const map = new Map<string, (typeof markets)[number]>();
    markets.forEach((market) => {
      map.set(market.title.trim().toLowerCase(), market);
    });
    return map;
  }, [markets]);

  const positions = useMemo<PositionRow[]>(() => {
    return myPositions.map((position) => {
      const amount = Number(position.amount || 0);
      const normalizedCategory = normalizeCategory(position.market.category);
      const status = String(position.market.status || 'ACTIVE').toUpperCase();
      const outcome = position.market.outcome ? String(position.market.outcome).toUpperCase() : null;

      const yesPool = Number(position.market.yesPool ?? position.market.totalYes ?? 0);
      const noPool = Number(position.market.noPool ?? position.market.totalNo ?? 0);

      const currentOdds = Number(
        position.currentOdds ?? calculateMultiplier(yesPool, noPool, position.side === 'YES' ? 'YES' : 'NO'),
      );

      const estimatedValue = Number(position.estimatedValue ?? amount * currentOdds);
      const estimatedProfit = Number(position.estimatedProfit ?? estimatedValue - amount);

      const closeTime = position.market.closeTime || position.market.endTime;
      const isResolved =
        ['RESOLVED', 'CANCELLED'].includes(status) ||
        (outcome ? ['YES', 'NO', 'CANCELLED'].includes(outcome) : false);
      const isCancelled = outcome === 'CANCELLED';
      const isWinner =
        !isCancelled &&
        ((position.side === 'YES' && outcome === 'YES') || (position.side === 'NO' && outcome === 'NO'));

      const receivedValue = isResolved
        ? calculateResolvedPayout(amount, position.side, outcome, yesPool, noPool)
        : estimatedValue;
      const pnl = isResolved
        ? (isCancelled ? 0 : receivedValue - amount)
        : estimatedProfit;

      return {
        id: position.id,
        marketId: String(position.marketId),
        contractAddress: position.market.contractAddress,
        title: position.market.title || position.market.question,
        categoryName: normalizedCategory.name,
        rawSide: position.side,
        side: position.side === 'YES' ? 'SIM' : 'NÃO',
        amount,
        currentOdds,
        estimatedValue,
        estimatedProfit,
        closeTime,
        status,
        outcome,
        claimed: Boolean(position.claimed),
        yesPool,
        noPool,
        isResolved,
        isWinner,
        isCancelled,
        receivedValue,
        pnl,
      };
    });
  }, [myPositions]);

  const now = Date.now();

  const activePositions = useMemo(() => {
    const onlyActive = positions.filter((row) => !row.isResolved && new Date(row.closeTime).getTime() > now);
    const sorted = [...onlyActive];

    if (positionFilter === 'soon') {
      sorted.sort((a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime());
    }

    if (positionFilter === 'return') {
      sorted.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
    }

    if (positionFilter === 'category') {
      sorted.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
    }

    return sorted;
  }, [positions, positionFilter, now]);

  const resolvedPositions = useMemo(() => {
    return [...positions]
      .filter((row) => row.isResolved)
      .sort((a, b) => new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime());
  }, [positions]);

  const subtitle = (() => {
    if (!activePositions.length) return 'Explore os mercados e faça sua primeira previsão';

    const openSoonCount = activePositions.filter((row) => {
      const diff = new Date(row.closeTime).getTime() - now;
      return diff > 0 && diff <= 48 * 60 * 60 * 1000;
    }).length;

    if (openSoonCount > 0) return `${openSoonCount} posição${openSoonCount > 1 ? 'ões' : ''} encerram em breve`;
    return `Você tem ${activePositions.length} posições ativas`;
  })();

  const totalStaked = userStats?.totalBet ?? positions.reduce((sum, row) => sum + row.amount, 0);
  const totalWon = userStats?.totalWon ?? userStats?.totalWinnings ?? 0;
  const resolvedBets = resolvedPositions.reduce((sum, row) => sum + row.amount, 0);
  const activeBets = activePositions.reduce((sum, row) => sum + row.amount, 0);
  const estimatedActiveValue = activePositions.reduce((sum, row) => sum + row.estimatedValue, 0);

  const realizedPnl = userStats?.realizedPnl ?? (totalWon - resolvedBets);
  const unrealizedPnl = userStats?.unrealizedPnl ?? (estimatedActiveValue - activeBets);
  const totalFeePaid = userStats?.totalFeePaid ?? 0;
  const portfolioValue = userStats?.portfolioValue ?? (vaultData.availableBalance + estimatedActiveValue);

  const handleClaimInline = async (position: PositionRow) => {
    if (!position.isResolved || !position.isWinner || position.claimed) return;

    const marketId = Number(position.marketId);
    if (!Number.isInteger(marketId) || marketId <= 0) return;

    const isOnChainMarket = Boolean(position.contractAddress && /^0x[a-fA-F0-9]{40}$/.test(position.contractAddress));

    try {
      if (isOnChainMarket && !isWalletConnected) {
        await connectWallet();
        return;
      }

      if (isOnChainMarket && chainId && chainId !== expectedChainId) {
        await switchChain(expectedChainId);
      }

      setClaimingPositionKey(position.id);
      await claim(marketId, { offChain: !isOnChainMarket });
    } finally {
      setClaimingPositionKey(null);
    }
  };

  const groupedActivities = useMemo(() => {
    return activity.reduce<Record<string, typeof activity>>((groups, item) => {
      const date = new Date(item.createdAt);
      const label = getRelativeDateLabel(date);
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
      return groups;
    }, {});
  }, [activity]);

  const categoryPreference = useMemo(() => {
    const counts = new Map<string, number>();
    activePositions.forEach((position) => {
      counts.set(position.categoryName, (counts.get(position.categoryName) || 0) + 1);
    });

    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([category]) => category);
  }, [activePositions]);

  const recommendedMarkets = useMemo(() => {
    const activeIds = new Set(activePositions.map((position) => position.marketId));

    const sorted = [...markets]
      .filter((market) => market.status === 'active' && !activeIds.has(String(market.id)))
      .sort((a, b) => {
        const aScore = (categoryPreference.includes(a.category) ? 1_000_000 : 0) + a.totalVolume;
        const bScore = (categoryPreference.includes(b.category) ? 1_000_000 : 0) + b.totalVolume;
        return bScore - aScore;
      })
      .slice(0, 4);

    return sorted;
  }, [activePositions, categoryPreference, markets]);

  const interestLabel = categoryPreference.slice(0, 2).join(' e ') || 'mercados com maior volume';

  const performancePositive =
    portfolioHistory.length > 1
      ? (portfolioHistory[portfolioHistory.length - 1].value >= portfolioHistory[0].value)
      : true;

  const handleDeposit = async (amount: number, token: VaultToken) => {
    await deposit(amount, token);
  };

  const handleWithdraw = async (amount: number) => {
    await withdraw(amount);
  };

  if (!hasAccess) {
    return (
      <div className="app-shell pb-16 lg:pb-0">
        <Header />

        <div className="section-shell flex min-h-[70vh] items-center justify-center py-12">
          <div className="vp-card max-w-md p-8 text-center">
            <Wallet className="mx-auto h-12 w-12 text-[var(--accent-glow)]" />
            <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">Faça login para continuar</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Seu dashboard pessoal fica disponível após autenticação da conta.
            </p>
            <button
              onClick={() => navigate('/')}
              className="vp-btn-primary mt-6 px-6 py-2.5 text-sm font-semibold"
            >
              Voltar ao início
            </button>
          </div>
        </div>

        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="app-shell pb-16 lg:pb-0">
      <Header />

      <main className="section-shell py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-[var(--text-primary)] md:text-4xl">
              {getGreetingByHour()}, {user?.firstName || user?.email || 'Usuário'}
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(124,58,237,0.24)] bg-[rgba(124,58,237,0.12)] px-3 py-2 text-sm text-white">
              <Crown className="h-4 w-4 text-[#fbbf24]" />
              <span>{userStats?.ranking ? `Rank #${userStats.ranking}` : 'Sem rank ainda'}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[var(--text-secondary)]">
              <Bell className="h-4 w-4" />
              <span>{unreadCount} alerta{unreadCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-2">
          <button
            onClick={() => setDashboardTab('overview')}
            className={`rounded-[8px] px-3 py-2 text-sm font-semibold transition-colors ${
              dashboardTab === 'overview'
                ? 'bg-[rgba(124,58,237,0.26)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setDashboardTab('proposals')}
            className={`rounded-[8px] px-3 py-2 text-sm font-semibold transition-colors ${
              dashboardTab === 'proposals'
                ? 'bg-[rgba(124,58,237,0.26)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Minhas Propostas {myProposals.length > 0 ? `(${myProposals.length})` : ''}
          </button>
        </div>

        {polymarketProfile && polymarketProfile.marketsTraded > 0 ? (
          <section className="vp-card mb-6 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Perfil Polymarket</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                  Trader Polymarket {polymarketProfile.verifiedBadge ? 'Verificado' : 'Ativo'}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {polymarketProfile.name || polymarketProfile.pseudonym || polymarketProfile.proxyWalletAddress}
                </p>
              </div>

              <a
                href={`https://polymarket.com/profile/${polymarketProfile.proxyWalletAddress}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Ver perfil público
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Mercados</p>
                <p className="mono-value mt-1 text-lg font-semibold text-[var(--text-primary)]">
                  {polymarketProfile.marketsTraded}
                </p>
              </div>
              <div className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Win rate recente</p>
                <p className="mono-value mt-1 text-lg font-semibold text-[var(--text-primary)]">
                  {(polymarketProfile.winRate * 100).toFixed(0)}%
                </p>
              </div>
              <div className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Volume estimado</p>
                <p className="mono-value mt-1 text-lg font-semibold text-[var(--text-primary)]">
                  ${formatUsd(polymarketProfile.estimatedVolume)}
                </p>
              </div>
              <div className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">P&amp;L recente</p>
                <p
                  className={`mono-value mt-1 text-lg font-semibold ${
                    polymarketProfile.realizedPnl >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'
                  }`}
                >
                  {polymarketProfile.realizedPnl >= 0 ? '+' : ''}${formatUsd(polymarketProfile.realizedPnl)}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {dashboardTab === 'proposals' ? (
          <section className="vp-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Minhas Propostas</h2>
              <p className="text-xs text-[var(--text-secondary)]">Acompanhe aprovação e feedback do admin</p>
            </div>

            {proposalsLoading ? (
              <p className="text-sm text-[var(--text-secondary)]">Carregando propostas...</p>
            ) : myProposals.length === 0 ? (
              <div className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-5 text-sm text-[var(--text-secondary)]">
                Você ainda não enviou propostas. Use o botão flutuante <strong className="text-[var(--text-primary)]">Propor Mercado</strong>.
              </div>
            ) : (
              <div className="space-y-3">
                {myProposals.map((proposal) => {
                  const linkedMarket = marketByNormalizedTitle.get(proposal.title.trim().toLowerCase());

                  const statusClass =
                    proposal.status === 'APPROVED'
                      ? 'border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.14)] text-[#6ee7b7]'
                      : proposal.status === 'REJECTED'
                        ? 'border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.14)] text-[#fca5a5]'
                        : 'border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.14)] text-[#fcd34d]';

                  const statusLabel =
                    proposal.status === 'APPROVED'
                      ? 'Aprovado'
                      : proposal.status === 'REJECTED'
                        ? 'Rejeitado'
                        : 'Aguardando revisão';

                  return (
                    <article key={proposal.id} className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{proposal.title}</h3>
                        <span className={`rounded-[999px] border px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <p className="text-sm text-[var(--text-secondary)]">{proposal.description}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                        <span>Categoria: {proposal.category}</span>
                        <span>Resolve até: {new Date(proposal.resolveBy).toLocaleDateString('pt-BR')}</span>
                        <span>Enviada em: {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>

                      {proposal.status === 'APPROVED' && linkedMarket && (
                        <button
                          onClick={() => navigate(`/market/${linkedMarket.id}`)}
                          className="mt-3 rounded-[8px] border border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.2)] px-3 py-1.5 text-xs font-semibold text-[#6ee7b7]"
                        >
                          Ver mercado criado
                        </button>
                      )}

                      {proposal.adminNote && (
                        <div className="mt-3 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-3 text-xs text-[var(--text-secondary)]">
                          <strong className="text-[var(--text-primary)]">Nota do admin:</strong> {proposal.adminNote}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Portfólio',
                  value: `$${formatUsd(portfolioValue)}`,
                  helper: userStats?.ranking ? `Rank #${userStats.ranking}` : 'Sem ranking definido ainda',
                  icon: Wallet,
                  accent: 'from-[#7c3aed] to-[#8b5cf6]',
                  text: 'text-white',
                },
                {
                  label: 'Posições',
                  value: String(positions.length),
                  helper: `${activePositions.length} ativas · ${resolvedPositions.length} fechadas`,
                  icon: PiggyBank,
                  accent: 'from-[#2563eb] to-[#60a5fa]',
                  text: 'text-white',
                },
                {
                  label: 'P&L Realizado',
                  value: `${realizedPnl >= 0 ? '+' : ''}$${formatUsd(realizedPnl)}`,
                  helper: `Retornos $${formatUsd(totalWon)}`,
                  icon: DollarSign,
                  accent: realizedPnl >= 0 ? 'from-[#16a34a] to-[#22c55e]' : 'from-[#dc2626] to-[#ef4444]',
                  text: realizedPnl >= 0 ? 'text-[#86efac]' : 'text-[#fca5a5]',
                },
                {
                  label: 'P&L Não Realizado',
                  value: `${unrealizedPnl >= 0 ? '+' : ''}$${formatUsd(unrealizedPnl)}`,
                  helper: 'Valor estimado em posições ativas',
                  icon: LineChart,
                  accent: unrealizedPnl >= 0 ? 'from-[#16a34a] to-[#22c55e]' : 'from-[#dc2626] to-[#ef4444]',
                  text: unrealizedPnl >= 0 ? 'text-[#86efac]' : 'text-[#fca5a5]',
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="vp-card relative overflow-hidden p-5">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-[7px] border border-white/8 bg-white/5 text-white/80">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">{card.label}</p>
                    <p className={`mono-value mt-3 text-[2rem] font-black ${card.text}`}>{card.value}</p>
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">{card.helper}</p>
                  </div>
                );
              })}
            </div>

            <section className="vp-card mt-6 p-5">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Resumo Financeiro</h2>
              <div className="mt-4 overflow-hidden rounded-[14px] border border-white/10">
                {[
                  ['Total Apostado', `$${formatUsd(totalStaked)}`],
                  ['Total Ganhado', `$${formatUsd(totalWon)}`],
                  ['P&L Realizado', `${realizedPnl >= 0 ? '+' : ''}$${formatUsd(realizedPnl)}`],
                  ['P&L Não Realizado', `${unrealizedPnl >= 0 ? '+' : ''}$${formatUsd(unrealizedPnl)}`],
                  ['Taxa Total Paga', `$${formatUsd(totalFeePaid)}`],
                ].map(([label, value], index) => (
                  <div key={label} className={`grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-sm ${index > 0 ? 'border-t border-white/8' : ''}`}>
                    <span className="text-[var(--text-secondary)]">
                      {label}
                      {label === 'Taxa Total Paga' ? <span className="ml-2 inline-flex items-center gap-1 text-xs text-[var(--text-muted)]"><Info className="h-3.5 w-3.5" /> taxa acumulada da plataforma</span> : null}
                    </span>
                    <span className={`mono-value font-semibold ${
                      label.includes('P&L')
                        ? value.startsWith('+')
                          ? 'text-[#86efac]'
                          : 'text-[#fca5a5]'
                        : 'text-white'
                    }`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="vp-card mt-6 p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Performance do Portfólio</h2>
                <div className="flex items-center gap-2">
                  {(['7d', '30d', '90d', 'all'] as PerformancePeriod[]).map((period) => (
                    <button
                      key={period}
                      onClick={() => setPerformancePeriod(period)}
                      className={`rounded-[8px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        performancePeriod === period
                          ? 'bg-[rgba(124,58,237,0.3)] text-[var(--text-primary)]'
                          : 'border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {period === 'all' ? 'Tudo' : period}
                    </button>
                  ))}
                </div>
              </div>

              {historyLoading ? (
                <div className="h-[220px] rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4 text-sm text-[var(--text-secondary)]">
                  Carregando histórico do portfólio...
                </div>
              ) : positions.length === 0 || portfolioHistory.length === 0 ? (
                <EmptyState
                  icon={LineChart}
                  title="Seu portfólio ainda não tem histórico"
                  description="Faça sua primeira aposta para começar a ver curva de performance, exposição e valor estimado ao longo do tempo."
                  cta={
                    <button onClick={() => navigate('/dashboard')} className="vp-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
                      <ArrowUpRight className="h-4 w-4" />
                      Explorar Mercados
                    </button>
                  }
                />
              ) : (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={portfolioHistory} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
                      <defs>
                        <linearGradient id="portfolioArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={performancePositive ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.3)'} />
                          <stop offset="95%" stopColor={performancePositive ? 'rgba(16,185,129,0.03)' : 'rgba(239,68,68,0.03)'} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} stroke="rgba(148,163,184,0.2)" />
                      <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} stroke="rgba(148,163,184,0.2)" tickFormatter={(value) => `$${value.toFixed(0)}`} />
                      <Tooltip
                        contentStyle={{
                          background: '#13101F',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          color: '#F8FAFC',
                        }}
                        formatter={(value: number) => [`$${formatUsd(value)}`, 'Portfólio']}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={performancePositive ? '#10B981' : '#EF4444'}
                        fill="url(#portfolioArea)"
                        strokeWidth={2.2}
                        isAnimationActive
                        animationDuration={800}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <div className="mt-7 grid gap-6 lg:grid-cols-[1.8fr_1fr]">
              <div className="space-y-6">
                <section className="vp-card p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Posições Ativas</h2>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-[var(--text-muted)]" />
                      <select
                        value={positionFilter}
                        onChange={(event) => setPositionFilter(event.target.value as PositionFilter)}
                        className="vp-input h-9 min-w-[170px] px-3 text-sm"
                      >
                        <option value="soon">Encerrando em breve</option>
                        <option value="return">Maior retorno</option>
                        <option value="category">Por categoria</option>
                      </select>
                    </div>
                  </div>

                  {activePositions.length === 0 ? (
                    <EmptyState
                      icon={PiggyBank}
                      title="Nenhuma posição ativa"
                      description="Faça uma aposta para começar a acompanhar ganhos, odds e exposição em tempo real."
                      cta={
                        <button onClick={() => navigate('/dashboard')} className="vp-btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold">
                          <ArrowUpRight className="h-4 w-4" />
                          Explorar Mercados
                        </button>
                      }
                    />
                  ) : (
                    <div className="space-y-3">
                      {activePositions.map((position) => (
                        <div key={position.id} className="rounded-[14px] border border-white/8 bg-white/4 p-4">
                          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <CategoryBadge category={position.categoryName} compact />
                                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                  position.rawSide === 'YES'
                                    ? 'border-[rgba(34,197,94,0.28)] bg-[rgba(34,197,94,0.12)] text-[#86efac]'
                                    : 'border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.12)] text-[#fca5a5]'
                                }`}>
                                  {position.side}
                                </span>
                              </div>
                              <p className="mt-3 line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">{position.title}</p>
                              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                                <span className="mono-value text-[var(--text-secondary)]">Apostado: ${formatUsd(position.amount)}</span>
                                <span className="mono-value text-[#fbbf24]">{position.currentOdds.toFixed(2)}x</span>
                                <span className={`mono-value ${position.estimatedProfit >= 0 ? 'text-[#86efac]' : 'text-[#fca5a5]'}`}>
                                  {position.estimatedProfit >= 0 ? '+' : ''}${formatUsd(position.estimatedProfit)}
                                </span>
                              </div>
                              <ProgressBar
                                value={position.rawSide === 'YES' ? (position.yesPool + position.noPool > 0 ? (position.yesPool / (position.yesPool + position.noPool)) * 100 : 50) : (position.yesPool + position.noPool > 0 ? (position.noPool / (position.yesPool + position.noPool)) * 100 : 50)}
                                color={position.rawSide === 'YES' ? 'green' : 'red'}
                                className="mt-4"
                              />
                            </div>

                            <div className="text-left lg:text-right">
                              <p className="mono-value font-bold text-[var(--text-primary)]">${formatUsd(position.estimatedValue)}</p>
                              <p className={`mono-value text-sm ${position.estimatedProfit >= 0 ? 'text-[#86efac]' : 'text-[#fca5a5]'}`}>
                                {position.estimatedProfit >= 0 ? '+' : ''}${formatUsd(position.estimatedProfit)}
                              </p>
                              <p className="mt-1 text-xs text-[var(--text-muted)]">Encerra em {new Date(position.closeTime).toLocaleDateString('pt-BR')}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="vp-card p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Posições Resolvidas</h2>
                    <span className="text-xs text-[var(--text-secondary)]">{resolvedPositions.length} resolvida(s)</span>
                  </div>

                  {resolvedPositions.length === 0 ? (
                    <div className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-6 text-sm text-[var(--text-secondary)]">
                      Nenhuma posição resolvida ainda.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {resolvedPositions.map((position) => {
                        const badgeClass = position.isCancelled
                          ? 'border-[rgba(148,163,184,0.4)] bg-[rgba(148,163,184,0.16)] text-[#cbd5e1]'
                          : position.isWinner
                            ? 'border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.16)] text-[#6ee7b7]'
                            : 'border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.16)] text-[#fca5a5]';

                        const badgeLabel = position.isCancelled ? 'Cancelado' : position.isWinner ? 'Ganhou' : 'Perdeu';

                        return (
                          <div key={position.id} className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">{position.title}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                  <span className={`rounded-[999px] border px-2 py-0.5 font-semibold ${badgeClass}`}>{badgeLabel}</span>
                                  <span className={position.rawSide === 'YES' ? 'text-[#34d399]' : 'text-[#f87171]'}>{position.side}</span>
                                  <span className="mono-value text-[var(--text-secondary)]">Aposta: ${formatUsd(position.amount)}</span>
                                  <span className="mono-value text-[var(--text-secondary)]">Recebido: ${formatUsd(position.receivedValue)}</span>
                                </div>
                              </div>

                              <div className="text-left sm:text-right">
                                <p className={`mono-value text-sm font-semibold ${position.pnl >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                                  {position.pnl >= 0 ? '+' : ''}${formatUsd(position.pnl)}
                                </p>
                                {position.isWinner ? (
                                  position.claimed ? (
                                    <span className="text-xs font-semibold text-[#6ee7b7]">Sacado</span>
                                  ) : (
                                    <button
                                      onClick={() => void handleClaimInline(position)}
                                      disabled={claimingPositionKey === position.id}
                                      className="mt-1 rounded-[8px] border border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.2)] px-2.5 py-1 text-xs font-semibold text-[#6ee7b7] disabled:opacity-60"
                                    >
                                      {claimingPositionKey === position.id ? 'Sacando...' : `Sacar $${formatUsd(position.receivedValue)}`}
                                    </button>
                                  )
                                ) : (
                                  <span className="text-xs text-[var(--text-muted)]">Sem saque</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              <aside className="space-y-5">
                <section className="vp-card p-5">
                  <h3 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">Saldo do Cofre</h3>

                  <p className="mono-value text-3xl font-black text-[var(--text-primary)]">${formatUsd(vaultData.availableBalance)}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">≈ {vaultData.availableBalance.toFixed(0)} USDT disponível</p>

                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <span>Total depositado</span>
                        <span className="mono-value text-white">${formatUsd(vaultData.totalDeposited)}</span>
                      </div>
                      <ProgressBar value={vaultData.totalDeposited > 0 ? 100 : 0} color="purple" />
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <span>Em posições</span>
                        <span className="mono-value text-white">${formatUsd(vaultData.inActivePositions)}</span>
                      </div>
                      <ProgressBar value={vaultData.totalDeposited > 0 ? (vaultData.inActivePositions / vaultData.totalDeposited) * 100 : 0} color="red" />
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <span>Disponível</span>
                        <span className="mono-value text-white">${formatUsd(vaultData.availableBalance)}</span>
                      </div>
                      <ProgressBar value={vaultData.totalDeposited > 0 ? (vaultData.availableBalance / vaultData.totalDeposited) * 100 : 0} color="green" />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                    <div className="flex items-center justify-between">
                      <span>Depositado total</span>
                      <span className="mono-value text-[var(--text-primary)]">${formatUsd(vaultData.totalDeposited)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Em posições ativas</span>
                      <span className="mono-value text-[var(--text-primary)]">${formatUsd(vaultData.inActivePositions)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Disponível</span>
                      <span className="mono-value text-[var(--text-primary)]">${formatUsd(vaultData.availableBalance)}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setIsDepositOpen(true)}
                      className="vp-btn-primary inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold"
                    >
                      <DollarSign className="h-4 w-4" /> Depositar
                    </button>
                    <button
                      onClick={() => setIsWithdrawOpen(true)}
                      className="vp-btn-ghost inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold"
                    >
                      <Landmark className="h-4 w-4" /> Sacar
                    </button>
                  </div>
                </section>

                <section className="vp-card p-5">
                  <h3 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">Atividade Recente</h3>

                  {activityLoading ? (
                    <p className="text-sm text-[var(--text-secondary)]">Carregando atividade...</p>
                  ) : activity.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)]">Nenhuma atividade ainda.</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(groupedActivities).map(([dateLabel, items]) => (
                        <div key={dateLabel}>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">● {dateLabel}</p>
                          <div className="space-y-2">
                            {items.map((item) => {
                              const activityMeta =
                                item.type === 'CLAIM'
                                  ? { label: 'Saque', Icon: Send, positive: true }
                                  : item.type === 'DEPOSIT'
                                    ? { label: 'Depósito', Icon: Wallet, positive: true }
                                    : item.type === 'BET'
                                      ? { label: 'Aposta', Icon: PiggyBank, positive: false }
                                      : item.type === 'WITHDRAWAL'
                                        ? { label: 'Retirada', Icon: Send, positive: false }
                                        : item.type === 'REFUND'
                                          ? { label: 'Reembolso', Icon: Wallet, positive: true }
                                          : { label: 'Perda', Icon: ArrowDownRight, positive: false };
                              const { label: typeLabel, Icon, positive } = activityMeta;

                              const amountColor = positive ? 'text-[#34d399]' : 'text-[#f87171]';
                              const prefix = positive ? '+' : '-';

                              return (
                                <div key={item.id} className="rounded-[12px] border border-white/8 bg-white/4 p-3 text-xs text-[var(--text-secondary)]">
                                  <p>
                                    <span className="mr-2 inline-flex items-center gap-1 text-[var(--text-muted)]">
                                      <Icon className="h-3.5 w-3.5" />
                                      {typeLabel}
                                    </span>
                                    <span className={`mono-value ${amountColor}`}>
                                      {prefix}${formatUsd(Math.abs(item.amount))}
                                    </span>{' '}
                                    {item.market?.id ? (
                                      <button
                                        onClick={() => navigate(`/market/${item.market?.id}`)}
                                        className="text-[var(--text-primary)] hover:underline"
                                      >
                                        {item.market.title}
                                      </button>
                                    ) : (
                                      <span>{item.label || 'Movimentação no cofre'}</span>
                                    )}
                                  </p>
                                  <p className="mono-value mt-2 text-[var(--text-muted)]">
                                    {new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </aside>
            </div>

            <section className="mt-7">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Mercados em Alta para Você</h2>
                <p className="text-sm text-[var(--text-secondary)]">Baseado nos seus interesses em {interestLabel}</p>
              </div>

              {recommendedMarkets.length === 0 ? (
                <div className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4 text-sm text-[var(--text-secondary)]">
                  Sem recomendações por enquanto. Explore os mercados disponíveis.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {recommendedMarkets.map((market) => (
                    <article key={market.id} className="vp-card vp-card-hover p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="rounded-[999px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                          {market.category}
                        </span>
                        <span className="mono-value text-xs text-[var(--text-muted)]">Vol ${formatUsd(market.totalVolume)}</span>
                      </div>
                      <h3 className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">{market.title}</h3>
                      <p className="mono-value mt-2 text-xs text-[var(--text-secondary)]">
                        SIM {market.simProbability.toFixed(0)}% · {market.simOdds.toFixed(2)}x
                      </p>
                      <button
                        onClick={() => navigate(`/market/${market.id}`, { state: { market } })}
                        className="mt-3 rounded-[8px] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[rgba(124,58,237,0.2)]"
                      >
                        Ver mercado
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <Footer />
      <MobileBottomNav />

      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onDeposit={handleDeposit}
        isProcessing={vaultProcessing}
        stepMessage={vaultStepMessage}
      />

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        availableAmount={vaultData.availableBalance}
        onWithdraw={handleWithdraw}
        isProcessing={vaultProcessing}
        stepMessage={vaultStepMessage}
      />
    </div>
  );
};
