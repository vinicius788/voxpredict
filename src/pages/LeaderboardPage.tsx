import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Trophy, Users, Wallet } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api-client';

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

const BADGES: Record<string, { icon: string; label: string; desc: string }> = {
  early_adopter: { icon: 'EA', label: 'Early Adopter', desc: 'Entre os primeiros usuários' },
  whale: { icon: 'WH', label: 'Baleia', desc: 'Volume > $10.000' },
  prophet: { icon: 'PR', label: 'Profeta', desc: '70%+ acerto com 10+ previsões' },
  on_fire: { icon: 'ST', label: 'Streak', desc: '5+ acertos seguidos' },
  veteran: { icon: 'VT', label: 'Veterano', desc: '50+ previsões corretas' },
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
  const { isSignedIn } = useAuth();
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]['key']>('all');
  const [category, setCategory] = useState<(typeof CATEGORY_OPTIONS)[number]['key']>('all');

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
        <div className="mb-7 rounded-2xl border border-white/10 bg-[#1e1e30] p-6">
          <p className="text-xs uppercase tracking-[0.12em] text-gray-500">Leaderboard</p>
          <h1 className="mt-1 text-3xl font-bold text-white md:text-4xl">Melhores Previsores</h1>
          <p className="mt-2 text-sm text-gray-400">Competição pública por consistência, lucro e taxa de acerto.</p>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-[#0f0f1a] p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-gray-500">Previsores</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-white">
                <Users className="h-5 w-5 text-amber-400" />
                {summary.totalPredictors}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0f0f1a] p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-gray-500">Volume Total</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-white">
                <Wallet className="h-5 w-5 text-amber-400" />${formatUsd(summary.totalVolume)}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0f0f1a] p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-gray-500">Acerto Médio</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-white">
                <BarChart3 className="h-5 w-5 text-amber-400" />
                {(summary.averageWinRate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#1e1e30] p-4">
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => setPeriod(option.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  period === option.key ? 'bg-amber-500 text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as typeof category)}
            className="ml-auto rounded-lg border border-white/10 bg-[#0f0f1a] px-3 py-2 text-sm text-gray-300 outline-none focus:border-amber-500/40"
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
          <div className="rounded-xl border border-white/10 bg-[#1e1e30] p-8 text-center">
            <p className="text-lg font-semibold text-white">Erro ao carregar ranking</p>
            <p className="mt-1 text-sm text-gray-400">
              {(leaderboardQuery.error as Error).message || 'Tente novamente em instantes.'}
            </p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#1e1e30] p-12 text-center">
            <Trophy className="mx-auto h-8 w-8 text-amber-400" />
            <p className="mt-3 text-gray-400">Ainda não há previsores suficientes para montar o ranking.</p>
          </div>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex flex-col items-center pt-4 md:pt-8">
                <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full border-2 border-gray-400 bg-gray-400/20 text-2xl">
                  {getInitial(top3[1]?.username ?? null)}
                </div>
                <div className="w-full rounded-xl border border-gray-400/30 bg-[#1e1e30] p-3 text-center">
                  <p className="mb-1 text-xs text-gray-400">2º lugar</p>
                  <p className="font-bold text-white">{top3[1]?.username ?? 'Anônimo'}</p>
                  <p className={`${(top3[1]?.totalProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'} text-sm`}>
                    {top3[1]?.profitFormatted ?? '$0'}
                  </p>
                  <p className="text-xs text-gray-400">{top3[1]?.winRateFormatted ?? '0%'} acerto</p>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-500 bg-amber-500/20 text-3xl">
                  {getInitial(top3[0]?.username ?? null)}
                </div>
                <div className="w-full rounded-xl border border-amber-500/30 bg-[#1e1e30] p-3 text-center">
                  <p className="mb-1 text-xs text-amber-400">1º lugar</p>
                  <p className="text-lg font-bold text-white">{top3[0]?.username ?? 'Anônimo'}</p>
                  <p className={`${(top3[0]?.totalProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {top3[0]?.profitFormatted ?? '$0'}
                  </p>
                  <p className="text-xs text-gray-400">{top3[0]?.winRateFormatted ?? '0%'} acerto</p>
                  {(top3[0]?.streak || 0) > 2 && <p className="text-xs text-orange-400">Streak {top3[0]?.streak}</p>}
                </div>
              </div>

              <div className="flex flex-col items-center pt-4 md:pt-12">
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-700 bg-amber-700/20 text-xl">
                  {getInitial(top3[2]?.username ?? null)}
                </div>
                <div className="w-full rounded-xl border border-amber-700/30 bg-[#1e1e30] p-3 text-center">
                  <p className="mb-1 text-xs text-amber-700">3º lugar</p>
                  <p className="font-bold text-white">{top3[2]?.username ?? 'Anônimo'}</p>
                  <p className={`${(top3[2]?.totalProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'} text-sm`}>
                    {top3[2]?.profitFormatted ?? '$0'}
                  </p>
                  <p className="text-xs text-gray-400">{top3[2]?.winRateFormatted ?? '0%'} acerto</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {rest.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 rounded-xl border border-white/5 bg-[#1e1e30] px-4 py-3 transition-colors hover:border-white/10"
                >
                  <div className="w-8 text-center">
                    <span className="font-mono text-sm text-gray-500">#{user.position}</span>
                    {user.rankChange !== 0 && (
                      <div className={`text-xs ${user.rankChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {user.rankChange > 0 ? `↑${user.rankChange}` : `↓${Math.abs(user.rankChange)}`}
                      </div>
                    )}
                  </div>

                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/20 text-sm font-bold text-purple-400">
                    {getInitial(user.username)}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {user.username ?? 'Anônimo'}
                      {user.streak >= 3 && <span className="ml-1 text-orange-400">ST</span>}
                    </p>
                    <div className="mt-0.5 flex gap-2">
                      {user.badges.map((badge) => (
                        <span key={`${user.id}-${badge}`} title={BADGES[badge]?.desc || badge} className="text-xs text-gray-500">
                          {BADGES[badge]?.icon || 'VT'}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-sm font-bold ${user.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {user.profitFormatted}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.winRateFormatted} • {user.totalPredictions} previsões
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {isSignedIn && myRankQuery.data && (
        <div className="fixed bottom-20 left-0 right-0 z-40 p-4 md:bottom-4">
          <div className="mx-auto flex max-w-4xl items-center justify-between rounded-xl border border-purple-500/30 bg-purple-900/50 px-4 py-3 backdrop-blur-sm">
            <div>
              <p className="text-xs text-purple-300">Sua posição</p>
              <p className="text-lg font-bold text-white">#{myRankQuery.data.rank ?? '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Win rate</p>
              <p className="font-medium text-white">{((myRankQuery.data.winRate || 0) * 100).toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Lucro total</p>
              <p className={`font-medium ${(myRankQuery.data.totalProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(myRankQuery.data.totalProfit || 0) >= 0 ? '+' : ''}${formatUsd(myRankQuery.data.totalProfit || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">De</p>
              <p className="font-medium text-white">{myRankQuery.data.totalUsers || 0}</p>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <MobileBottomNav />
    </div>
  );
};
