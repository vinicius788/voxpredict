import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  DollarSign,
  Filter,
  Landmark,
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
import { useAuth } from '../contexts/AuthContext';
import { useVaultContract } from '../hooks/useVaultContract';
import { useWalletBalance } from '../hooks/useWalletBalance';
import { useNotifications } from '../hooks/useNotifications';
import { useMarkets } from '../hooks/useMarkets';
import { useMyPositions, useUserStats } from '../hooks/useUserDashboard';

type PositionRow = {
  marketId: string;
  title: string;
  category: string;
  side: 'SIM' | 'NÃO';
  amount: number;
  probability: number;
  odds: number;
  endDate: string;
};

type PerformancePeriod = '7d' | '30d' | '90d' | 'all';

type ActivityType = 'win' | 'loss' | 'bet' | 'cash';

type ActivityItem = {
  id: string;
  type: ActivityType;
  marketId?: string;
  marketTitle?: string;
  amount: number;
  timestamp: Date;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const MiniSparkline: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  const width = 100;
  const height = 32;
  const max = Math.max(...values);
  const min = Math.min(...values);

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / (max - min || 1)) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
};

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

  const iso = date.toDateString();
  if (iso === today.toDateString()) return 'Hoje';
  if (iso === yesterday.toDateString()) return 'Ontem';
  return date.toLocaleDateString('pt-BR');
};

const getTrendSeries = (base: number, seed: number, points = 9, volatility = 4) => {
  return Array.from({ length: points }).map((_, index) => {
    const wave = Math.sin((seed + index) * 0.65) * volatility + Math.cos((seed + index) * 0.23) * (volatility * 0.35);
    return clamp(base + wave, 5, 95);
  });
};

const CompassEmptyState: React.FC = () => (
  <svg viewBox="0 0 240 160" className="mx-auto h-32 w-48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="238" height="158" rx="20" stroke="rgba(255,255,255,0.08)" />
    <circle cx="120" cy="80" r="42" stroke="rgba(124,58,237,0.45)" strokeWidth="2" />
    <circle cx="120" cy="80" r="22" stroke="rgba(167,139,250,0.45)" strokeWidth="2" />
    <path d="M120 44L130 80L120 116L110 80L120 44Z" fill="rgba(124,58,237,0.45)" />
    <circle cx="120" cy="80" r="4" fill="#A78BFA" />
  </svg>
);

export const UserDashboard: React.FC<{
}> = () => {
  const navigate = useNavigate();
  const { isSignedIn, user } = useAuth();
  const { vaultData } = useVaultContract();
  const { balance } = useWalletBalance();
  const hasAccess = Boolean(isSignedIn && user);
  const { unreadCount } = useNotifications(hasAccess);

  const [positionFilter, setPositionFilter] = useState<'soon' | 'return' | 'category'>('soon');
  const [performancePeriod, setPerformancePeriod] = useState<PerformancePeriod>('30d');
  const [visibleTimelineCount, setVisibleTimelineCount] = useState(10);

  const { data: marketResponse } = useMarkets({ limit: 50 });
  const { data: userStats } = useUserStats(hasAccess);
  const { data: myPositions = [] } = useMyPositions(hasAccess);
  const markets = marketResponse?.markets || [];

  const marketById = useMemo(() => {
    return new Map(markets.map((market) => [Number(market.id), market]));
  }, [markets]);

  const positions = useMemo<PositionRow[]>(() => {
    return myPositions.map((position) => {
      const market = marketById.get(position.marketId);
      const isYes = position.side === 'YES';
      return {
        marketId: String(position.marketId),
        title: market?.title || position.market.question,
        category: market?.category || position.market.category,
        side: isYes ? 'SIM' : 'NÃO',
        amount: Number(position.amount),
        probability: isYes ? market?.simProbability || 50 : market?.naoProbability || 50,
        odds: isYes ? market?.simOdds || 2 : market?.naoOdds || 2,
        endDate: market?.endDate || position.market.endTime,
      };
    });
  }, [marketById, myPositions]);

  const now = Date.now();

  const activePositions = useMemo(() => {
    const onlyActive = positions.filter((row) => new Date(row.endDate).getTime() > now);
    const sorted = [...onlyActive];

    if (positionFilter === 'soon') {
      sorted.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    }

    if (positionFilter === 'return') {
      sorted.sort((a, b) => b.amount * b.odds - a.amount * a.odds);
    }

    if (positionFilter === 'category') {
      sorted.sort((a, b) => a.category.localeCompare(b.category));
    }

    return sorted;
  }, [positions, positionFilter, now]);

  const closedPositions = positions.filter((row) => new Date(row.endDate).getTime() <= now).length;

  const openSoonCount = activePositions.filter((row) => {
    const diff = new Date(row.endDate).getTime() - now;
    return diff > 0 && diff <= 48 * 60 * 60 * 1000;
  }).length;

  const subtitle = (() => {
    if (!activePositions.length) return 'Explore os mercados e faça sua primeira previsão';
    if (openSoonCount > 0) return `⚠️ ${openSoonCount} posição${openSoonCount > 1 ? 'ões' : ''} encerram em breve`;
    return `Você tem ${activePositions.length} posições ativas`;
  })();

  const totalInvestedActive = activePositions.reduce((sum, row) => sum + row.amount, 0);
  const totalPotentialReturn = activePositions.reduce((sum, row) => sum + row.amount * row.odds, 0);
  const unrealizedGain = totalPotentialReturn - totalInvestedActive;

  const portfolioValue = userStats?.portfolioValue ?? balance.totalUsd;
  const successRate = Math.round(userStats?.winRate ?? 0);
  const rank = userStats?.ranking ?? Math.max(1, 247 + Math.max(0, 8 - activePositions.length) * 5);
  const monthlyChange = 12.4;

  const periodPoints = performancePeriod === '7d' ? 7 : performancePeriod === '30d' ? 30 : performancePeriod === '90d' ? 90 : 140;

  const portfolioHistory = useMemo(() => {
    const base = Math.max(500, portfolioValue * 0.7);
    const growthTarget = portfolioValue || 1200;

    return Array.from({ length: periodPoints }).map((_, index) => {
      const wave = Math.sin(index * 0.24) * 55 + Math.cos(index * 0.07) * 25;
      const trend = ((growthTarget - base) * index) / (periodPoints - 1 || 1);
      const value = base + trend + wave;
      const hasBet = index % Math.ceil(periodPoints / 7) === 0;

      const date = new Date();
      date.setDate(date.getDate() - (periodPoints - 1 - index));

      return {
        date: date.toISOString(),
        label: periodPoints > 45 ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        value: Number(value.toFixed(2)),
        hasBet,
      };
    });
  }, [periodPoints, portfolioValue]);

  const initialValue = portfolioHistory[0]?.value || 0;
  const finalValue = portfolioHistory[portfolioHistory.length - 1]?.value || 0;
  const performancePositive = finalValue >= initialValue;

  const activityItems = useMemo<ActivityItem[]>(() => {
    const baseItems: ActivityItem[] = [];

    activePositions.slice(0, 8).forEach((position, index) => {
      const date = new Date();
      date.setHours(date.getHours() - (index * 7 + 2));

      baseItems.push({
        id: `bet-${position.marketId}-${position.side}`,
        type: 'bet',
        marketId: position.marketId,
        marketTitle: position.title,
        amount: position.amount,
        timestamp: date,
      });
    });

    baseItems.push({
      id: 'win-1',
      type: 'win',
      marketId: activePositions[0]?.marketId,
      marketTitle: activePositions[0]?.title || 'Bitcoin vai a $150k?',
      amount: 183,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20),
    });

    baseItems.push({
      id: 'loss-1',
      type: 'loss',
      marketId: activePositions[1]?.marketId,
      marketTitle: activePositions[1]?.title || 'Haddad cai em junho?',
      amount: -30,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 34),
    });

    baseItems.push({
      id: 'cash-1',
      type: 'cash',
      amount: 500,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 42),
    });

    return baseItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [activePositions]);

  const visibleActivities = activityItems.slice(0, visibleTimelineCount);

  const groupedActivities = useMemo(() => {
    return visibleActivities.reduce<Record<string, ActivityItem[]>>((groups, item) => {
      const label = getRelativeDateLabel(item.timestamp);
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
      return groups;
    }, {});
  }, [visibleActivities]);

  const categoryPreference = useMemo(() => {
    const counts = new Map<string, number>();
    activePositions.forEach((position) => {
      counts.set(position.category, (counts.get(position.category) || 0) + 1);
    });

    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([category]) => category);
  }, [activePositions]);

  const recommendedMarkets = useMemo(() => {
    const activeIds = new Set(activePositions.map((position) => position.marketId));

    const sorted = [...markets]
      .filter((market) => market.status === 'active' && !activeIds.has(market.id))
      .sort((a, b) => {
        const aScore = (categoryPreference.includes(a.category) ? 1_000_000 : 0) + a.totalVolume;
        const bScore = (categoryPreference.includes(b.category) ? 1_000_000 : 0) + b.totalVolume;
        return bScore - aScore;
      })
      .slice(0, 4);

    return sorted;
  }, [activePositions, categoryPreference, markets]);

  const interestLabel = categoryPreference.slice(0, 2).join(' e ') || 'mercados com maior volume';

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
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
              {getGreetingByHour()}, {user?.firstName || user?.email || 'Usuário'}! 👋
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-[999px] border border-[var(--border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[var(--text-secondary)]">
            <Bell className="h-4 w-4" />
            <span>
              {unreadCount} alerta{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="vp-card p-5">
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Portfólio</p>
            <p className="mono-value mt-2 text-2xl font-bold text-[var(--text-primary)]">${portfolioValue.toFixed(2)}</p>
            <p className="mt-1 text-xs text-[#34d399]">💹 +{monthlyChange.toFixed(1)}% no mês</p>
            <div className="mt-2"><MiniSparkline values={[510, 640, 602, 710, 760, 805, portfolioValue || 830]} color="#10b981" /></div>
          </div>

          <div className="vp-card p-5">
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Posições</p>
            <p className="mono-value mt-2 text-2xl font-bold text-[var(--text-primary)]">{positions.length}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">⬤ {activePositions.length} ativas · ⬤ {closedPositions} fechadas</p>
            <div className="mt-2"><MiniSparkline values={[1, 2, 3, 5, 4, 6, positions.length || 1]} color="#7c3aed" /></div>
          </div>

          <div className="vp-card p-5">
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Ganhos</p>
            <p className={`mono-value mt-2 text-2xl font-bold ${unrealizedGain >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
              {unrealizedGain >= 0 ? '+' : ''}${unrealizedGain.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">↑ vs mês anterior</p>
            <div className="mt-2"><MiniSparkline values={[20, 35, 42, 55, 61, 74, Math.max(10, unrealizedGain + 35)]} color="#f59e0b" /></div>
          </div>

          <div className="vp-card p-5">
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Sucesso</p>
            <p className="mono-value mt-2 text-2xl font-bold text-[var(--text-primary)]">{successRate}%</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
              <div className="h-full bg-gradient-to-r from-[#10b981] to-[#34d399]" style={{ width: `${successRate}%` }} />
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">Rank #{rank}</p>
          </div>
        </div>

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
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Portfólio']}
                />
                <Area type="monotone" dataKey="value" stroke={performancePositive ? '#10B981' : '#EF4444'} fill="url(#portfolioArea)" strokeWidth={2.2} isAnimationActive animationDuration={800} dot={(props: any) => {
                  if (!props.payload.hasBet) return <></>;
                  return <circle cx={props.cx} cy={props.cy} r={2.5} fill="#A78BFA" stroke="none" />;
                }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.8fr_1fr]">
          <section className="vp-card p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Posições Ativas</h2>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[var(--text-muted)]" />
                <select
                  value={positionFilter}
                  onChange={(event) => setPositionFilter(event.target.value as typeof positionFilter)}
                  className="vp-input h-9 min-w-[170px] px-3 text-sm"
                >
                  <option value="soon">Encerrando em breve</option>
                  <option value="return">Maior retorno</option>
                  <option value="category">Por categoria</option>
                </select>
              </div>
            </div>

            {activePositions.length === 0 ? (
              <div className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-10 text-center">
                <CompassEmptyState />
                <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Comece a prever o futuro</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Escolha um evento, faça sua previsão e ganhe se acertar.
                </p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="vp-btn-primary mt-5 inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
                >
                  <ArrowUpRight className="h-4 w-4" /> Explorar Mercados
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[10px] border border-[var(--border)]">
                <table className="w-full min-w-[930px] border-collapse text-sm">
                  <thead className="bg-[rgba(255,255,255,0.04)] text-left text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    <tr>
                      <th className="px-3 py-2.5">Mercado</th>
                      <th className="px-3 py-2.5">Posição</th>
                      <th className="px-3 py-2.5">Apostado</th>
                      <th className="px-3 py-2.5">Prob. Atual</th>
                      <th className="px-3 py-2.5">Retorno Potencial</th>
                      <th className="px-3 py-2.5">Encerra</th>
                      <th className="px-3 py-2.5">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePositions.map((position) => {
                      const seed = position.marketId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      const trend = getTrendSeries(position.probability, seed, 7, 3.1);
                      const trendDelta = trend[trend.length - 1] - trend[0];
                      const trendColor = trendDelta > 0.3 ? '#10B981' : trendDelta < -0.3 ? '#EF4444' : '#94A3B8';
                      const potential = position.amount * position.odds;
                      const pnl = potential - position.amount;

                      return (
                        <tr key={`${position.marketId}-${position.side}`} className="border-t border-[var(--border)] text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.02)]">
                          <td className="px-3 py-3">
                            <button onClick={() => navigate(`/market/${position.marketId}`)} className="line-clamp-1 max-w-[260px] text-left text-[var(--text-primary)] hover:underline">
                              {position.title}
                            </button>
                            <div className="text-xs text-[var(--text-muted)]">{position.category}</div>
                          </td>
                          <td className={`px-3 py-3 font-semibold ${position.side === 'SIM' ? 'text-[#34d399]' : 'text-[#f87171]'}`}>{position.side}</td>
                          <td className="mono-value px-3 py-3 text-[var(--text-primary)]">${position.amount.toFixed(2)}</td>
                          <td className="px-3 py-3">
                            <div className="mono-value text-[var(--text-primary)]">
                              {position.probability.toFixed(1)}% {trendDelta > 0.2 ? '↑' : trendDelta < -0.2 ? '↓' : '→'}
                            </div>
                            <MiniSparkline values={trend} color={trendColor} />
                          </td>
                          <td className={`mono-value px-3 py-3 ${pnl >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                            ${potential.toFixed(2)} ({pnl >= 0 ? '+' : ''}{pnl.toFixed(2)})
                          </td>
                          <td className="mono-value px-3 py-3">{new Date(position.endDate).toLocaleDateString('pt-BR')}</td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => navigate(`/market/${position.marketId}`)}
                              className="rounded-[8px] border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] transition-colors hover:bg-[rgba(124,58,237,0.2)]"
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-xs text-[var(--text-secondary)]">
                      <td className="px-3 py-2.5 font-semibold text-[var(--text-primary)]">Total</td>
                      <td className="px-3 py-2.5" />
                      <td className="mono-value px-3 py-2.5">${totalInvestedActive.toFixed(2)}</td>
                      <td className="px-3 py-2.5" />
                      <td className="mono-value px-3 py-2.5 text-[#fbbf24]">${totalPotentialReturn.toFixed(2)}</td>
                      <td className="px-3 py-2.5" />
                      <td className="px-3 py-2.5" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <section className="vp-card p-5">
              <h3 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">💰 Saldo do Cofre</h3>

              {(() => {
                const available = Math.max(0, vaultData.lockedBalance);
                const inUse = totalInvestedActive;
                const total = Math.max(available + inUse, 1);
                const availablePercentage = (available / total) * 100;

                return (
                  <>
                    <p className="mono-value text-3xl font-bold text-[var(--text-primary)]">${available.toFixed(2)}</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">≈ {available.toFixed(0)} USDT disponível</p>

                    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                      <div className="h-full bg-gradient-to-r from-[#10b981] to-[#34d399]" style={{ width: `${availablePercentage}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{availablePercentage.toFixed(0)}% do total disponível</p>

                    <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                      <div className="flex items-center justify-between"><span>Depositado total</span><span className="mono-value text-[var(--text-primary)]">${vaultData.totalDeposited.toFixed(2)}</span></div>
                      <div className="flex items-center justify-between"><span>Em posições ativas</span><span className="mono-value text-[var(--text-primary)]">${inUse.toFixed(2)}</span></div>
                      <div className="flex items-center justify-between"><span>Disponível</span><span className="mono-value text-[var(--text-primary)]">${available.toFixed(2)}</span></div>
                    </div>
                  </>
                );
              })()}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="vp-btn-primary inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold">
                  <DollarSign className="h-4 w-4" /> Depositar
                </button>
                <button className="vp-btn-ghost inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold">
                  <Landmark className="h-4 w-4" /> Sacar
                </button>
              </div>
            </section>

            <section className="vp-card p-5">
              <h3 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">Atividade Recente</h3>
              <div className="space-y-4">
                {Object.entries(groupedActivities).map(([dateLabel, items]) => (
                  <div key={dateLabel}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">● {dateLabel}</p>
                    <div className="space-y-2">
                      {items.map((item) => {
                        const icon = item.type === 'win' ? '✅' : item.type === 'loss' ? '❌' : item.type === 'bet' ? '📊' : '💰';
                        const amountColor = item.amount >= 0 ? 'text-[#34d399]' : 'text-[#f87171]';

                        return (
                          <div key={item.id} className="text-xs text-[var(--text-secondary)]">
                            <p>
                              <span className="mr-1">{icon}</span>
                              <span className={`mono-value ${amountColor}`}>{item.amount >= 0 ? '+' : ''}${Math.abs(item.amount).toFixed(2)}</span>{' '}
                              {item.marketTitle ? (
                                <button
                                  onClick={() => item.marketId && navigate(`/market/${item.marketId}`)}
                                  className="text-[var(--text-primary)] hover:underline"
                                >
                                  {item.marketTitle}
                                </button>
                              ) : (
                                <span>Movimentação no cofre</span>
                              )}
                            </p>
                            <p className="mono-value text-[var(--text-muted)]">{item.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {visibleTimelineCount < activityItems.length && (
                <button
                  onClick={() => setVisibleTimelineCount((count) => count + 10)}
                  className="mt-4 w-full rounded-[8px] border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Carregar mais
                </button>
              )}
            </section>
          </aside>
        </div>

        <section className="mt-7">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">🔥 Mercados em Alta para Você</h2>
            <p className="text-sm text-[var(--text-secondary)]">Baseado nos seus interesses em {interestLabel}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recommendedMarkets.map((market) => {
              const createdAt = market.createdAt ? new Date(market.createdAt).getTime() : 0;
              const isNew = createdAt > Date.now() - 24 * 60 * 60 * 1000;
              const endingSoon = new Date(market.endDate).getTime() - Date.now() < 48 * 60 * 60 * 1000;

              return (
                <article key={market.id} className="vp-card vp-card-hover p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded-[999px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                      {market.category}
                    </span>
                    <div className="flex gap-1">
                      {isNew && <span className="rounded-[999px] bg-[rgba(59,130,246,0.2)] px-2 py-0.5 text-[10px] text-[#93c5fd]">NOVO</span>}
                      {endingSoon && <span className="rounded-[999px] bg-[rgba(245,158,11,0.2)] px-2 py-0.5 text-[10px] text-[#fcd34d]">⏰ ENCERRANDO</span>}
                    </div>
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">{market.title}</h3>
                  <p className="mono-value mt-2 text-xs text-[var(--text-secondary)]">SIM {market.simProbability.toFixed(0)}% · {market.simOdds.toFixed(2)}x</p>
                  <button
                    onClick={() => navigate(`/market/${market.id}`, { state: { market } })}
                    className="mt-3 rounded-[8px] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[rgba(124,58,237,0.2)]"
                  >
                    Ver mercado
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};
