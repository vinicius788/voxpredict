import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  Globe2,
  Landmark,
  LineChart,
  Quote,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
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
import { LiveIndicator, ProgressBar } from '../components/ui/VoxPrimitives';

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

const formatGlobalVolume = (value: number) => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value.toFixed(0)}`;
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [favoriteMarkets, setFavoriteMarkets] = useState<string[]>([]);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const { data: marketsResponse } = useMarkets({ limit: 24, sortBy: 'volume' });
  const { data: trendingGlobal = [] } = usePolymarketTrending(6);
  const markets: Market[] = marketsResponse?.markets || [];

  const stats = useMemo(() => {
    const activeMarkets = markets.filter((market) => market.status === 'active').length;
    const volume = markets.reduce((total, market) => total + market.totalVolume, 0);
    const users = markets.reduce((total, market) => total + market.totalBettors, 0);

    return { activeMarkets, volume, users };
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
    window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode } }));
  };

  const trustCards = [
    {
      title: 'Conhecimento vence',
      description: 'Mercados estruturados para premiar leitura de cenário, não impulso. Você entra pelo insight e sai com critérios claros.',
      icon: Sparkles,
    },
    {
      title: 'Usuário vs usuário',
      description: 'A liquidez nasce da comunidade. A plataforma organiza o jogo, mas não toma o lado oposto da sua posição.',
      icon: Users,
    },
    {
      title: 'Transparência on-chain',
      description: 'Execução, histórico e liquidação visíveis em Polygon. Nada de caixa-preta, odds escondidas ou resolução arbitrária.',
      icon: Shield,
    },
  ];

  const faqItems = [
    {
      q: 'A VoxPredict é casa de apostas?',
      a: 'Não. A plataforma conecta participantes em mercados binários e não assume posição contrária aos usuários.',
    },
    {
      q: 'Onde vejo o contrato do mercado?',
      a: 'Cada mercado possui link direto para Polygonscan na página de detalhe, com contrato e endereço auditáveis.',
    },
    {
      q: 'Quais ativos posso usar?',
      a: 'USDT, USDC e DAI na Polygon. Em mercados de demonstração o registro fica off-chain para testes.',
    },
  ];

  return (
    <div className="app-shell pb-16 lg:pb-0">
      <Header />

      <section className="relative overflow-hidden border-b border-[var(--border)] py-16 md:min-h-[85vh] md:py-24">
        <div className="absolute inset-0 hero-mesh" />
        <div className="absolute inset-0 hero-grid" />

        <div className="section-shell relative z-10 flex min-h-[70vh] flex-col justify-center">
          <div className="mx-auto max-w-5xl text-center">
            <div className="vp-gradient-ring mx-auto inline-flex rounded-full p-[1px]">
              <div className="vp-badge-pulse inline-flex items-center gap-2 rounded-full bg-[rgba(12,10,22,0.92)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                <BadgeCheck className="h-4 w-4 text-[#a78bfa]" />
                Plataforma #1 da América Latina
              </div>
            </div>

            <h1 className="mt-8 text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[0.95] text-[var(--text-primary)]">
              Preveja o futuro com
              <span className="shimmer"> liquidez, contexto e transparência</span>
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-sm uppercase tracking-[0.16em] text-[rgba(248,250,252,0.7)] md:text-base">
              Mercados preditivos descentralizados em Polygon para política, economia, cripto e esportes com execução em PT-BR e visual de terminal financeiro.
            </p>

            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
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

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {[
                { label: 'PIX', icon: Landmark, tone: 'hover:border-[rgba(34,197,94,0.3)] hover:text-[#86efac]' },
                { label: 'Cartão', icon: CreditCard, tone: 'hover:border-[rgba(59,130,246,0.3)] hover:text-[#93c5fd]' },
                { label: 'USDT', icon: DollarSign, tone: 'hover:border-[rgba(245,158,11,0.3)] hover:text-[#fcd34d]' },
                { label: 'USDC', icon: Wallet, tone: 'hover:border-[rgba(139,92,246,0.3)] hover:text-[#c4b5fd]' },
              ].map((chip) => {
                const Icon = chip.icon;
                return (
                  <span
                    key={chip.label}
                    className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-all ${chip.tone}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {chip.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              {
                label: 'Mercados Ativos',
                value: activeCount,
                suffix: '',
                delta: '+12% esta semana',
                icon: LineChart,
                tone: 'bg-[rgba(59,130,246,0.12)] text-[#93c5fd]',
                glow: 'bg-[#3b82f6]',
                border: 'bg-[linear-gradient(90deg,#2563eb,#60a5fa)]',
              },
              {
                label: 'Volume Total',
                value: Number((volumeCount / 1000).toFixed(0)),
                suffix: 'k',
                delta: '+18% esta semana',
                icon: TrendingUp,
                tone: 'bg-[rgba(16,185,129,0.12)] text-[#6ee7b7]',
                glow: 'bg-[#10b981]',
                border: 'bg-[linear-gradient(90deg,#16a34a,#22c55e)]',
              },
              {
                label: 'Usuários',
                value: usersCount,
                suffix: '',
                delta: '+9% esta semana',
                icon: Users,
                tone: 'bg-[rgba(139,92,246,0.12)] text-[#c4b5fd]',
                glow: 'bg-[#8b5cf6]',
                border: 'bg-[linear-gradient(90deg,#7c3aed,#a78bfa)]',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="vp-card vp-kpi-card p-5">
                  <div className={`vp-kpi-card__glow ${item.glow}`} />
                  <div className={`vp-kpi-card__icon ${item.tone}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <p className="mt-5 text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">{item.label}</p>
                  <p className="mono-value mt-3 text-[2.5rem] font-black text-white">
                    {item.suffix === 'k' ? `$${item.value}${item.suffix}` : item.value}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#86efac]">{item.delta}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="section-shell">
          <div className="mb-8 flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.14)]">
              <Shield className="h-6 w-6 text-[#fca5a5]" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-[var(--text-primary)] md:text-3xl">Aqui não é casa de apostas</h2>
              <p className="text-sm text-[var(--text-secondary)]">A VoxPredict organiza mercado, liquidez e resolução. Não joga contra você.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {trustCards.map((item, index) => {
              const Icon = item.icon;
              const order = String(index + 1).padStart(2, '0');

              return (
                <article key={item.title} className="vp-card vp-card-hover group relative overflow-hidden p-6">
                  <span className="pointer-events-none absolute -right-1 top-0 text-[7rem] font-black leading-none text-white/[0.05]">
                    {order}
                  </span>
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(124,58,237,0.22),rgba(34,197,94,0.14))] text-white shadow-[0_0_24px_rgba(124,58,237,0.15)]">
                    <Icon className="h-7 w-7" />
                  </span>
                  <h3 className="mt-5 text-xl font-bold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.description}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            <div className="vp-card overflow-hidden p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Casa de Apostas vs VoxPredict</h3>
              <div className="overflow-hidden rounded-[14px] border border-white/10">
                <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-[linear-gradient(90deg,rgba(124,58,237,0.16),rgba(124,58,237,0.06),rgba(16,185,129,0.12))] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  <span>Critério</span>
                  <span>Casa</span>
                  <span className="border-l border-[rgba(34,197,94,0.25)] pl-3 text-[#86efac]">VoxPredict</span>
                </div>
                {[
                  ['Liquidação transparente', false, true],
                  ['Usuário contra a plataforma', true, false],
                  ['Contratos auditáveis', false, true],
                  ['Taxas explícitas', false, true],
                ].map(([label, bookie, vp]) => (
                  <div
                    key={String(label)}
                    className="grid grid-cols-[1.4fr_1fr_1fr] items-center border-t border-white/8 px-4 py-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-white/4"
                  >
                    <span>{label}</span>
                    <span>{bookie ? <X className="h-5 w-5 text-[#f87171]" /> : <Check className="h-5 w-5 text-[#22c55e]" />}</span>
                    <span className="border-l border-[rgba(34,197,94,0.25)] pl-3">{vp ? <Check className="h-5 w-5 text-[#22c55e]" /> : <X className="h-5 w-5 text-[#f87171]" />}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="vp-card p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Credibilidade</h3>
              <div className="space-y-3">
                {[
                  'Visual limpo, execução rápida e dados claros. Parece terminal financeiro, não app casual.',
                  'A melhor experiência em PT-BR para mercados preditivos em blockchain na região.',
                  'As páginas de mercado passam confiança: odds, volume e prazo realmente importam.',
                ].map((quote) => (
                  <div key={quote} className="relative rounded-[14px] border border-white/8 bg-white/4 p-4">
                    <Quote className="absolute right-4 top-4 h-8 w-8 text-white/10" />
                    <p className="pr-8 text-sm italic leading-7 text-[var(--text-secondary)]">"{quote}"</p>
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
              <h2 className="text-2xl font-black text-[var(--text-primary)]">Mercados em destaque</h2>
              <p className="text-sm text-[var(--text-secondary)]">Seleção por volume, atividade recente e assimetria de preço.</p>
            </div>
            <button onClick={() => navigate('/dashboard')} className="vp-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
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
        <section className="py-12">
          <div className="section-shell">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-[var(--text-primary)]">Em Alta Globalmente</h2>
                  <LiveIndicator />
                </div>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Dados públicos do Polymarket para contextualizar o sentimento global.</p>
              </div>
              <a href="https://polymarket.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] transition-colors hover:text-white">
                <Globe2 className="h-3.5 w-3.5" />
                via Polymarket
              </a>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {trendingGlobal.map((event) => (
                <a key={event.id} href={event.url} target="_blank" rel="noreferrer" className="vp-card vp-card-hover block p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-base font-semibold text-[var(--text-primary)]">{event.title}</p>
                    <span className="mono-value text-sm font-black text-white">{formatGlobalVolume(event.volumeTotal)}</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#86efac]">SIM {Math.round((event.market?.yesProbability || 0.5) * 100)}%</span>
                        <span className="mono-value text-[#fbbf24]">
                          {((event.market?.yesProbability || 0.5) > 0 ? 1 / (event.market?.yesProbability || 0.5) : 2).toFixed(2)}x
                        </span>
                      </div>
                      <ProgressBar value={(event.market?.yesProbability || 0.5) * 100} color="green" animated />
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#fca5a5]">NÃO {Math.round((event.market?.noProbability || 0.5) * 100)}%</span>
                        <span className="mono-value text-[#fbbf24]">
                          {((event.market?.noProbability || 0.5) > 0 ? 1 / (event.market?.noProbability || 0.5) : 2).toFixed(2)}x
                        </span>
                      </div>
                      <ProgressBar value={(event.market?.noProbability || 0.5) * 100} color="red" animated />
                    </div>
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
            <h2 className="text-2xl font-black text-[var(--text-primary)]">Como funciona</h2>
            <p className="text-sm text-[var(--text-secondary)]">Liquidação clara, quatro passos, nenhum teatro visual desnecessário.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                step: '1',
                title: 'Mercado criado',
                description: 'Cada mercado nasce com pergunta objetiva, critério de resolução e prazo definidos.',
                icon: Sparkles,
              },
              {
                step: '2',
                title: 'Usuários se posicionam',
                description: 'As posições SIM e NÃO formam o preço implícito do mercado em tempo real.',
                icon: Users,
              },
              {
                step: '3',
                title: 'Resultado é resolvido',
                description: 'Após o encerramento, o evento é verificado e o mercado segue para resolução transparente.',
                icon: Shield,
              },
              {
                step: '4',
                title: 'Vencedores recebem',
                description: 'O pool perdedor é redistribuído proporcionalmente, com taxa explícita da plataforma.',
                icon: DollarSign,
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="vp-card relative overflow-hidden p-5">
                  {index < 2 ? <div className="pointer-events-none absolute right-5 top-[calc(50%-1px)] hidden h-[1px] w-20 border-t border-dashed border-white/10 xl:block" /> : null}
                  <div className="flex items-start gap-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(124,58,237,0.3),rgba(34,197,94,0.16))] text-base font-black text-white">
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/5 text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-lg font-bold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{item.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">FAQ</h3>
            <div className="mt-4 space-y-3">
              {faqItems.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div key={faq.q} className="overflow-hidden rounded-[14px] border border-white/8 bg-white/4">
                    <button
                      onClick={() => setOpenFaqIndex((prev) => (prev === index ? null : index))}
                      className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                    >
                      <span className="text-sm font-semibold text-white">{faq.q}</span>
                      <ChevronDown className={`h-4 w-4 text-[var(--text-secondary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen ? (
                      <div className="border-t border-white/8 px-4 py-4 text-sm leading-7 text-[var(--text-secondary)]">{faq.a}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="section-shell">
          <div className="vp-card relative overflow-hidden px-6 py-8 text-center md:px-10 md:py-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.28),transparent_60%)]" />
            <div className="relative z-10">
              <h2 className="text-3xl font-black text-[var(--text-primary)] md:text-4xl">Comece a prever agora</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--text-secondary)] md:text-base">
                Abra sua conta, conecte sua carteira e participe dos mercados mais relevantes da América Latina.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <button onClick={() => navigate('/dashboard')} className="vp-btn-primary inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-semibold">
                  <CalendarClock className="h-4 w-4" />
                  Explorar mercados
                </button>
                <button onClick={() => handleOpenAuthModal('signup')} className="vp-btn-ghost inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-semibold">
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
