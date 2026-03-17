import React, { useMemo, useState } from 'react';
import { Calendar, Flame, Heart, Share2, Users } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { Market } from '../types';

interface MarketCardProps {
  market: Market;
  isBrandTheme: boolean;
  isFavorited: boolean;
  onSelect: (market: Market) => void;
  onToggleFavorite: (marketId: string) => void;
  onShare: (market: Market) => void;
}

type SparklinePoint = {
  dayLabel: string;
  dayAgo: number;
  simProbability: number;
};

const categoryStyles: Record<string, { badge: string; dot: string }> = {
  cripto: {
    badge: 'bg-[rgba(249,115,22,0.16)] text-[#fdba74] border-[rgba(249,115,22,0.35)]',
    dot: 'bg-[#f97316]',
  },
  política: {
    badge: 'bg-[rgba(59,130,246,0.16)] text-[#93c5fd] border-[rgba(59,130,246,0.35)]',
    dot: 'bg-[#3b82f6]',
  },
  economia: {
    badge: 'bg-[rgba(16,185,129,0.16)] text-[#6ee7b7] border-[rgba(16,185,129,0.35)]',
    dot: 'bg-[#10b981]',
  },
  esportes: {
    badge: 'bg-[rgba(239,68,68,0.16)] text-[#fca5a5] border-[rgba(239,68,68,0.35)]',
    dot: 'bg-[#ef4444]',
  },
};

const formatCompactCurrency = (amount: number) => {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}k`;
  return `$${amount.toFixed(0)}`;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getSparklineData = (market: Market): SparklinePoint[] => {
  const seed = market.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return Array.from({ length: 7 }).map((_, index) => {
    const dayAgo = 6 - index;
    const wave = Math.sin((seed + index) * 0.9) * 2.1 + Math.cos((seed + index) * 0.46) * 1.4;
    const trend = ((index - 3) * (market.simProbability - 50)) / 42;
    const simProbability = clamp(market.simProbability + wave + trend, 8, 92);

    return {
      dayLabel: `${dayAgo}d`,
      dayAgo,
      simProbability: Number(simProbability.toFixed(1)),
    };
  });
};

export const MarketCard: React.FC<MarketCardProps> = ({
  market,
  isBrandTheme: _isBrandTheme,
  isFavorited,
  onSelect,
  onToggleFavorite,
  onShare,
}) => {
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);
  const category = market.category.toLowerCase();
  const categoryStyle = categoryStyles[category] ?? {
    badge: 'bg-[rgba(124,58,237,0.16)] text-[#c4b5fd] border-[rgba(124,58,237,0.35)]',
    dot: 'bg-[var(--accent-primary)]',
  };

  const isActive = market.status === 'active' && new Date(market.endDate) > new Date();
  const trending = market.totalVolume >= 120_000 || market.totalBettors >= 450;

  const sparklineData = useMemo(() => getSparklineData(market), [market]);
  const trendDelta = sparklineData[sparklineData.length - 1].simProbability - sparklineData[0].simProbability;
  const sparkColor = trendDelta > 1 ? '#10B981' : trendDelta < -1 ? '#EF4444' : '#94A3B8';
  const handleTogglePreview = () => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 1024) return;
    setShowPreview((prev) => !prev);
  };

  const goToMarketWithSide = (side: 'yes' | 'no') => {
    navigate(`/market/${market.id}?side=${side}`);
  };

  return (
    <article className="market-card vp-card vp-card-hover overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-[999px] border px-2.5 py-1 text-xs font-semibold ${categoryStyle.badge}`}>
            {market.category}
          </span>
          {trending && (
            <span className="inline-flex items-center gap-1 rounded-[999px] border border-[rgba(245,158,11,0.38)] bg-[rgba(245,158,11,0.14)] px-2 py-1 text-[11px] font-semibold text-[#fcd34d]">
              <Flame className="h-3 w-3" /> Trending
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${isActive ? 'text-[#34d399]' : 'text-[var(--text-secondary)]'}`}>
            <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-[#10b981]' : 'bg-[var(--text-muted)]'}`} />
            {isActive ? 'Ativo' : 'Finalizado'}
          </span>
          <button
            onClick={() => onToggleFavorite(market.id)}
            className={`rounded-[8px] p-1.5 transition-colors ${isFavorited ? 'bg-[rgba(239,68,68,0.2)] text-[#fca5a5]' : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]'}`}
            aria-label="Favoritar mercado"
          >
            <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 lg:cursor-default cursor-pointer" onClick={handleTogglePreview}>
        <h3 className="line-clamp-2 text-[17px] font-semibold text-[var(--text-primary)]">{market.title}</h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--border)] pb-3 text-xs text-[var(--text-secondary)]">
          <span className="mono-value">Vol {formatCompactCurrency(market.totalVolume)}</span>
          <span className="mono-value">{market.totalBettors} users</span>
          <span className="mono-value">Fav {market.simProbability >= market.naoProbability ? 'SIM' : 'NÃO'}</span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${categoryStyle.dot} ${market.simProbability >= 50 ? 'opacity-100' : 'opacity-80'}`} />
                <span className="font-semibold text-[#6ee7b7]">SIM</span>
                <span className="mono-value text-[var(--text-secondary)]">{market.simProbability.toFixed(0)}%</span>
              </div>
              <span className="mono-value font-bold text-[#fbbf24]">{market.simOdds.toFixed(2)}x</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#34d399] transition-all"
                style={{ width: `${Math.max(4, market.simProbability)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                <span className="font-semibold text-[#fda4af]">NÃO</span>
                <span className="mono-value text-[var(--text-secondary)]">{market.naoProbability.toFixed(0)}%</span>
              </div>
              <span className="mono-value font-bold text-[#fbbf24]">{market.naoOdds.toFixed(2)}x</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ef4444] to-[#fb7185] transition-all"
                style={{ width: `${Math.max(4, market.naoProbability)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="h-10 w-full rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-1 py-0.5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
              <Tooltip
                cursor={false}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as SparklinePoint;

                  return (
                    <div className="rounded-[8px] border border-[var(--border)] bg-[var(--brand-800)] px-2 py-1 text-[11px] text-[var(--text-primary)] shadow-lg">
                      há {point.dayAgo} dias: <span className="mono-value">{point.simProbability.toFixed(1)}%</span>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="simProbability"
                stroke={sparkColor}
                strokeWidth={1.8}
                dot={false}
                isAnimationActive
                animationDuration={700}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {showPreview && (
          <div
            className="grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => goToMarketWithSide('yes')}
              className="rounded-lg border border-green-500/30 bg-green-500/20 py-2 text-sm font-medium text-green-400"
            >
              SIM {market.simOdds.toFixed(2)}x
            </button>
            <button
              onClick={() => goToMarketWithSide('no')}
              className="rounded-lg border border-red-500/30 bg-red-500/20 py-2 text-sm font-medium text-red-400"
            >
              NÃO {market.naoOdds.toFixed(2)}x
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Calendar className="h-4 w-4" />
          Termina {new Date(market.endDate).toLocaleDateString('pt-BR')}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onShare(market)}
            className="rounded-[8px] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]"
            aria-label="Compartilhar mercado"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onSelect(market)}
            className="inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[rgba(124,58,237,0.2)]"
          >
            <Users className="h-3.5 w-3.5" /> Ver
          </button>
        </div>
      </div>
    </article>
  );
};
