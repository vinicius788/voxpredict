import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowRight, BarChart3, Globe2, Scale, TrendingUp, Trophy, Users, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api-client';
import { usePolymarketLeaderboard } from '../hooks/usePolymarket';
import { EmptyState, ProgressBar } from '../components/ui/VoxPrimitives';

type LeaderboardEntry = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  winRate: number;
  totalProfit: number;
  totalVolume: number;
  totalPredictions: number;
  correctPredictions: number;
  rank: number | null;
  rankChange: number;
  streak: number;
  badges: string[];
  position: number;
  winRateFormatted: string;
  profitFormatted: string;
};

type MyLeaderboardData = {
  rank: number | null;
  rankChange: number;
  winRate: number;
  totalProfit: number;
  totalPredictions: number;
  totalUsers: number;
};

const PERIOD_OPTIONS = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'all', label: 'All Time' },
] as const;

const CATEGORY_OPTIONS = [
  { key: 'all', label: 'Todas' },
  { key: 'cripto', label: 'Cripto' },
  { key: 'politica', label: 'Política' },
  { key: 'economia', label: 'Economia' },
  { key: 'esportes', label: 'Esportes' },
  { key: 'tecnologia', label: 'Tecnologia' },
  { key: 'geopolitica', label: 'Geopolítica' },
] as const;

const formatUsd = (value: number, fractionDigits = 0) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

const getInitial = (username: string | null) => (username?.trim()?.[0] || '?').toUpperCase();

export const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]['key']>('all');
  const [category, setCategory] = useState<(typeof CATEGORY_OPTIONS)[number]['key']>('all');
  const { data: globalLeaderboard = [] } = usePolymarketLeaderboard(10);

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', period, category],
    queryFn: () => api.getLeaderboard({ period, category, limit: 50 }),
    staleTime: 15_000,
  });

  const myRankQuery = useQuery({
    queryKey: ['leaderboard-me'],
    enabled: isSignedIn,
    queryFn: async () => {
      const response = await api.getMyLeaderboard();
      return (response.data || response) as MyLeaderboardData;
    },
    staleTime: 15_000,
  });

  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    const payload = leaderboardQuery.data;
    const rows = payload?.leaderboard || payload?.data || [];
    return Array.isArray(rows) ? (rows as LeaderboardEntry[]) : [];
  }, [leaderboardQuery.data]);

  const summary = useMemo(() => {
    const payload = leaderboardQuery.data?.summary;
    if (payload) return payload as { totalPredictors: number; totalVolume: number; averageWinRate: number };

    const totalPredictors = leaderboard.length;
    const totalVolume = leaderboard.reduce((sum, user) => sum + (user.totalVolume || 0), 0);
    const averageWinRate =
      totalPredictors > 0 ? leaderboard.reduce((sum, user) => sum + (user.winRate || 0), 0) / totalPredictors : 0;

    return { totalPredictors, totalVolume, averageWinRate };
  }, [leaderboard, leaderboardQuery.data]);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="app-shell pb-28 lg:pb-0">
      <Header />

      <main className="section-shell py-10">
        <div className="vp-card mb-7 overflow-hidden p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.16),transparent_42%)] pointer-events-none" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Leaderboard</p>
            <h1 className="mt-1 text-3xl font-black text-white md:text-4xl">Melhores Previsores</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Competição pública por consistência, acerto, lucro e disciplina.</p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <article className="vp-card-soft p-5">
                <Users className="h-6 w-6 text-[#fbbf24]" />
                <p className="mt-4 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Previsores</p>
                <p className="mono-value mt-2 text-[2rem] font-black text-white">{summary.totalPredictors}</p>
              </article>
              <article className="vp-card-soft p-5">
                <Wallet className="h-6 w-6 text-[#34d399]" />
                <p className="mt-4 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Volume Total</p>
                <p className="mono-value mt-2 text-[2rem] font-black text-white">${formatUsd(summary.totalVolume)}</p>
              </article>
              <article className="vp-card-soft p-5">
                <BarChart3 className="h-6 w-6 text-[#a78bfa]" />
                <p className="mt-4 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Acerto Médio</p>
                <p className="mono-value mt-2 text-[2rem] font-black text-white">{(summary.averageWinRate * 100).toFixed(1)}%</p>
              </article>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[16px] border border-white/10 bg-white/4 p-4">
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => setPeriod(option.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  period === option.key
                    ? 'bg-[linear-gradient(135deg,rgba(124,58,237,0.28),rgba(139,92,246,0.16))] text-white shadow-[0_0_20px_rgba(124,58,237,0.18)]'
                    : 'border border-white/10 bg-white/4 text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as typeof category)}
            className="vp-input ml-auto h-10 min-w-[200px] px-3 text-sm"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {leaderboardQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`leaderboard-skeleton-${index}`} className="h-16 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : leaderboardQuery.error ? (
          <div className="vp-card p-8 text-center">
            <p className="text-lg font-semibold text-white">Erro ao carregar ranking</p>
            <p className="mt-1 text-sm text-gray-400">{(leaderboardQuery.error as Error).message || 'Tente novamente em instantes.'}</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="O ranking ainda está em formação"
            description="Faça sua primeira aposta para entrar na disputa. Assim que houver previsores suficientes, a tabela passa a refletir desempenho real."
            cta={
              <button onClick={() => navigate('/dashboard')} className="vp-btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold">
                Explorar Mercados
                <ArrowRight className="h-4 w-4" />
              </button>
            }
          />
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {top3.map((user, index) => {
                if (!user) return null;
                const accent = index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : '#d97706';
                const rankLabel = index === 0 ? 'Top 1' : index === 1 ? 'Top 2' : 'Top 3';
                return (
                  <div key={user.id} className={`vp-card ${index === 0 ? 'md:-translate-y-2' : ''} p-5 text-center`}>
                    <div className="mono-value text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: accent }}>
                      {rankLabel}
                    </div>
                    <div
                      className="mx-auto mt-3 flex h-16 w-16 items-center justify-center rounded-full border text-xl font-black text-white"
                      style={{ borderColor: accent, background: `${accent}22` }}
                    >
                      {getInitial(user.username)}
                    </div>
                    <p className="mt-4 text-lg font-bold text-white">{user.username ?? 'Anônimo'}</p>
                    <p className={`mt-1 text-sm font-semibold ${user.totalProfit >= 0 ? 'text-[#86efac]' : 'text-[#fca5a5]'}`}>{user.profitFormatted}</p>
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <span>Acerto</span>
                        <span>{user.winRateFormatted}</span>
                      </div>
                      <ProgressBar value={user.winRate * 100} color={user.winRate >= 0.5 ? 'green' : 'red'} animated />
                    </div>
                    <p className="mt-3 text-xs text-[var(--text-muted)]">{user.totalPredictions} apostas</p>
                  </div>
                );
              })}
            </div>

            <section className="vp-card overflow-hidden p-0">
              <div className="grid grid-cols-[72px_minmax(0,1.4fr)_110px_120px_130px_130px] gap-3 border-b border-white/8 bg-white/4 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                <span>Rank</span>
                <span>Usuário</span>
                <span>Apostas</span>
                <span>Acerto %</span>
                <span>Lucro</span>
                <span>Volume</span>
              </div>

              <div className="divide-y divide-white/8">
                {rest.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-cols-[72px_minmax(0,1.4fr)_110px_120px_130px_130px] items-center gap-3 px-4 py-4 text-sm transition-colors hover:bg-white/4"
                  >
                    <div>
                      <p className="mono-value text-white">#{user.position}</p>
                      {user.rankChange !== 0 ? (
                        <p className={`text-xs ${user.rankChange > 0 ? 'text-[#86efac]' : 'text-[#fca5a5]'}`}>
                          {user.rankChange > 0 ? `↑${user.rankChange}` : `↓${Math.abs(user.rankChange)}`}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(139,92,246,0.28)] bg-[rgba(124,58,237,0.16)] font-bold text-white">
                        {getInitial(user.username)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{user.username ?? 'Anônimo'}</p>
                        <p className="text-xs text-[var(--text-muted)]">Streak {user.streak}</p>
                      </div>
                    </div>
                    <span className="mono-value text-[var(--text-secondary)]">{user.totalPredictions}</span>
                    <div>
                      <p className="mono-value text-white">{user.winRateFormatted}</p>
                      <ProgressBar value={user.winRate * 100} color={user.winRate >= 0.5 ? 'green' : 'red'} className="mt-2" />
                    </div>
                    <span className={`mono-value font-semibold ${user.totalProfit >= 0 ? 'text-[#86efac]' : 'text-[#fca5a5]'}`}>{user.profitFormatted}</span>
                    <span className="mono-value text-[var(--text-secondary)]">${formatUsd(user.totalVolume)}</span>
                  </div>
                ))}
              </div>
            </section>

            {globalLeaderboard.length > 0 ? (
              <section className="vp-card mt-8 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">Top Traders Globais</h2>
                    <p className="text-xs text-gray-500">Polymarket</p>
                  </div>
                  <a href="https://polymarket.com/leaderboard" target="_blank" rel="noreferrer" className="text-xs text-gray-500 transition-colors hover:text-gray-300">
                    Ver ranking global
                  </a>
                </div>

                <div className="space-y-2">
                  {globalLeaderboard.map((trader, index) => (
                    <div key={trader.proxyWalletAddress} className="flex items-center justify-between rounded-xl border border-white/5 bg-[#0f0f1a] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-sm text-gray-500">#{index + 1}</span>
                        <span className="font-mono text-sm text-white">
                          {trader.proxyWalletAddress.slice(0, 6)}...{trader.proxyWalletAddress.slice(-4)}
                        </span>
                      </div>

                      <div className="text-right">
                        <p className={`text-sm font-bold ${trader.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>${formatUsd(trader.pnl, 0)}</p>
                        <p className="text-xs text-gray-500">{(trader.percentPositive * 100).toFixed(0)}% acerto</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>

      {isSignedIn && myRankQuery.data ? (
        <div className="fixed bottom-20 left-0 right-0 z-40 p-4 md:bottom-4">
          <div className="mx-auto flex max-w-4xl items-center justify-between rounded-[16px] border border-[rgba(124,58,237,0.32)] bg-[rgba(47,27,87,0.82)] px-4 py-3 backdrop-blur-sm">
            <div>
              <p className="text-xs text-purple-300">Sua posição</p>
              <p className="text-lg font-black text-white">#{myRankQuery.data.rank ?? '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Win rate</p>
              <p className="font-medium text-white">{((myRankQuery.data.winRate || 0) * 100).toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Lucro</p>
              <p className={`font-medium ${(myRankQuery.data.totalProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(myRankQuery.data.totalProfit || 0) >= 0 ? '+' : ''}${formatUsd(myRankQuery.data.totalProfit || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Universo</p>
              <p className="font-medium text-white">{myRankQuery.data.totalUsers || 0}</p>
            </div>
          </div>
        </div>
      ) : null}

      <Footer />
      <MobileBottomNav />
    </div>
  );
};
