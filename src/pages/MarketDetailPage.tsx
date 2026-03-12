import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Copy,
  DollarSign,
  ExternalLink,
  Lock,
  Share2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { PredictionInterface } from '../components/PredictionInterface';
import { Market } from '../types';
import { useMarket, useMarketHistory } from '../hooks/useMarkets';

type HistoryPeriod = '24h' | '7d' | '30d' | 'all';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatCountdown = (endDate: string) => {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Encerrado';

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}d ${hours}h ${minutes}m`;
};

const formatCompactCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
};

export const MarketDetailPage: React.FC<{
}> = () => {
  const { marketAddress } = useParams<{ marketAddress: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const configuredChainId = Number(import.meta.env.VITE_CHAIN_ID || 80002);
  const contractAddress = (import.meta.env.VITE_CONTRACT_ADDRESS || '').trim();

  const [showFullDescription, setShowFullDescription] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>('7d');
  const parsedMarketId = Number(marketAddress);
  const hasNumericMarketId = Number.isInteger(parsedMarketId) && parsedMarketId > 0;

  const { data: marketQuery, isLoading } = useMarket(hasNumericMarketId ? parsedMarketId : undefined);
  const { data: historyData } = useMarketHistory(hasNumericMarketId ? parsedMarketId : undefined, historyPeriod);
  const fallbackMarket = (location.state?.market as Market | undefined) || null;
  const market = marketQuery?.market || fallbackMarket;

  useEffect(() => {
    if (!market) return;

    const tick = () => setCountdown(formatCountdown(market.endDate));

    tick();
    const interval = setInterval(tick, 60_000);

    return () => clearInterval(interval);
  }, [market]);

  const isActive = useMemo(
    () => !!market && market.status === 'active' && new Date(market.endDate) > new Date(),
    [market],
  );

  const explorerUrl = useMemo(() => {
    if (!contractAddress) return '#';

    const explorers: Record<number, string> = {
      137: 'https://polygonscan.com',
      80002: 'https://amoy.polygonscan.com',
      8453: 'https://basescan.org',
      11155111: 'https://sepolia.etherscan.io',
    };

    const baseUrl = explorers[configuredChainId] || explorers[80002];
    return `${baseUrl}/address/${contractAddress}`;
  }, [configuredChainId, contractAddress]);

  const probabilityHistory = useMemo(() => {
    if (!historyData?.length) return [];
    return historyData.map((point) => ({
      timestamp: new Date(point.timestamp),
      simProbability: Number(point.yesProb),
      naoProbability: Number(point.noProb),
      volume: Number(point.volume),
    }));
  }, [historyData]);

  const probabilityChartData = useMemo(
    () =>
      probabilityHistory.map((point) => ({
        timestamp: point.timestamp.getTime(),
        simProbability: point.simProbability,
        naoProbability: point.naoProbability,
        volume: point.volume,
      })),
    [probabilityHistory],
  );

  const distributionData = useMemo(() => {
    if (!market) return [];

    const ranges = ['$1-10', '$10-50', '$50-200', '$200-1000', '$1000+'];
    const weights = [0.16, 0.24, 0.28, 0.2, 0.12];
    const seed = market.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return ranges.map((range, index) => {
      const baseVolume = market.totalVolume * weights[index];
      const bias = market.simProbability / 100;
      const oscillation = Math.sin((seed + index) * 0.45) * 0.09;
      const simShare = clamp(bias + oscillation, 0.15, 0.85);
      const simVolume = baseVolume * simShare;
      const naoVolume = baseVolume - simVolume;

      return {
        range,
        simVolume: Number(simVolume.toFixed(2)),
        naoVolume: Number(naoVolume.toFixed(2)),
      };
    });
  }, [market]);

  const formatXAxis = (value: number) => {
    const date = new Date(value);

    if (historyPeriod === '24h') return format(date, 'HH:mm');
    if (historyPeriod === '7d') return format(date, 'dd/MM HH:mm');
    return format(date, 'dd/MM');
  };

  const shareMarket = async () => {
    if (!market) return;

    const url = window.location.href;
    const text = `Confira este mercado da VoxPredict: ${market.title}`;

    if (navigator.share) {
      await navigator.share({ title: market.title, text, url });
      return;
    }

    await navigator.clipboard.writeText(url);
    toast.success('Link do mercado copiado.');
  };

  const copyAddress = async () => {
    if (!contractAddress) return;

    await navigator.clipboard.writeText(contractAddress);
    toast.success('Endereço do contrato copiado.');
  };

  if (!marketAddress) {
    return (
      <div className="app-shell pb-16 lg:pb-0">
        <Header />
        <main className="section-shell py-12">
          <div className="vp-card p-10 text-center">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Mercado não encontrado</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">O endereço informado é inválido.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="vp-btn-primary mt-5 px-5 py-2.5 text-sm font-semibold"
            >
              Voltar para mercados
            </button>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="app-shell pb-16 lg:pb-0">
      <Header />

      <main className="section-shell py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para mercados
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={shareMarket}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <Share2 className="h-4 w-4" /> Compartilhar
            </button>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ExternalLink className="h-4 w-4" /> View on Blockchain
            </a>
          </div>
        </div>

        {isLoading ? (
          <div className="vp-card p-8">
            <div className="h-7 w-1/4 animate-pulse rounded bg-[rgba(255,255,255,0.09)]" />
            <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-[rgba(255,255,255,0.09)]" />
            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="h-24 animate-pulse rounded bg-[rgba(255,255,255,0.09)]" />
              <div className="h-24 animate-pulse rounded bg-[rgba(255,255,255,0.09)]" />
              <div className="h-24 animate-pulse rounded bg-[rgba(255,255,255,0.09)]" />
            </div>
          </div>
        ) : !market ? (
          <div className="vp-card p-10 text-center">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Mercado não encontrado</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Não foi possível carregar os dados do mercado solicitado.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
            <div className="space-y-6">
              <section className="vp-card p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-[999px] border border-[rgba(124,58,237,0.4)] bg-[rgba(124,58,237,0.2)] px-2.5 py-1 text-xs font-semibold text-[#c4b5fd]">
                    {market.category}
                  </span>
                  <span
                    className={`rounded-[999px] border px-2.5 py-1 text-xs font-semibold ${
                      isActive
                        ? 'border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.18)] text-[#6ee7b7]'
                        : 'border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.18)] text-[#fcd34d]'
                    }`}
                  >
                    {isActive ? 'Ativo' : 'Finalizado'}
                  </span>
                </div>

                <h1 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">{market.title}</h1>

                <p className={`mt-4 text-sm leading-relaxed text-[var(--text-secondary)] ${showFullDescription ? '' : 'line-clamp-3'}`}>
                  {market.description}
                </p>
                <button
                  onClick={() => setShowFullDescription((prev) => !prev)}
                  className="mt-2 text-sm font-medium text-[#a78bfa] transition-colors hover:text-[#c4b5fd]"
                >
                  {showFullDescription ? 'Ver menos' : 'Ver mais'}
                </button>

                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
                    <p className="mb-1 inline-flex items-center gap-1 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      <DollarSign className="h-3.5 w-3.5" /> Volume
                    </p>
                    <p className="mono-value text-xl font-bold text-[var(--text-primary)]">
                      ${market.totalVolume.toLocaleString('pt-BR')}
                    </p>
                  </div>

                  <div className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
                    <p className="mb-1 inline-flex items-center gap-1 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      <Users className="h-3.5 w-3.5" /> Participantes
                    </p>
                    <p className="mono-value text-xl font-bold text-[var(--text-primary)]">{market.totalBettors}</p>
                  </div>

                  <div className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
                    <p className="mb-1 inline-flex items-center gap-1 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      <Clock3 className="h-3.5 w-3.5" /> Encerra em
                    </p>
                    <p className="mono-value text-xl font-bold text-[var(--text-primary)]">{countdown}</p>
                  </div>
                </div>
              </section>

              <section className="vp-card p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Histórico de Probabilidades</h2>
                  <div className="flex items-center gap-2">
                    {(['24h', '7d', '30d', 'all'] as HistoryPeriod[]).map((period) => (
                      <button
                        key={period}
                        onClick={() => setHistoryPeriod(period)}
                        className={`rounded-[8px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                          historyPeriod === period
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
                    <AreaChart data={probabilityChartData} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="simFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgba(16,185,129,0.45)" />
                          <stop offset="95%" stopColor="rgba(16,185,129,0.05)" />
                        </linearGradient>
                        <linearGradient id="naoFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgba(239,68,68,0.45)" />
                          <stop offset="95%" stopColor="rgba(239,68,68,0.05)" />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <ReferenceLine y={50} stroke="rgba(148,163,184,0.7)" strokeDasharray="5 5" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatXAxis}
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                        stroke="rgba(148,163,184,0.28)"
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                        stroke="rgba(148,163,184,0.28)"
                      />

                      <Tooltip
                        content={({ active, payload }: any) => {
                          if (!active || !payload?.length) return null;
                          const point = payload[0].payload;

                          return (
                            <div className="rounded-[10px] border border-[var(--border)] bg-[var(--brand-800)] p-3 text-xs text-[var(--text-primary)] shadow-lg">
                              <p className="mb-1 text-[var(--text-secondary)]">{format(new Date(point.timestamp), 'dd/MM/yyyy HH:mm')}</p>
                              <p className="mono-value text-[#34d399]">SIM: {point.simProbability.toFixed(2)}%</p>
                              <p className="mono-value text-[#f87171]">NÃO: {point.naoProbability.toFixed(2)}%</p>
                              <p className="mono-value mt-1 text-[var(--text-secondary)]">Vol: {formatCompactCurrency(point.volume)}</p>
                            </div>
                          );
                        }}
                      />

                      <Area
                        type="monotone"
                        dataKey="simProbability"
                        stroke="#10B981"
                        fill="url(#simFill)"
                        strokeWidth={2.2}
                        isAnimationActive
                        animationDuration={800}
                      />
                      <Area
                        type="monotone"
                        dataKey="naoProbability"
                        stroke="#EF4444"
                        fill="url(#naoFill)"
                        strokeWidth={2.2}
                        isAnimationActive
                        animationDuration={800}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="vp-card p-5">
                <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Distribuição de Apostas por Faixa</h2>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributionData} layout="vertical" margin={{ top: 6, right: 10, left: 18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => formatCompactCurrency(value)}
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                        stroke="rgba(148,163,184,0.28)"
                      />
                      <YAxis
                        type="category"
                        dataKey="range"
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                        stroke="rgba(148,163,184,0.28)"
                        width={66}
                      />
                      <Tooltip
                        content={({ active, payload, label }: any) => {
                          if (!active || !payload?.length) return null;

                          return (
                            <div className="rounded-[10px] border border-[var(--border)] bg-[var(--brand-800)] p-3 text-xs text-[var(--text-primary)] shadow-lg">
                              <p className="mb-1 text-[var(--text-secondary)]">Faixa {label}</p>
                              <p className="mono-value text-[#34d399]">SIM: {formatCompactCurrency(payload[0].value)}</p>
                              <p className="mono-value text-[#f87171]">NÃO: {formatCompactCurrency(payload[1].value)}</p>
                            </div>
                          );
                        }}
                      />
                      <Legend />
                      <Bar dataKey="simVolume" fill="#10B981" radius={[0, 5, 5, 0]} name="SIM" />
                      <Bar dataKey="naoVolume" fill="#EF4444" radius={[0, 5, 5, 0]} name="NÃO" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <PredictionInterface market={market} />
            </div>

            <aside className="space-y-5">
              <section className="vp-card p-5">
                <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Informações do Contrato</h2>

                <div className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3">
                  <p className="mb-1 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Endereço</p>
                  <p className="mono-value break-all text-xs text-[var(--text-primary)]">{contractAddress || 'Não configurado'}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={copyAddress}
                      className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copiar
                    </button>
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Polygonscan
                    </a>
                  </div>
                </div>

                <div className="mt-3 rounded-[10px] border border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.12)] p-3">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
                    <Lock className="h-4 w-4 text-[#a78bfa]" /> Mercado Descentralizado
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Regras e liquidação executadas por contrato inteligente, sem custódia central da plataforma.
                  </p>
                </div>

                <div className="mt-3 rounded-[999px] border border-[rgba(167,139,250,0.45)] bg-[rgba(124,58,237,0.14)] px-3 py-1.5 text-xs text-[var(--text-primary)]">
                  Powered by Polygon
                </div>
              </section>

              <section className="vp-card p-5">
                <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Detalhes do Mercado</h2>
                <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Status</span>
                    <span className="font-medium text-[var(--text-primary)]">{isActive ? 'Ativo' : 'Finalizado'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> Encerramento</span>
                    <span className="mono-value text-[var(--text-primary)]">{new Date(market.endDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> Participantes</span>
                    <span className="mono-value text-[var(--text-primary)]">{market.totalBettors}</span>
                  </div>
                  {market.tags?.length ? (
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {market.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-[999px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-1 text-xs text-[var(--text-secondary)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            </aside>
          </div>
        )}
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};
