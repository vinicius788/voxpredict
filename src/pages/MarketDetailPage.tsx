import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Copy,
  DollarSign,
  ExternalLink,
  Landmark,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { PredictionInterface } from '../components/PredictionInterface';
import { PolymarketReference } from '../components/PolymarketReference';
import { ShareMarketButton } from '../components/ShareMarketButton';
import { Market } from '../types';
import { useMarket, useMarketHistory } from '../hooks/useMarkets';
import { usePolymarketReference } from '../hooks/usePolymarket';
import { CategoryBadge, CountdownTimer, StatusBadge } from '../components/ui/VoxPrimitives';

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
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
};

const upsertMetaTag = (attribute: 'property' | 'name', key: string, value: string) => {
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }

  tag.setAttribute('content', value);
};

export const MarketDetailPage: React.FC = () => {
  const { marketAddress } = useParams<{ marketAddress: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const configuredChainId = Number(import.meta.env.VITE_CHAIN_ID || 80002);
  const fallbackContractAddress = (import.meta.env.VITE_CONTRACT_ADDRESS || '').trim();

  const [showFullDescription, setShowFullDescription] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>('7d');
  const parsedMarketId = Number(marketAddress);
  const hasNumericMarketId = Number.isInteger(parsedMarketId) && parsedMarketId > 0;

  const { data: marketQuery, isLoading } = useMarket(hasNumericMarketId ? parsedMarketId : undefined);
  const { data: historyData } = useMarketHistory(hasNumericMarketId ? parsedMarketId : undefined, historyPeriod);
  const { data: polymarketReference } = usePolymarketReference(hasNumericMarketId ? parsedMarketId : undefined);
  const fallbackMarket = (location.state?.market as Market | undefined) || null;
  const market = marketQuery?.market || fallbackMarket;

  useEffect(() => {
    if (!market) return;

    const tick = () => setCountdown(formatCountdown(market.endDate));
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [market]);

  useEffect(() => {
    if (!market) return;

    const previousTitle = document.title;
    const previousDescription =
      (document.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content || '';
    const previousOgTitle =
      (document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null)?.content || '';
    const previousOgDescription =
      (document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null)?.content || '';
    const previousOgUrl =
      (document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null)?.content || '';
    const previousTwitterTitle =
      (document.querySelector('meta[name="twitter:title"]') as HTMLMetaElement | null)?.content || '';
    const previousTwitterDescription =
      (document.querySelector('meta[name="twitter:description"]') as HTMLMetaElement | null)?.content || '';
    const previousOgImage =
      (document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null)?.content || '';
    const previousTwitterImage =
      (document.querySelector('meta[name="twitter:image"]') as HTMLMetaElement | null)?.content || '';

    const description = market.description.length > 180 ? `${market.description.slice(0, 177)}...` : market.description;
    const pageUrl = window.location.href;
    const title = `${market.title} | VoxPredict`;
    const imageUrl = 'https://voxpredict.vercel.app/og-image.png';

    document.title = title;
    upsertMetaTag('name', 'description', description);
    upsertMetaTag('property', 'og:title', title);
    upsertMetaTag('property', 'og:description', description);
    upsertMetaTag('property', 'og:url', pageUrl);
    upsertMetaTag('property', 'og:image', imageUrl);
    upsertMetaTag('name', 'twitter:title', title);
    upsertMetaTag('name', 'twitter:description', description);
    upsertMetaTag('name', 'twitter:image', imageUrl);

    return () => {
      document.title = previousTitle;
      upsertMetaTag('name', 'description', previousDescription);
      upsertMetaTag('property', 'og:title', previousOgTitle);
      upsertMetaTag('property', 'og:description', previousOgDescription);
      upsertMetaTag('property', 'og:url', previousOgUrl);
      upsertMetaTag('property', 'og:image', previousOgImage);
      upsertMetaTag('name', 'twitter:title', previousTwitterTitle);
      upsertMetaTag('name', 'twitter:description', previousTwitterDescription);
      upsertMetaTag('name', 'twitter:image', previousTwitterImage);
    };
  }, [market]);

  const isActive = useMemo(
    () => !!market && market.status === 'active' && new Date(market.endDate) > new Date(),
    [market],
  );

  const marketContractAddress = (market?.contractAddress || fallbackContractAddress).trim();
  const hasOnChainContract = Boolean(
    market &&
      market.onChainId !== null &&
      market.onChainId !== undefined &&
      /^0x[a-fA-F0-9]{40}$/.test(marketContractAddress) &&
      !/^0x0{40}$/i.test(marketContractAddress),
  );

  const explorerUrl = useMemo(() => {
    if (!hasOnChainContract) return null;

    const explorers: Record<number, string> = {
      137: 'https://polygonscan.com',
      80002: 'https://amoy.polygonscan.com',
      8453: 'https://basescan.org',
      11155111: 'https://sepolia.etherscan.io',
    };

    const baseUrl = explorers[configuredChainId] || explorers[80002];
    return `${baseUrl}/address/${marketContractAddress}`;
  }, [configuredChainId, hasOnChainContract, marketContractAddress]);

  const probabilityHistory = useMemo(() => {
    if (!historyData?.length) return [];
    return historyData.map((point) => ({
      timestamp: new Date(point.timestamp),
      simProbability: Number(point.yesProb),
      naoProbability: Number(point.noProb),
      volume: Number(point.volume),
    }));
  }, [historyData]);

  const probabilityChartData = useMemo(() => {
    const merged = new Map<
      number,
      { timestamp: number; simProbability?: number; naoProbability?: number; volume?: number; globalProbability?: number }
    >();

    probabilityHistory.forEach((point) => {
      const timestamp = point.timestamp.getTime();
      merged.set(timestamp, {
        ...(merged.get(timestamp) || { timestamp }),
        timestamp,
        simProbability: point.simProbability,
        naoProbability: point.naoProbability,
        volume: point.volume,
      });
    });

    (polymarketReference?.history || []).forEach((point) => {
      const timestamp = point.t * 1000;
      merged.set(timestamp, {
        ...(merged.get(timestamp) || { timestamp }),
        timestamp,
        globalProbability: Number((point.p * 100).toFixed(2)),
      });
    });

    return [...merged.values()].sort((a, b) => a.timestamp - b.timestamp);
  }, [polymarketReference?.history, probabilityHistory]);

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
        total: Number(baseVolume.toFixed(2)),
      };
    });
  }, [market]);

  const formatXAxis = (value: number) => {
    const date = new Date(value);
    if (historyPeriod === '24h') return format(date, 'HH:mm');
    if (historyPeriod === '7d') return format(date, 'dd/MM HH:mm');
    return format(date, 'dd/MM');
  };

  const copyAddress = async () => {
    if (!hasOnChainContract) return;
    await navigator.clipboard.writeText(marketContractAddress);
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
            <button onClick={() => navigate('/dashboard')} className="vp-btn-primary mt-5 px-5 py-2.5 text-sm font-semibold">
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

      <main className="section-shell market-detail-page py-8">
        <div className="market-breadcrumb mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para mercados
          </button>

          <div className="flex items-center gap-2">
            {market ? (
              <ShareMarketButton market={market} />
            ) : (
              <button type="button" disabled className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm text-[var(--text-secondary)] opacity-60">
                Compartilhar
              </button>
            )}
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
                Polygonscan
              </a>
            ) : null}
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
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Não foi possível carregar os dados do mercado solicitado.</p>
          </div>
        ) : (
          <div className="market-layout">
            <div className="market-content">
              <section className="market-header-block vp-card overflow-hidden p-6">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={market.category} />
                <StatusBadge status={isActive ? 'ativo' : 'encerrado'} />
                <CountdownTimer endDate={market.endDate} />
              </div>

              <div className="mt-5 max-w-4xl">
                <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-black leading-tight text-[var(--text-primary)]">
                  {market.title}
                </h1>
                <p className={`mt-4 text-[15px] leading-7 text-[var(--text-secondary)] ${showFullDescription ? '' : 'line-clamp-3'}`}>
                  {market.description}
                </p>
                <button
                  onClick={() => setShowFullDescription((prev) => !prev)}
                  className="mt-3 text-sm font-semibold text-[var(--action)] transition-colors hover:text-[var(--text-primary)]"
                >
                  {showFullDescription ? 'Ver menos' : 'Ver mais'}
                </button>
              </div>

              <div className="market-stats-grid mt-6">
                <div className="vp-card-soft p-4">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    <DollarSign className="h-4 w-4 text-[var(--text-secondary)]" />
                    Volume
                  </p>
                  <p className="mono-value mt-3 text-[2rem] font-black text-[var(--text-primary)]">{formatCompactCurrency(market.totalVolume)}</p>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">Mercado com liquidez ativa</p>
                </div>

                <div className="vp-card-soft p-4">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    <Users className="h-4 w-4 text-[var(--text-secondary)]" />
                    Participantes
                  </p>
                  <p className="mono-value mt-3 text-[2rem] font-black text-[var(--text-primary)]">{market.totalBettors}</p>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">Usuários posicionados no mercado</p>
                </div>

                <div className="vp-card-soft p-4">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    <Clock3 className="h-4 w-4 text-[var(--text-secondary)]" />
                    Encerra em
                  </p>
                  <p className="mono-value mt-3 text-[2rem] font-black text-[var(--text-primary)]">{countdown}</p>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">Contagem regressiva dinâmica</p>
                </div>
              </div>
              </section>

              <section className="market-section vp-card p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-[var(--text-primary)]">Histórico de Probabilidades</h2>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">Mercado local em destaque com referência global em linha tracejada.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(['24h', '7d', '30d', 'all'] as HistoryPeriod[]).map((period) => (
                        <button
                          key={period}
                          onClick={() => setHistoryPeriod(period)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                            historyPeriod === period
                              ? 'border border-[var(--border-strong)] bg-[rgba(255,255,255,0.05)] text-[var(--text-primary)]'
                              : 'border border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {period === 'all' ? 'Tudo' : period}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
                    <span className="inline-flex items-center gap-2 text-[#86efac]"><span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" /> SIM</span>
                    <span className="inline-flex items-center gap-2 text-[#fca5a5]"><span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" /> NÃO</span>
                    {polymarketReference?.history?.length ? (
                      <span className="inline-flex items-center gap-2 text-[#cbd5e1]"><span className="h-[2px] w-5 border-t border-dashed border-[#94a3b8]" /> Global Polymarket</span>
                    ) : null}
                  </div>

                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={probabilityChartData} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="simFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="rgba(16,185,129,0.45)" />
                            <stop offset="95%" stopColor="rgba(16,185,129,0.04)" />
                          </linearGradient>
                          <linearGradient id="naoFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="rgba(239,68,68,0.4)" />
                            <stop offset="95%" stopColor="rgba(239,68,68,0.04)" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <ReferenceLine y={50} stroke="rgba(148,163,184,0.7)" strokeDasharray="5 5" />
                        <XAxis dataKey="timestamp" tickFormatter={formatXAxis} tick={{ fill: '#94A3B8', fontSize: 11 }} stroke="rgba(148,163,184,0.28)" />
                        <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: '#94A3B8', fontSize: 11 }} stroke="rgba(148,163,184,0.28)" />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null;
                            const point = payload[0].payload;

                            return (
                              <div className="rounded-[14px] border border-white/10 bg-[rgba(13,11,26,0.95)] p-3 text-xs text-white shadow-xl">
                                <p className="mb-2 text-[var(--text-secondary)]">{format(new Date(point.timestamp), 'dd/MM/yyyy HH:mm')}</p>
                                {typeof point.simProbability === 'number' ? <p className="mono-value text-[#86efac]">SIM: {point.simProbability.toFixed(2)}%</p> : null}
                                {typeof point.naoProbability === 'number' ? <p className="mono-value text-[#fca5a5]">NÃO: {point.naoProbability.toFixed(2)}%</p> : null}
                                {typeof point.globalProbability === 'number' ? <p className="mono-value text-[#cbd5e1]">Global: {point.globalProbability.toFixed(2)}%</p> : null}
                                {typeof point.volume === 'number' ? <p className="mono-value mt-2 text-[var(--text-secondary)]">Vol: {formatCompactCurrency(point.volume)}</p> : null}
                              </div>
                            );
                          }}
                        />
                        <Area type="monotone" dataKey="simProbability" stroke="#10B981" fill="url(#simFill)" strokeWidth={2.3} connectNulls isAnimationActive animationDuration={800} />
                        <Area type="monotone" dataKey="naoProbability" stroke="#EF4444" fill="url(#naoFill)" strokeWidth={2.3} connectNulls isAnimationActive animationDuration={800} />
                        {polymarketReference?.history?.length ? (
                          <Line type="monotone" dataKey="globalProbability" stroke="#94A3B8" strokeDasharray="5 5" strokeWidth={1.6} dot={false} connectNulls />
                        ) : null}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
              </section>

              <section className="market-section vp-card p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-[var(--text-primary)]">Distribuição de Apostas</h2>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">Volume por faixa com total agregado.</p>
                    </div>
                  </div>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distributionData} layout="vertical" margin={{ top: 6, right: 12, left: 18, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis type="number" tickFormatter={(value) => formatCompactCurrency(value)} tick={{ fill: '#94A3B8', fontSize: 11 }} stroke="rgba(148,163,184,0.28)" />
                        <YAxis type="category" dataKey="range" tick={{ fill: '#94A3B8', fontSize: 11 }} stroke="rgba(148,163,184,0.28)" width={70} />
                        <Tooltip
                          content={({ active, payload, label }: any) => {
                            if (!active || !payload?.length) return null;
                            const point = payload[0].payload;

                            return (
                              <div className="rounded-[14px] border border-white/10 bg-[rgba(13,11,26,0.95)] p-3 text-xs text-white shadow-xl">
                                <p className="mb-2 text-[var(--text-secondary)]">Faixa {label}</p>
                                <p className="mono-value text-[#86efac]">SIM: {formatCompactCurrency(point.simVolume)}</p>
                                <p className="mono-value text-[#fca5a5]">NÃO: {formatCompactCurrency(point.naoVolume)}</p>
                                <p className="mono-value mt-2 text-[#cbd5e1]">Total: {formatCompactCurrency(point.total)}</p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="simVolume" fill="#10B981" radius={[0, 6, 6, 0]} />
                        <Bar dataKey="naoVolume" fill="#EF4444" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
              </section>

              <div className="market-info-grid">
                <section className="market-section vp-card p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Informações do Contrato</h2>
                        <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">infraestrutura on-chain</p>
                      </div>
                    </div>

                    <div className="rounded-[14px] border border-white/10 bg-white/4 p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Endereço</p>
                      <p className="mono-value mt-2 break-all text-sm text-white">{hasOnChainContract ? marketContractAddress : 'Mercado de demonstração'}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {hasOnChainContract ? (
                          <button
                            onClick={copyAddress}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-white"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copiar
                          </button>
                        ) : null}
                        {explorerUrl ? (
                          <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-white"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Ver no explorer
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 rounded-[14px] border border-[rgba(124,58,237,0.28)] bg-[rgba(124,58,237,0.12)] p-4">
                      <p className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                        <ShieldCheck className="h-4 w-4 text-[#c4b5fd]" />
                        Mercado descentralizado
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">Regras e liquidação executadas por contrato inteligente, sem custódia central.</p>
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[rgba(168,85,247,0.25)] bg-[rgba(124,58,237,0.12)] px-4 py-2 text-xs font-semibold text-white">
                      <Landmark className="h-4 w-4 text-[#a78bfa]" />
                      Powered by Polygon
                    </div>
                </section>

                <PolymarketReference marketId={market.id} />
              </div>

              {polymarketReference?.comments?.length ? (
                <section className="market-section vp-card p-5">
                    <div className="mb-4">
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">Opinião Global</h2>
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">via Polymarket</p>
                    </div>

                    <div className="divide-y divide-white/8">
                      {polymarketReference.comments.map((comment) => (
                        <article key={comment.id} className="py-3 first:pt-0 last:pb-0">
                          <p className="text-sm leading-7 text-[var(--text-primary)]">{comment.content}</p>
                          <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[var(--text-muted)]">
                            <span>{comment.userName || 'Trader global'}</span>
                            <span className="mono-value">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR })}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                </section>
              ) : null}

              <section className="market-section vp-card p-5">
                <h2 className="mb-4 text-lg font-bold text-[var(--text-primary)]">Detalhes do Mercado</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[14px] border border-white/8 bg-white/4 p-4 text-sm text-[var(--text-secondary)]">
                    <p className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Status</p>
                    <p className="mt-2 font-semibold text-white">{isActive ? 'Ativo' : 'Finalizado'}</p>
                  </div>
                  <div className="rounded-[14px] border border-white/8 bg-white/4 p-4 text-sm text-[var(--text-secondary)]">
                    <p className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Encerramento</p>
                    <p className="mono-value mt-2 font-semibold text-white">{new Date(market.endDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="rounded-[14px] border border-white/8 bg-white/4 p-4 text-sm text-[var(--text-secondary)]">
                    <p className="inline-flex items-center gap-2"><Users className="h-4 w-4" /> Participantes</p>
                    <p className="mono-value mt-2 font-semibold text-white">{market.totalBettors}</p>
                  </div>
                  <div className="rounded-[14px] border border-white/8 bg-white/4 p-4 text-sm text-[var(--text-secondary)]">
                    <p className="inline-flex items-center gap-2"><DollarSign className="h-4 w-4" /> Volume</p>
                    <p className="mono-value mt-2 font-semibold text-white">{formatCompactCurrency(market.totalVolume)}</p>
                  </div>
                </div>

                {market.tags?.length ? (
                  <div className="mt-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {market.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--text-secondary)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            </div>

            <aside className="market-sidebar">
                <PredictionInterface market={market} />
            </aside>
          </div>
        )}
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};
