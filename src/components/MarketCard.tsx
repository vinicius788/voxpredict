import React from 'react';
import { ArrowRight, Calendar, Clock3, Heart, Share2, TrendingUp, Users } from 'lucide-react';
import { Market } from '../types';
import { CategoryBadge, ProgressBar, TrendingBadge } from './ui/VoxPrimitives';

interface MarketCardProps {
  market: Market;
  isBrandTheme: boolean;
  isFavorited: boolean;
  onSelect: (market: Market) => void;
  onToggleFavorite: (marketId: string) => void;
  onShare: (market: Market) => void;
}

const formatCompactCurrency = (amount: number) => {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}k`;
  return `$${amount.toFixed(0)}`;
};

const formatDaysLeft = (endDate: string) => {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'encerrado';
  return `${Math.floor(diff / (1000 * 60 * 60 * 24))}d restantes`;
};

export const MarketCard: React.FC<MarketCardProps> = ({
  market,
  isFavorited,
  onSelect,
  onToggleFavorite,
  onShare,
}) => {
  const isActive = market.status === 'active' && new Date(market.endDate) > new Date();
  const isTrending = market.totalVolume >= 120_000 || market.totalBettors >= 450;

  return (
    <article
      className="market-card rounded-[10px] border border-[var(--border-faint)] bg-[var(--bg-card)] p-[14px] shadow-[0_4px_18px_rgba(0,0,0,0.28)] transition-[border-color,background-color] duration-150 hover:border-[var(--border-default)] hover:bg-[var(--bg-card-hover)] cursor-pointer"
      onClick={() => onSelect(market)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(market);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Ver mercado: ${market.title}`}
    >
      <div className="card-header flex items-center justify-between gap-3 mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryBadge category={market.category} />
          {isTrending ? <TrendingBadge /> : null}
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-[var(--yes)]' : 'bg-[var(--text-tertiary)]'}`} />
            {isActive ? 'Ativo' : 'Encerrado'}
          </span>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(market.id);
            }}
            className={`card-action-btn rounded-[6px] border p-1.5 transition-colors ${
              isFavorited
                ? 'border-[var(--border-default)] bg-[rgba(255,255,255,0.05)] text-[var(--text-primary)]'
                : 'border-[var(--border-faint)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]'
            }`}
            aria-label="Favoritar mercado"
            type="button"
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorited ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      <h3 className="card-title line-clamp-2 text-[14px] font-semibold leading-[1.3] text-[var(--text-primary)]">
        {market.title}
      </h3>

      <div className="card-meta mt-2 flex flex-wrap items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
        <TrendingUp className="h-3 w-3" />
        <span className="mono-value">{formatCompactCurrency(market.totalVolume)}</span>
        <span className="text-[var(--text-tertiary)]">·</span>
        <Users className="h-3 w-3" />
        <span className="mono-value">{market.totalBettors} users</span>
        <span className="text-[var(--text-tertiary)]">·</span>
        <Calendar className="h-3 w-3" />
        <span className="mono-value">{new Date(market.endDate).toLocaleDateString('pt-BR')}</span>
      </div>

      <div className="card-divider my-2.5 h-px bg-[var(--border-faint)]" />

      <div className="space-y-1.5">
        <div className="odds-row grid grid-cols-[36px_1fr_36px_48px] items-center gap-1.5">
          <span className="odds-label mono-value text-[11px] font-bold tracking-[0.02em] text-[var(--green-primary)]">SIM</span>
          <ProgressBar value={market.simProbability} color="green" height={3} />
          <span className="odds-pct mono-value text-[11px] text-[var(--text-secondary)]">{market.simProbability.toFixed(0)}%</span>
          <span className="odds-mult mono-value text-right text-[12px] font-semibold text-[var(--gold)]">{market.simOdds.toFixed(2)}x</span>
        </div>
        <div className="odds-row grid grid-cols-[36px_1fr_36px_48px] items-center gap-1.5">
          <span className="odds-label mono-value text-[11px] font-bold tracking-[0.02em] text-[var(--red-primary)]">NÃO</span>
          <ProgressBar value={market.naoProbability} color="red" height={3} />
          <span className="odds-pct mono-value text-[11px] text-[var(--text-secondary)]">{market.naoProbability.toFixed(0)}%</span>
          <span className="odds-mult mono-value text-right text-[12px] font-semibold text-[var(--gold)]">{market.naoOdds.toFixed(2)}x</span>
        </div>
      </div>

      <div className="card-footer mt-2.5 flex items-center justify-between gap-3 border-t border-[var(--border-faint)] pt-2.5">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--action)]">
          Ver mercado
          <ArrowRight className="h-3.5 w-3.5" />
        </span>

        <div className="flex items-center gap-2.5">
          <button
            onClick={(event) => {
              event.stopPropagation();
              void onShare(market);
            }}
            className={`rounded-[6px] border p-1.5 transition-colors ${
              'card-action-btn border-[var(--border-faint)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]'
            }`}
            aria-label="Compartilhar mercado"
            type="button"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <span className="countdown inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
            <Clock3 className="h-3 w-3" />
            <span className="mono-value">{formatDaysLeft(market.endDate)}</span>
          </span>
        </div>
      </div>
    </article>
  );
};
