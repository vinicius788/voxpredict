import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CalendarClock,
  Check,
  ChevronRight,
  DollarSign,
  LineChart,
  Shield,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { MarketCard } from '../components/MarketCard';
import { Market } from '../types';
import { useMarkets } from '../hooks/useMarkets';
import { usePolymarketTrending } from '../hooks/usePolymarket';

const useCountUp = (target: number, duration = 900) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    let start = 0;

    const tick = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
};

export const LandingPage: React.FC<{
}> = () => {
  const navigate = useNavigate();
  const [favoriteMarkets, setFavoriteMarkets] = useState<string[]>([]);
  const { data: marketsResponse } = useMarkets({ limit: 24, sortBy: 'volume' });
  const { data: trendingGlobal = [] } = usePolymarketTrending(6);
  const markets: Market[] = marketsResponse?.markets || [];

  const formatGlobalVolume = (value: number) => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
    return `$${value.toFixed(0)}`;
  };

  const stats = useMemo(() => {
    const activeMarkets = markets.filter((market) => market.status === 'active').length;
    const volume = markets.reduce((total, market) => total + market.totalVolume, 0);
    const users = markets.reduce((total, market) => total + market.totalBettors, 0);

    return {
      activeMarkets,
      volume,
      users,
    };
  }, [markets]);

  const activeCount = useCountUp(stats.activeMarkets);
  const usersCount = useCountUp(stats.users);
  const volumeCount = useCountUp(Math.round(stats.volume));

  const featuredMarkets = useMemo(
    () => [...markets].sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 4),
    [markets],
  );

  const handleToggleFavorite = (marketId: string) => {
    setFavoriteMarkets((prev) =>
      prev.includes(marketId) ? prev.filter((id) => id !== marketId) : [...prev, marketId],
    );
  };

  const handleSelectMarket = (market: Market) => {
    navigate(`/market/${market.id}`, { state: { market } });
  };

  const handleShare = async (market: Market) => {
    const url = `${window.location.origin}/market/${market.id}`;
    const title = `VoxPredict | ${market.title}`;

    if (navigator.share) {
      await navigator.share({ title, text: market.description, url });
      return;
    }

    await navigator.clipboard.writeText(url);
  };

  const handleOpenAuthModal = (mode: 'signin' | 'signup') => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('open-auth-modal', {
      detail: { mode },
    }));
  };

  return (
    <div className="app-shell pb-16 lg:pb-0">
      <Header />

      <section className="relative overflow-hidden border-b border-[var(--border)] pb-14 pt-16 md:pb-20 md:pt-24">
        <div className="absolute inset-0 hero-mesh" />
        <div className="absolute inset-0 hero-grid" />

        <div className="section-shell relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            <div className="vp-badge-pulse inline-flex items-center gap-2 rounded-[999px] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-primary)]">
              <BadgeCheck className="h-4 w-4 text-[var(--accent-glow)]" />
              Plataforma #1 da América Latina
            </div>

            <h1 className="mt-7 text-4xl font-bold leading-tight text-[var(--text-primary)] md:text-6xl">
              Preveja o futuro com
              <span className="shimmer"> transparência on-chain</span>
            </h1>

            <p className="mx-auto mt-5 max-w-3xl text-sm uppercase tracking-[0.1em] text-[var(--text-secondary)] md:text-base">
              Mercados descentralizados em Polygon com USDT, USDC e DAI para política, economia, cripto e esportes.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => handleOpenAuthModal('signin')}
                className="vp-btn-primary inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-semibold"
              >
                <Zap className="h-4 w-4" />
                Entrar
              </button>
              <button
                onClick={() => handleOpenAuthModal('signup')}
                className="vp-btn-ghost inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-semibold"
              >
                Criar Conta
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-gray-500">Deposite com:</span>
              <span className="rounded bg-white/10 px-2 py-1 text-xs text-gray-300">PIX</span>
              <span className="rounded bg-white/10 px-2 py-1 text-xs text-gray-300">Cartão</span>
              <span className="rounded bg-white/10 px-2 py-1 text-xs text-gray-300">USDT</span>
              <span className="rounded bg-white/10 px-2 py-1 text-xs text-gray-300">USDC</span>
            </div>
          </div>

          <div className="mt-11 grid gap-4 md:grid-cols-3">
            <div className="vp-card-soft border-b-[3px] border-b-[var(--accent-primary)] p-5">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(124,58,237,0.2)] text-[var(--accent-glow)]">
                <LineChart className="h-5 w-5" />
              </div>
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-secondary)]">Mercados Ativos</p>
              <p className="mono-value mt-2 text-3xl font-bold text-[var(--text-primary)]">{activeCount}</p>
            </div>

            <div className="vp-card-soft border-b-[3px] border-b-[var(--positive)] p-5">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(16,185,129,0.2)] text-[#6ee7b7]">
                <DollarSign className="h-5 w-5" />
              </div>
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-secondary)]">Volume Total</p>
              <p className="mono-value mt-2 text-3xl font-bold text-[var(--text-primary)]">
                ${(volumeCount / 1000).toFixed(0)}k
              </p>
            </div>

            <div className="vp-card-soft border-b-[3px] border-b-[var(--accent-secondary)] p-5">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(79,70,229,0.24)] text-[#a5b4fc]">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-secondary)]">Usuários em Mercados</p>
              <p className="mono-value mt-2 text-3xl font-bold text-[var(--text-primary)]">{usersCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="section-shell">
          <div className="mb-8 flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.15)]">
              <Shield className="h-5 w-5 text-[#fda4af]" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">Aqui não é casa de apostas</h2>
              <p className="text-sm text-[var(--text-secondary)]">Na VoxPredict, a plataforma não joga contra você.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Conhecimento vence',
                description: 'Mercados estruturados para recompensa de análise, não de aleatoriedade.',
                icon: Sparkles,
              },
              {
                title: 'Usuário vs usuário',
                description: 'A liquidez vem da comunidade, com regras públicas e resolução objetiva.',
                icon: Users,
              },
              {
                title: 'Transparência on-chain',
                description: 'Histórico auditável em Polygon com rastreabilidade de contratos.',
                icon: Shield,
              },
            ].map((item, index) => {
              const Icon = item.icon;
              const order = String(index + 1).padStart(2, '0');

              return (
                <div key={item.title} className="vp-card vp-card-hover relative overflow-hidden p-5">
                  <span className="pointer-events-none absolute right-3 top-1 text-5xl font-bold text-[rgba(255,255,255,0.06)]">
                    {order}
                  </span>
                  <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-[rgba(124,58,237,0.2)] text-[var(--accent-glow)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            <div className="vp-card p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Casa de Apostas vs VoxPredict
              </h3>
              <div className="overflow-hidden rounded-[10px] border border-[var(--border)]">
                <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-[rgba(255,255,255,0.04)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  <span>Critério</span>
                  <span>Casa</span>
                  <span>VoxPredict</span>
                </div>
                {[
                  ['Liquidação transparente', false, true],
                  ['Usuário contra a plataforma', true, false],
                  ['Contratos auditáveis', false, true],
                  ['Taxas explícitas', false, true],
                ].map(([label, bookie, vp]) => (
                  <div key={String(label)} className="grid grid-cols-[1.4fr_1fr_1fr] items-center border-t border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]">
                    <span>{label}</span>
                    <span>{bookie ? <X className="h-4 w-4 text-[var(--negative)]" /> : <Check className="h-4 w-4 text-[var(--positive)]" />}</span>
                    <span>{vp ? <Check className="h-4 w-4 text-[var(--positive)]" /> : <X className="h-4 w-4 text-[var(--negative)]" />}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="vp-card p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Credibilidade</h3>
              <div className="space-y-3">
                {[
                  '"Visual limpo, execução rápida e dados claros. Parece produto financeiro, não app casual."',
                  '"A melhor experiência em PT-BR para mercados preditivos em blockchain na região."',
                  '"As páginas de mercado passam confiança: odds, volume e prazo em destaque."',
                ].map((quote) => (
                  <div key={quote} className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3 text-sm text-[var(--text-secondary)]">
                    {quote}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-4">
        <div className="section-shell">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Mercados em destaque</h2>
              <p className="text-sm text-[var(--text-secondary)]">Seleção por volume e atividade recente.</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="vp-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
            >
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featuredMarkets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                isBrandTheme={true}
                isFavorited={favoriteMarkets.includes(market.id)}
                onSelect={handleSelectMarket}
                onToggleFavorite={handleToggleFavorite}
                onShare={handleShare}
              />
            ))}
          </div>
        </div>
      </section>

      {trendingGlobal.length > 0 ? (
        <section className="py-10">
          <div className="section-shell">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Em Alta Globalmente</h2>
                <p className="text-sm text-[var(--text-secondary)]">Mercados com maior volume no mundo agora.</p>
              </div>
              <a
                href="https://polymarket.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
              >
                via Polymarket
              </a>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {trendingGlobal.map((event) => (
                <a
                  key={event.id}
                  href={event.url}
                  target="_blank"
                  rel="noreferrer"
                  className="vp-card vp-card-hover block p-5"
                >
                  <p className="line-clamp-2 text-base font-semibold text-[var(--text-primary)]">{event.title}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[#34d399]">
                        SIM {Math.round((event.market?.yesProbability || 0.5) * 100)}%
                      </span>
                      <span className="text-[#f87171]">
                        NÃO {Math.round((event.market?.noProbability || 0.5) * 100)}%
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{formatGlobalVolume(event.volumeTotal)}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="py-14">
        <div className="section-shell">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Como funciona</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Mecanismo de resolução e liquidação em quatro passos.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              '1. O mercado é criado com regras públicas e data de encerramento definida.',
              '2. Usuários abrem posições SIM ou NÃO em stablecoins na Polygon.',
              '3. Após o encerramento, o resultado é verificado e resolvido no contrato.',
              '4. Vencedores recebem a liquidação proporcional automaticamente.',
            ].map((item) => (
              <div key={item} className="vp-card p-4 text-sm text-[var(--text-secondary)]">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">FAQ</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {[
                {
                  q: 'A VoxPredict é casa de apostas?',
                  a: 'Não. A plataforma conecta usuários e não assume lado contra o participante.',
                },
                {
                  q: 'Onde vejo o contrato?',
                  a: 'Cada mercado possui link direto para Polygonscan na página de detalhes.',
                },
                {
                  q: 'Quais ativos posso usar?',
                  a: 'USDT, USDC e DAI na rede Polygon.',
                },
              ].map((faq) => (
                <div key={faq.q} className="vp-card p-4">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{faq.q}</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="section-shell">
          <div className="vp-card relative overflow-hidden px-6 py-8 text-center md:px-10 md:py-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.28),transparent_60%)]" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Comece a prever agora</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--text-secondary)] md:text-base">
                Abra sua conta, conecte sua carteira e participe dos mercados mais relevantes da América Latina.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="vp-btn-primary inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-semibold"
                >
                  <CalendarClock className="h-4 w-4" />
                  Explorar mercados
                </button>
                <button
                  onClick={() => navigate('/user-dashboard')}
                  className="vp-btn-ghost inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-semibold"
                >
                  <Bot className="h-4 w-4" />
                  Criar conta
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};
