import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Crown,
  DollarSign,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'react-hot-toast';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useTreasuryContract } from '../hooks/useTreasuryContract';
import { AdminCreateMarket } from '../components/AdminCreateMarket';
import { AdminMarketManager } from '../components/AdminMarketManager';
import { AdminCategoryManager } from '../components/AdminCategoryManager';
import { AdminFinancialOverview } from '../components/AdminFinancialOverview';
import { AdminAIMarketGenerator } from '../components/AdminAIMarketGenerator';
import { AdminMarketResolver } from '../components/AdminMarketResolver';
import { AdminProposalsManager } from '../components/AdminProposalsManager';
import { AdminTemplateManager } from '../components/AdminTemplateManager';
import { StatCardSkeleton } from '../components/ui/Skeleton';
import { useAdminStats } from '../hooks/useAdminData';
import { api } from '../lib/api-client';

type AdminTab = 'overview' | 'create' | 'manage' | 'finance' | 'categories' | 'proposals' | 'ai' | 'templates' | 'treasury' | 'resolve';
type OverviewPeriod = '7d' | '30d' | '90d';
const validTabs: AdminTab[] = ['overview', 'create', 'manage', 'finance', 'categories', 'proposals', 'ai', 'templates', 'treasury', 'resolve'];

const maskEmail = (email: string) => {
  if (!email.includes('@')) return email;
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}****@${domain}`;
};

const normalizeTab = (tab?: string | null): AdminTab | null => {
  if (!tab) return null;
  const cleaned = tab.trim().toLowerCase() as AdminTab;
  return validTabs.includes(cleaned) ? cleaned : null;
};

const resolveTabFromUrl = (hash: string, search: string, pathTab?: string): AdminTab => {
  const fromHash = normalizeTab(hash.replace('#', ''));
  if (fromHash) return fromHash;

  const fromQuery = normalizeTab(new URLSearchParams(search).get('tab'));
  if (fromQuery) return fromQuery;

  const fromPath = normalizeTab(pathTab);
  if (fromPath) return fromPath;

  return 'overview';
};

const MiniSparkline: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  const width = 100;
  const height = 30;
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

const createSeries = (base: number, points: number, seed: number, volatility = 6) => {
  return Array.from({ length: points }).map((_, index) => {
    const wave = Math.sin((index + seed) * 0.32) * volatility + Math.cos((index + seed) * 0.17) * (volatility * 0.45);
    return Math.max(0, base + wave + index * 0.35);
  });
};

export const AdminDashboard: React.FC<{
}> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tab: tabFromPath } = useParams<{ tab?: string }>();
  const { isAdmin, adminEmail } = useAdminAccess();
  const { data: adminStats, refetch: refetchAdminStats, isFetching: adminStatsFetching } = useAdminStats(isAdmin);
  const { treasuryData, isLoading: treasuryLoading, withdrawToSafe, refreshTreasuryData } = useTreasuryContract();

  const [activeTab, setActiveTab] = useState<AdminTab>(() =>
    resolveTabFromUrl(window.location.hash, window.location.search, window.location.pathname.split('/')[2]),
  );

  useEffect(() => {
    const nextTab = resolveTabFromUrl(location.hash, location.search, tabFromPath);
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, location.hash, location.search, tabFromPath]);

  const setAdminTab = (tab: AdminTab) => {
    setActiveTab(tab);
    navigate({
      pathname: '/admin',
      search: `?tab=${tab}`,
      hash: `#${tab}`,
    });
  };

  const [lastAccess] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [overviewPeriod, setOverviewPeriod] = useState<OverviewPeriod>('30d');
  const [pendingProposals, setPendingProposals] = useState(0);
  const stats = adminStats || {};

  useEffect(() => {
    const loadPendingProposals = async () => {
      if (!isAdmin) return;
      try {
        const response = await api.getProposals('PENDING');
        const items = (response?.data || response || []) as Array<{ id: number }>;
        setPendingProposals(items.length);
      } catch {
        setPendingProposals(0);
      }
    };

    void loadPendingProposals();
  }, [isAdmin]);

  const refreshAllData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchAdminStats(), refreshTreasuryData()]);
      toast.success('Dados administrativos atualizados.');
    } catch (error) {
      console.error(error);
      toast.error('Falha ao atualizar dados administrativos.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleWithdraw = async () => {
    if (treasuryData.platformBalance <= 0) {
      toast.error('Nenhum saldo disponível para saque.');
      return;
    }

    setIsWithdrawing(true);
    try {
      await withdrawToSafe();
      await refreshTreasuryData();
    } finally {
      setIsWithdrawing(false);
    }
  };

  const totalMarkets = Number(stats.totalMarkets || 0);
  const activeMarkets = Number(stats.activeMarkets || 0);
  const resolvedMarkets = Math.max(0, totalMarkets - activeMarkets);
  const resolutionRate = totalMarkets ? (resolvedMarkets / totalMarkets) * 100 : 0;

  const points = overviewPeriod === '7d' ? 7 : overviewPeriod === '30d' ? 30 : 90;

  const performanceData = useMemo(() => {
    const volumeSeries = createSeries((stats.totalVolume || 120000) / 120, points, 12, 1400);
    const revenueSeries = createSeries((stats.totalRevenue || 3200) / 26, points, 4, 80);
    const usersSeries = createSeries(26, points, 7, 6);

    return Array.from({ length: points }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (points - 1 - index));

      return {
        label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        volume: Number(volumeSeries[index].toFixed(0)),
        revenue: Number(revenueSeries[index].toFixed(0)),
        newUsers: Number(usersSeries[index].toFixed(0)),
      };
    });
  }, [overviewPeriod, points, stats.totalRevenue, stats.totalVolume]);

  const overviewCards = useMemo(() => {
    const totalUsers = Number(stats.totalUsers || 0);
    const pendingBets = Number(stats.pendingBets || 0);
    const revenueTotal = Number(stats.totalRevenue || 0);
    const revenueToday = Number(stats.dailyRevenue || 0);
    const volume24h = Number(stats.volume24h || 0);
    const newUsersToday = Number(stats.newUsersToday || 0);
    const userGrowth = Number(stats.userGrowthPercent || 0);
    const usersTarget = Math.max(1, 40);
    const usersProgress = Math.min(100, (newUsersToday / usersTarget) * 100);

    return [
      {
        title: 'Active Markets',
        value: activeMarkets,
        note: activeMarkets === 0 ? 'Atenção: nenhum mercado ativo' : 'Mercados operando normalmente',
        trend: createSeries(activeMarkets || 1, 12, 2, 0.8),
        color: activeMarkets === 0 ? '#F59E0B' : '#60A5FA',
      },
      {
        title: 'Total Users',
        value: totalUsers.toLocaleString('pt-BR'),
        note: `${userGrowth >= 0 ? '+' : ''}${userGrowth.toFixed(1)}% últimos 7 dias`,
        trend: createSeries(Math.max(totalUsers / 18, 1), 12, 1, 18),
        color: '#34D399',
      },
      {
        title: 'Platform Revenue',
        value: `$${revenueTotal.toFixed(2)}`,
        note: `Hoje: $${revenueToday.toFixed(2)}`,
        trend: createSeries(Math.max(revenueTotal / 30, 1), 12, 6, 22),
        color: '#FBBF24',
      },
      {
        title: 'Mercados Resolvidos',
        value: `${Number(stats.resolvedMarkets || resolvedMarkets)}/${Math.max(totalMarkets, 1)}`,
        note: `${resolutionRate.toFixed(1)}% de resolução`,
        trend: createSeries(resolvedMarkets || 1, 12, 8, 0.9),
        color: '#A78BFA',
        progress: resolutionRate,
      },
      {
        title: 'Volume 24h',
        value: `$${volume24h.toFixed(2)}`,
        note: 'volume capturado nas últimas 24h',
        trend: createSeries(Math.max(volume24h / 28, 1), 12, 10, 130),
        color: '#38BDF8',
      },
      {
        title: 'Novos usuários hoje',
        value: `${newUsersToday}`,
        note: `Meta ${usersTarget} · ${usersProgress.toFixed(0)}% atingido`,
        trend: createSeries(Math.max(newUsersToday, 1), 12, 11, 2.2),
        color: '#4ADE80',
        progress: usersProgress,
      },
      {
        title: 'Apostas pendentes',
        value: `${pendingBets}`,
        note: 'Aguardando resolução',
        trend: createSeries(pendingBets, 12, 14, 1.8),
        color: '#F87171',
        action: pendingBets > 0 ? 'Resolver agora' : '',
      },
    ];
  }, [activeMarkets, resolutionRate, resolvedMarkets, stats.dailyRevenue, stats.pendingBets, stats.resolvedMarkets, stats.totalRevenue, stats.totalUsers, stats.userGrowthPercent, stats.volume24h, stats.newUsersToday, totalMarkets]);

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }> = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'create', label: 'Criar Mercado', icon: Plus },
    { id: 'manage', label: 'Gerenciar Mercados', icon: SlidersHorizontal },
    { id: 'finance', label: 'Financeiro', icon: DollarSign },
    { id: 'categories', label: 'Categorias', icon: ShieldCheck },
    { id: 'proposals', label: 'Propostas', icon: CheckCircle2, badge: pendingProposals > 0 ? String(pendingProposals) : undefined },
    { id: 'ai', label: 'Gerador IA', icon: Zap },
    { id: 'templates', label: 'Templates', icon: Plus },
    { id: 'treasury', label: 'Tesouro', icon: Wallet },
    { id: 'resolve', label: 'Resolver', icon: CheckCircle2 },
  ];

  if (!isAdmin) {
    return (
      <div className="app-shell">
        <Header />

        <main className="section-shell flex min-h-[70vh] items-center justify-center py-12">
          <div className="vp-card max-w-md p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-[#f87171]" />
            <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">Acesso restrito</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Esta área é exclusiva do proprietário verificado e não pode ser acessada por URL direta.
            </p>
            <button
              onClick={() => navigate('/')}
              className="vp-btn-primary mt-6 px-6 py-2.5 text-sm font-semibold"
            >
              Voltar para o início
            </button>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header />

      <main className="section-shell py-8">
        <section className="relative overflow-hidden rounded-[12px] border border-t-[3px] border-[rgba(245,158,11,0.38)] border-t-[#f59e0b] bg-[#0a0a0f] p-6">
          <div className="pointer-events-none absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle, rgba(245,158,11,0.42) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="pointer-events-none absolute right-4 top-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(245,158,11,0.2)]">
            Restricted Access
          </div>

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-[999px] border border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#fcd34d]">
                <Crown className="h-3.5 w-3.5" /> ADMIN OWNER
              </div>
              <h1 className="mt-3 text-3xl font-bold text-[var(--text-primary)]">VoxPredict Admin</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Owner: {maskEmail(adminEmail || 'vm3441896@gmail.com')} · Último acesso: {lastAccess.toLocaleString('pt-BR')} · IP: 127.***.***.1
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={refreshAllData}
                className="rounded-[8px] border border-[rgba(245,158,11,0.35)] px-3 py-2 text-sm font-semibold text-[#fcd34d] transition-colors hover:bg-[rgba(245,158,11,0.12)]"
              >
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 ${isRefreshing || adminStatsFetching ? 'animate-spin' : ''}`} />
                  Atualizar
                </span>
              </button>
              <button
                onClick={() => navigate('/')}
                className="rounded-[8px] border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Encerrar Sessão Segura
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-4 rounded-[10px] border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.1)] p-3 text-sm text-[#fef3c7]">
             Verified Administrator Access · Sessão autenticada para controle completo de mercados e tesouraria.
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-2 rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setAdminTab(tab.id);
                }}
                className={`inline-flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-[rgba(245,158,11,0.2)] text-[#fcd34d]'
                    : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="h-4 w-4" /> {tab.label}
                {tab.badge && (
                  <span className="rounded-[999px] border border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.18)] px-1.5 py-0.5 text-[10px] font-bold text-[#fcd34d]">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' && (
          <section className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {adminStatsFetching && !adminStats
                ? Array.from({ length: 7 }).map((_, index) => <StatCardSkeleton key={`admin-stat-skeleton-${index}`} />)
                : overviewCards.map((card) => (
                    <div key={card.title} className="vp-card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">{card.title}</p>
                          <p className="mono-value mt-2 text-2xl font-bold text-[var(--text-primary)]">{card.value}</p>
                          <p className={`mt-1 text-xs ${card.title === 'Active Markets' && activeMarkets === 0 ? 'text-[#fbbf24] animate-pulse' : 'text-[var(--text-secondary)]'}`}>
                            {card.note}
                          </p>
                        </div>
                        <MiniSparkline values={card.trend} color={card.color} />
                      </div>

                      {typeof card.progress === 'number' && (
                        <div className="mt-3">
                          <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                            <div className="h-full bg-[rgba(245,158,11,0.75)]" style={{ width: `${card.progress}%` }} />
                          </div>
                        </div>
                      )}

                      {card.action && (
                        <button
                          onClick={() => {
                            setAdminTab('resolve');
                          }}
                          className="mt-3 rounded-[8px] border border-[rgba(239,68,68,0.45)] px-2.5 py-1 text-xs font-semibold text-[#fca5a5] transition-colors hover:bg-[rgba(239,68,68,0.15)]"
                        >
                          {card.action}
                        </button>
                      )}
                    </div>
                  ))}
            </div>

            <div className="vp-card p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Performance da Plataforma</h2>
                <div className="flex items-center gap-2">
                  {(['7d', '30d', '90d'] as OverviewPeriod[]).map((period) => (
                    <button
                      key={period}
                      onClick={() => setOverviewPeriod(period)}
                      className={`rounded-[8px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        overviewPeriod === period
                          ? 'bg-[rgba(245,158,11,0.2)] text-[#fcd34d]'
                          : 'border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={performanceData} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgba(59,130,246,0.35)" />
                        <stop offset="95%" stopColor="rgba(59,130,246,0.04)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} stroke="rgba(148,163,184,0.2)" />
                    <YAxis yAxisId="left" tick={{ fill: '#94A3B8', fontSize: 11 }} stroke="rgba(148,163,184,0.2)" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94A3B8', fontSize: 11 }} stroke="rgba(148,163,184,0.2)" />
                    <Tooltip
                      contentStyle={{
                        background: '#13101F',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        color: '#F8FAFC',
                      }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="volume" stroke="#3B82F6" fill="url(#volumeFill)" strokeWidth={2} />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2.2} dot={false} />
                    <Bar yAxisId="right" dataKey="newUsers" fill="rgba(148,163,184,0.55)" radius={[3, 3, 0, 0]} barSize={10} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'create' && <AdminCreateMarket adminEmail={adminEmail} />}
        {activeTab === 'manage' && <AdminMarketManager />}
        {activeTab === 'finance' && <AdminFinancialOverview />}
        {activeTab === 'categories' && <AdminCategoryManager />}
        {activeTab === 'proposals' && <AdminProposalsManager onPendingCountChange={setPendingProposals} />}
        {activeTab === 'ai' && <AdminAIMarketGenerator />}
        {activeTab === 'templates' && <AdminTemplateManager />}

        {activeTab === 'treasury' && (
          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="vp-card p-6">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Tesouro da Plataforma</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Acesso owner-only para operações financeiras críticas.</p>

              <p className="mono-value mt-5 text-4xl font-bold text-[var(--text-primary)]">${treasuryData.platformBalance.toFixed(2)}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Saldo acumulado no contrato</p>

              <button
                onClick={handleWithdraw}
                disabled={treasuryLoading || isWithdrawing || treasuryData.platformBalance <= 0}
                className="mt-5 w-full rounded-[8px] border border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.18)] px-4 py-2.5 text-sm font-semibold text-[#fcd34d] transition-colors hover:bg-[rgba(245,158,11,0.26)] disabled:opacity-50"
              >
                {isWithdrawing ? 'Transferindo para a Safe...' : 'Sacar para Safe'}
              </button>
            </div>

            <div className="vp-card p-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Resumo financeiro</h3>
              <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
                <div className="flex items-center justify-between"><span>Total coletado</span><span className="mono-value text-[var(--text-primary)]">${treasuryData.totalCollected.toFixed(2)}</span></div>
                <div className="flex items-center justify-between"><span>Total sacado</span><span className="mono-value text-[var(--text-primary)]">${treasuryData.totalWithdrawn.toFixed(2)}</span></div>
                <div className="flex items-center justify-between"><span>Receita mensal</span><span className="mono-value text-[var(--text-primary)]">${treasuryData.monthlyRevenue.toFixed(2)}</span></div>
                <div className="flex items-center justify-between"><span>Mercados ativos</span><span className="mono-value text-[var(--text-primary)]">{treasuryData.activeMarkets}</span></div>
              </div>

              <div className="mt-5 rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3 text-xs text-[var(--text-secondary)]">
                IP da sessão: 127.***.***.1 · Operações auditadas internamente.
              </div>
            </div>
          </section>
        )}

        {activeTab === 'resolve' && <AdminMarketResolver />}
      </main>

      <Footer />
    </div>
  );
};
